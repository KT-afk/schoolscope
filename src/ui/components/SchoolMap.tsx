import { useEffect, useMemo, useRef, useState } from "react";
import type { HdbEstate, School } from "../../types";
import { selectedPhaseRecord } from "../../domain/phaseAggregation";
import { formatRate, markerRisk } from "../../domain/registration";

type Props = {
  schools: School[];
  selectedSchool?: School;
  selectedEstate?: HdbEstate;
  highlightedSchoolIds?: string[];
  phases: string[];
  onSelectSchool: (school: School) => void;
};

const singaporeCenter = { lat: 1.3521, lng: 103.8198 };
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

let googleMapsPromise: Promise<void> | null = null;

export function SchoolMap({
  schools,
  selectedSchool,
  selectedEstate,
  highlightedSchoolIds = [],
  phases,
  onSelectSchool
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRefs = useRef<Map<string, google.maps.Marker>>(new Map());
  const circleRef = useRef<google.maps.Circle | null>(null);
  const estatePolygonRef = useRef<google.maps.Polygon | null>(null);
  const estateMarkerRef = useRef<google.maps.Marker | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const previousSelectedSchoolIdRef = useRef<string | undefined>(undefined);
  const onSelectSchoolRef = useRef(onSelectSchool);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const selectedPosition = useMemo(
    () => selectedSchool && { lat: selectedSchool.latitude, lng: selectedSchool.longitude },
    [selectedSchool]
  );

  const selectedEstatePosition = useMemo(
    () => selectedEstate && { lat: selectedEstate.latitude, lng: selectedEstate.longitude },
    [selectedEstate]
  );
  const highlightedSchoolSet = useMemo(() => new Set(highlightedSchoolIds), [highlightedSchoolIds]);
  const hasHighlightedSchools = highlightedSchoolIds.length > 0;

  useEffect(() => {
    onSelectSchoolRef.current = onSelectSchool;
  }, [onSelectSchool]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!googleMapsApiKey) {
      setMapError("Add VITE_GOOGLE_MAPS_API_KEY to .env to load Google Maps.");
      return;
    }

    loadGoogleMaps(googleMapsApiKey)
      .then(() => {
        if (!containerRef.current) return;
        mapRef.current = new google.maps.Map(containerRef.current, {
          center: singaporeCenter,
          zoom: 12,
          disableDefaultUI: true,
          zoomControl: true,
          fullscreenControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          styles: googleMapStyle
        });
        infoWindowRef.current = new google.maps.InfoWindow();
        setMapReady(true);
      })
      .catch(() => {
        setMapError("Google Maps could not be loaded. Check the API key, billing, and Maps JavaScript API access.");
      });
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    markerRefs.current.forEach((marker) => marker.setMap(null));
    markerRefs.current.clear();

    schools.forEach((school) => {
      const aggregateRecord = selectedPhaseRecord(school, phases);
      const isHighlighted = !hasHighlightedSchools || highlightedSchoolSet.has(school.id);
      const color = isHighlighted ? riskColor(markerRisk(aggregateRecord)) : "#aeb8b2";
      const marker = new google.maps.Marker({
        map,
        position: { lat: school.latitude, lng: school.longitude },
        title: school.name,
        icon: markerIcon(color, false, !isHighlighted),
        label: {
          text: school.name.slice(0, 1),
          color: isHighlighted ? "#ffffff" : "#f8faf9",
          fontSize: "12px",
          fontWeight: "800"
        },
        zIndex: isHighlighted ? 12 : 4
      });
      marker.addListener("click", () => {
        onSelectSchoolRef.current(school);
        infoWindowRef.current?.setContent(infoWindowHtml(school, aggregateRecord));
        infoWindowRef.current?.open({ map, anchor: marker });
      });
      markerRefs.current.set(school.id, marker);
    });
    previousSelectedSchoolIdRef.current = undefined;
  }, [schools, phases, highlightedSchoolSet, hasHighlightedSchools, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const previousSelectedId = previousSelectedSchoolIdRef.current;
    if (previousSelectedId && previousSelectedId !== selectedSchool?.id) {
      const previousSchool = schools.find((school) => school.id === previousSelectedId);
      const previousMarker = markerRefs.current.get(previousSelectedId);
      if (previousSchool && previousMarker) {
        const previousRecord = selectedPhaseRecord(previousSchool, phases);
        const isHighlighted = !hasHighlightedSchools || highlightedSchoolSet.has(previousSchool.id);
        previousMarker.setIcon(markerIcon(isHighlighted ? riskColor(markerRisk(previousRecord)) : "#aeb8b2", false, !isHighlighted));
        previousMarker.setLabel({
          text: previousSchool.name.slice(0, 1),
          color: isHighlighted ? "#ffffff" : "#f8faf9",
          fontSize: "12px",
          fontWeight: "800"
        });
        previousMarker.setZIndex(isHighlighted ? 12 : 4);
      }
    }

    if (!selectedPosition || !selectedSchool) {
      circleRef.current?.setMap(null);
      circleRef.current = null;
      infoWindowRef.current?.close();
      previousSelectedSchoolIdRef.current = undefined;
      return;
    }

    estatePolygonRef.current?.setMap(null);
    estatePolygonRef.current = null;
    estateMarkerRef.current?.setMap(null);
    estateMarkerRef.current = null;

    const selectedMarker = selectedSchool ? markerRefs.current.get(selectedSchool.id) : undefined;
    if (selectedMarker && selectedSchool) {
      const selectedRecord = selectedPhaseRecord(selectedSchool, phases);
      selectedMarker.setIcon(markerIcon(riskColor(markerRisk(selectedRecord)), true));
      selectedMarker.setLabel({
        text: selectedSchool.name.slice(0, 1),
        color: "#ffffff",
        fontSize: "15px",
        fontWeight: "800"
      });
      selectedMarker.setZIndex(20);
      infoWindowRef.current?.setContent(infoWindowHtml(selectedSchool, selectedRecord));
      infoWindowRef.current?.open({ map, anchor: selectedMarker });
    }
    previousSelectedSchoolIdRef.current = selectedSchool?.id;

    circleRef.current?.setMap(null);
    circleRef.current = new google.maps.Circle({
      map,
      center: selectedPosition,
      radius: 1_000,
      strokeColor: "#126f96",
      strokeOpacity: 0.95,
      strokeWeight: 2,
      fillColor: "#4bb3fd",
      fillOpacity: 0.14
    });

    map.panTo(selectedPosition);
    if ((map.getZoom() ?? 0) < 14) map.setZoom(14);
  }, [selectedPosition, selectedSchool, schools, phases, highlightedSchoolSet, hasHighlightedSchools, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    estatePolygonRef.current?.setMap(null);
    estatePolygonRef.current = null;
    estateMarkerRef.current?.setMap(null);
    estateMarkerRef.current = null;

    if (!selectedEstate || !selectedEstatePosition) return;

    circleRef.current?.setMap(null);
    circleRef.current = null;
    infoWindowRef.current?.close();

    if (selectedEstate.polygon?.length) {
      estatePolygonRef.current = new google.maps.Polygon({
        map,
        paths: selectedEstate.polygon.map((point) => ({ lat: point.latitude, lng: point.longitude })),
        strokeColor: "#146c94",
        strokeOpacity: 0.95,
        strokeWeight: 2,
        fillColor: "#4bb3fd",
        fillOpacity: 0.16
      });
    }

    estateMarkerRef.current = new google.maps.Marker({
      map,
      position: selectedEstatePosition,
      title: selectedEstate.name,
      icon: estateMarkerIcon(),
      label: {
        text: "H",
        color: "#ffffff",
        fontSize: "12px",
        fontWeight: "900"
      },
      zIndex: 25
    });
    infoWindowRef.current?.setContent(estateInfoWindowHtml(selectedEstate));
    infoWindowRef.current?.open({ map, anchor: estateMarkerRef.current });
    map.panTo(selectedEstatePosition);
    if ((map.getZoom() ?? 0) < 14) map.setZoom(14);
  }, [selectedEstate, selectedEstatePosition, mapReady]);

  return (
    <>
      <div id="school-map" ref={containerRef}>
        {mapError && (
          <div className="map-error">
            <strong>Google Maps setup needed</strong>
            <span>{mapError}</span>
          </div>
        )}
      </div>
      <div className="map-legend" aria-label="Marker legend">
        <span><i className="dot green" /> Undersubscribed</span>
        <span><i className="dot yellow" /> Near full</span>
        <span><i className="dot red" /> Balloting risk</span>
      </div>
      <div className="map-data-note">
        {selectedEstate && hasHighlightedSchools
          ? `${highlightedSchoolIds.length} school catchments intersect ${selectedEstate.name}. Muted markers are outside this HDB area match.`
          : `Showing ${schools.length} MOE 2025 schools. Marker colours follow the selected phase filter.`}
      </div>
    </>
  );
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const callbackName = "__primarySchoolMapGoogleMapsReady";
    window[callbackName] = () => resolve();

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Google Maps script failed"));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

