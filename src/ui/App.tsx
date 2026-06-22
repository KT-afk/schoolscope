import { useEffect, useMemo, useState } from "react";
import type { HdbBlock, HdbEstate, School, SchoolFilters, SortMode } from "../types";
import { SchoolRepository } from "../data/schoolRepository";
import {
  findNearbyEstates,
  findNearbyHdbBlocks,
  findNearbySchoolsForEstate,
  filterSchools,
  sortSchools
} from "../domain/filtering";
import { haversineMeters } from "../domain/distance";
import { selectedPhaseRecord } from "../domain/phaseAggregation";
import { AboutPanel } from "./components/AboutPanel";
import { DataImportPanel } from "./components/DataImportPanel";
import { EstateDetail } from "./components/EstateDetail";
import { EstateSearch } from "./components/EstateSearch";
import { FilterPanel } from "./components/FilterPanel";
import { OverviewPanel } from "./components/OverviewPanel";
import { SchoolDetail } from "./components/SchoolDetail";
import { SchoolList } from "./components/SchoolList";
import { SchoolMap } from "./components/SchoolMap";

const repository = new SchoolRepository();

const defaultFilters: SchoolFilters = {
  phases: ["Phase 2C", "Phase 2C Supplementary"],
  vacanciesOnly: false,
  query: ""
};

