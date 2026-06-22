import type { HdbEstate, School } from "../../types";
import { formatDistance } from "../../domain/distance";
import { selectedPhaseRecord } from "../../domain/phaseAggregation";
import { formatRate, markerRisk } from "../../domain/registration";

type NearbySchool = {
  school: School;
  distanceMeters: number;
};

type Props = {
  estate: HdbEstate;
  nearbySchools: NearbySchool[];
  phases: string[];
  onSelectSchool: (school: School) => void;
  onClear: () => void;
};

export function EstateDetail({ estate, nearbySchools, phases, onSelectSchool, onClear }: Props) {
  return (
    <section className="detail-drawer" aria-label="Selected HDB area details">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Selected HDB area</p>
          <h2>{estate.name}</h2>
          <p>{estate.town} · {estate.blockCount ?? 0} HDB blocks</p>
        </div>
        <button className="secondary-action" onClick={onClear}>Clear</button>
      </div>

      <p className="helper">
        These schools are not measured from one estate centre point. They are schools whose 1 km school radius touches
        this HDB area. Use a specific HDB block later for exact home-distance checks.
      </p>

      <div>
        <h3>{nearbySchools.length} matching school catchments</h3>
        {nearbySchools.length ? (
          <ul className="nearby-list actionable-list">
            {nearbySchools.slice(0, 12).map(({ school, distanceMeters }) => {
              const record = selectedPhaseRecord(school, phases);
              return (
                <li key={school.id}>
                  <button onClick={() => onSelectSchool(school)}>
                    <i className={`risk-bar ${markerRisk(record)}`} />
                    <span>
                      <strong>{school.name}</strong>
                      <small>{formatDistance(distanceMeters)} from HDB area centroid · {record?.phase ?? "No phase"}</small>
                    </span>
                    <b>{formatRate(record)}</b>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="helper">No school radius intersects this HDB area with the current phase filters.</p>
        )}
      </div>
    </section>
  );
}