function markerIcon(color: string, selected: boolean, muted = false): google.maps.Symbol {
  return {
    path: "M 0 -18 C -10 -18 -18 -10 -18 0 C -18 12 0 24 0 24 C 0 24 18 12 18 0 C 18 -10 10 -18 0 -18 Z",
    anchor: new google.maps.Point(0, 24),
    labelOrigin: new google.maps.Point(0, 0),
    fillColor: color,
    fillOpacity: muted ? 0.54 : 0.96,
    strokeColor: selected ? "#17211d" : "#ffffff",
    strokeWeight: selected ? 3 : muted ? 1 : 2,
    scale: selected ? 1.25 : muted ? 0.82 : 1
  };
}

function estateMarkerIcon(): google.maps.Symbol {
  return {
    path: "M -16 -16 H 16 V 16 H -16 Z",
    anchor: new google.maps.Point(0, 0),
    labelOrigin: new google.maps.Point(0, 0),
    fillColor: "#146c94",
    fillOpacity: 0.96,
    strokeColor: "#ffffff",
    strokeWeight: 2,
    scale: 0.9
  };
}

function infoWindowHtml(school: School, record = selectedPhaseRecord(school)) {
  return `
    <div style="min-width: 220px; font: 13px system-ui, sans-serif; color: #17211d;">
      <div style="font-weight: 800; font-size: 15px; margin-bottom: 4px;">${escapeHtml(school.name)}</div>
      <div style="color: #607168; margin-bottom: 8px;">${escapeHtml(school.address)}</div>
      <div><strong>${escapeHtml(record?.phase ?? "N/A")}</strong></div>
      <div>Vacancies: ${record?.vacancies ?? "N/A"} · Applicants: ${record?.applicants ?? "N/A"}</div>
      <div>Subscription: ${formatRate(record)}</div>
      <div>Balloting: ${record?.ballotingConducted ? "Conducted" : "Not conducted"}</div>
    </div>
  `;
}

function estateInfoWindowHtml(estate: HdbEstate) {
  return `
    <div style="min-width: 210px; font: 13px system-ui, sans-serif; color: #17211d;">
      <div style="font-weight: 800; font-size: 15px; margin-bottom: 4px;">${escapeHtml(estate.name)}</div>
      <div style="color: #607168; margin-bottom: 8px;">${escapeHtml(estate.town)}</div>
      <div>${estate.blockCount ?? 0} HDB blocks in this area</div>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function riskColor(risk: ReturnType<typeof markerRisk>) {
  if (risk === "oversubscribed") return "#d93f31";
  if (risk === "nearFull") return "#f3b61f";
  return "#2f9e44";
}

const googleMapStyle: google.maps.MapTypeStyle[] = [
  {
    featureType: "poi.business",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "transit",
    stylers: [{ saturation: -30 }, { lightness: 10 }]
  },
  {
    featureType: "water",
    stylers: [{ color: "#b8dbe8" }]
  },
  {
    featureType: "landscape",
    stylers: [{ color: "#eef4ef" }]
  }
];