export function App() {
  const [schools, setSchools] = useState<School[]>([]);
  const [estates, setEstates] = useState<HdbEstate[]>([]);
  const [hdbBlocks, setHdbBlocks] = useState<HdbBlock[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | undefined>();
  const [selectedEstateId, setSelectedEstateId] = useState<string | undefined>();
  const [filters, setFilters] = useState<SchoolFilters>(defaultFilters);
  const [sortMode, setSortMode] = useState<SortMode>("ballotingRisk");
  const [activePanel, setActivePanel] = useState<"filters" | "estate" | "import" | "about">("filters");
  const [status, setStatus] = useState("Loading local school and estate data...");

  useEffect(() => {
    Promise.all([repository.getSchools(), repository.getEstates(), repository.getHdbBlocks()])
      .then(([loadedSchools, loadedEstates, loadedHdbBlocks]) => {
        setSchools(loadedSchools);
        setEstates(loadedEstates);
        setHdbBlocks(loadedHdbBlocks);
        setStatus("Ready");
      })
      .catch((error: Error) => setStatus(error.message));
  }, []);

  const selectedEstate =
    estates.find((estate) => estate.id === selectedEstateId) ??
    estates.find((estate) => estate.id === filters.hdbEstateId);

  const filteredSchools = useMemo(
    () => filterSchools(schools, estates, filters),
    [schools, estates, filters]
  );

  const sortedSchools = useMemo(
    () => sortSchools(filteredSchools, sortMode, selectedEstate, filters.phases),
    [filteredSchools, sortMode, selectedEstate, filters.phases]
  );

  const selectedSchool = selectedSchoolId ? schools.find((school) => school.id === selectedSchoolId) : undefined;

  const nearbyEstates = useMemo(
    () => (selectedSchool ? findNearbyEstates(selectedSchool, estates) : []),
    [selectedSchool, estates]
  );

  const nearbyHdbBlocks = useMemo(
    () => (selectedSchool ? findNearbyHdbBlocks(selectedSchool, hdbBlocks) : []),
    [selectedSchool, hdbBlocks]
  );

  const nearbySchoolsForEstate = useMemo(
    () => (selectedEstate ? findNearbySchoolsForEstate(selectedEstate, filteredSchools, filters.phases) : []),
    [selectedEstate, filteredSchools, filters.phases]
  );
  const highlightedSchoolIds = useMemo(
    () => (selectedEstateId ? nearbySchoolsForEstate.map(({ school }) => school.id) : []),
    [selectedEstateId, nearbySchoolsForEstate]
  );

  const phases = useMemo(
    () => Array.from(new Set(schools.flatMap((school) => school.registrationRecords.map((record) => record.phase)))).sort(),
    [schools]
  );
  const towns = useMemo(() => Array.from(new Set(estates.map((estate) => estate.town))).sort(), [estates]);

  const selectedEstateDistance = selectedSchool && selectedEstate
    ? haversineMeters(selectedSchool.latitude, selectedSchool.longitude, selectedEstate.latitude, selectedEstate.longitude)
    : undefined;

  function handleImport(nextSchools?: School[], nextEstates?: HdbEstate[]) {
    if (nextSchools) setSchools(nextSchools);
    if (nextEstates) setEstates(nextEstates);
    setStatus("Imported data saved on this device");
  }

  function handleResetImports() {
    repository.resetImports();
    Promise.all([repository.getSchools(), repository.getEstates(), repository.getHdbBlocks()]).then(([loadedSchools, loadedEstates, loadedHdbBlocks]) => {
      setSchools(loadedSchools);
      setEstates(loadedEstates);
      setHdbBlocks(loadedHdbBlocks);
      setSelectedSchoolId(undefined);
      setSelectedEstateId(undefined);
      setStatus("Reset to bundled MOE dataset");
    });
  }

  function handleSelectEstate(estateId: string | undefined) {
    setSelectedEstateId(estateId);
    setSelectedSchoolId(undefined);
    if (estateId) {
      setSortMode("distance");
      setActivePanel("estate");
    }
  }

  function handleSelectSchool(school: School) {
    setSelectedSchoolId(school.id);
    setSelectedEstateId(undefined);
  }

  return (
    <main className="app-shell">
      <section className="map-pane" aria-label="Singapore primary school map">
        <SchoolMap
          schools={sortedSchools}
          selectedSchool={selectedSchool}
          selectedEstate={selectedEstateId ? selectedEstate : undefined}
          highlightedSchoolIds={highlightedSchoolIds}
          phases={filters.phases}
          onSelectSchool={handleSelectSchool}
        />
      </section>

      <aside className="control-pane" aria-label="SchoolScope SG controls">
        <header className="app-header">
          <div>
            <p className="eyebrow">SchoolScope SG</p>
            <h1>Compare P1 demand near HDB estates</h1>
          </div>
          <p className="status">{status}</p>
        </header>

        <div className="warning">
          Past balloting data does not guarantee future admission outcomes. Distances are approximate unless verified
          against official address and boundary data.
        </div>

        <nav className="tabs" aria-label="App sections">
          {[
            ["filters", "Filters"],
            ["estate", "Estate"],
            ["import", "Import"],
            ["about", "About"]
          ].map(([key, label]) => (
            <button
              key={key}
              className={activePanel === key ? "active" : ""}
              onClick={() => setActivePanel(key as typeof activePanel)}
            >
              {label}
            </button>
          ))}
        </nav>

        {activePanel === "filters" && (
          <FilterPanel
            filters={filters}
            estates={estates}
            phases={phases}
            towns={towns}
            sortMode={sortMode}
            onChange={setFilters}
            onSortChange={setSortMode}
          />
        )}
        {activePanel === "estate" && (
          <EstateSearch
            estates={estates}
            selectedEstateId={selectedEstateId}
            onSelectEstate={handleSelectEstate}
          />
        )}
        {activePanel === "import" && (
          <DataImportPanel
            repository={repository}
            onImport={handleImport}
            onReset={handleResetImports}
          />
        )}
        {activePanel === "about" && <AboutPanel />}

        {selectedSchool && (
          <SchoolDetail
            school={selectedSchool}
            record={selectedPhaseRecord(selectedSchool, filters.phases)}
            nearbyEstates={nearbyEstates}
            nearbyHdbBlocks={nearbyHdbBlocks}
            selectedEstateDistance={selectedEstateDistance}
          />
        )}

        {!selectedSchool && selectedEstate && selectedEstateId && (
          <EstateDetail
            estate={selectedEstate}
            nearbySchools={nearbySchoolsForEstate}
            phases={filters.phases}
            onSelectSchool={handleSelectSchool}
            onClear={() => setSelectedEstateId(undefined)}
          />
        )}

        {!selectedSchool && !selectedEstateId && (
          <OverviewPanel
            schoolCount={sortedSchools.length}
            hdbAreaCount={estates.length}
            hdbBlockCount={hdbBlocks.length}
          />
        )}

        <SchoolList
          schools={sortedSchools}
          selectedSchoolId={selectedSchool?.id}
          selectedEstate={selectedEstate}
          phases={filters.phases}
          sortMode={sortMode}
          onSelectSchool={handleSelectSchool}
        />
      </aside>
    </main>
  );
}
