import type { HdbEstate, School, SortMode } from "../../types";
import { formatDistance, haversineMeters } from "../../domain/distance";
import { selectedPhaseRecord } from "../../domain/phaseAggregation";
import { formatRate, markerRisk } from "../../domain/registration";

type Props = {
  schools: School[];
  selectedSchoolId?: string;
  selectedEstate?: HdbEstate;
  phases: string[];
  sortMode: SortMode;
  onSelectSchool: (school: School) => void;
};

export function SchoolList({ schools, selectedSchoolId, selectedEstate, phases, sortMode, onSelectSchool }: Props) {
  return (
    <section className="school-list" aria-label="Filtered schools">
      <div className="list-header">
        <h2>{schools.length} schools</h2>
        <span>Sorted by {labelForSort(sortMode)}</span>
      </div>
      {schools.map((school) => {
        const record = selectedPhaseRecord(school, phases);
        const distance = selectedEstate
          ? haversineMeters(school.latitude, school.longitude, selectedEstate.latitude, selectedEstate.longitude)
          : undefined;
        return (
          <button
            key={school.id}
            className={selectedSchoolId === school.id ? "school-row selected" : "school-row"}
            onClick={() => onSelectSchool(school)}
          >
            <i className={`risk-bar ${markerRisk(record)}`} />
            <span>
              <strong>{school.name}</strong>
              <small>
                {record?.phase ?? "No phase"}
                {distance !== undefined ? ` · ${formatDistance(distance)}` : ""}
              </small>
            </span>
            <span className="row-metrics">
              <b>{formatRate(record)}</b>
              <small>{record?.vacancies ?? 0} vac.</small>
            </span>
          </button>
        );
      })}
    </section>
  );
}

function labelForSort(sortMode: SortMode) {
  if (sortMode === "distance") return "distance";
  if (sortMode === "subscriptionRate") return "subscription rate";
  if (sortMode === "vacancies") return "vacancies";
  return "balloting risk";
}
