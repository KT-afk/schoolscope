import type { HdbEstate, SchoolFilters, SortMode } from "../../types";

type Props = {
  filters: SchoolFilters;
  estates: HdbEstate[];
  phases: string[];
  towns: string[];
  sortMode: SortMode;
  onChange: (filters: SchoolFilters) => void;
  onSortChange: (sortMode: SortMode) => void;
};

export function FilterPanel({ filters, estates, phases, towns, sortMode, onChange, onSortChange }: Props) {
  function togglePhase(phase: string) {
    const next = filters.phases.includes(phase)
      ? filters.phases.filter((item) => item !== phase)
      : [...filters.phases, phase];
    onChange({ ...filters, phases: next });
  }

  function updateHdbArea(value: string) {
    if (!value) {
      onChange({ ...filters, hdbEstateId: undefined, hdbTown: undefined });
      return;
    }
    const [kind, id] = value.split(":", 2);
    onChange({
      ...filters,
      hdbEstateId: kind === "estate" ? id : undefined,
      hdbTown: kind === "town" ? id : undefined
    });
  }

  const hdbAreaValue = filters.hdbEstateId
    ? `estate:${filters.hdbEstateId}`
    : filters.hdbTown
      ? `town:${filters.hdbTown}`
      : "";

  return (
    <section className="panel-section">
      <label className="field">
        <span>Search school or HDB area</span>
        <input
          value={filters.query}
          onChange={(event) => onChange({ ...filters, query: event.target.value })}
          placeholder="e.g. Clementi, Nan Hua"
        />
      </label>

      <div className="field">
        <span>Registration phase</span>
        <div className="chip-row">
          {phases.map((phase) => (
            <button
              key={phase}
              className={filters.phases.includes(phase) ? "chip selected" : "chip"}
              onClick={() => togglePhase(phase)}
            >
              {phase}
            </button>
          ))}
        </div>
      </div>

      <div className="split-fields">
        <label className="field">
          <span>Min rate</span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={filters.minSubscriptionRate ?? ""}
            onChange={(event) =>
              onChange({
                ...filters,
                minSubscriptionRate: event.target.value ? Number(event.target.value) : undefined
              })
            }
          />
        </label>
        <label className="field">
          <span>Max rate</span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={filters.maxSubscriptionRate ?? ""}
            onChange={(event) =>
              onChange({
                ...filters,
                maxSubscriptionRate: event.target.value ? Number(event.target.value) : undefined
              })
            }
          />
        </label>
      </div>

      <label className="field">
        <span>HDB town / area within 1 km</span>
        <select
          value={hdbAreaValue}
          onChange={(event) => updateHdbArea(event.target.value)}
        >
          <option value="">Any town or HDB area</option>
          <optgroup label="Towns">
            {towns.map((town) => (
              <option value={`town:${town}`} key={town}>{town}</option>
            ))}
          </optgroup>
          <optgroup label="HDB areas">
            {estates.map((estate) => (
              <option value={`estate:${estate.id}`} key={estate.id}>
                {estate.name}, {estate.town} ({estate.blockCount ?? 0} blocks)
              </option>
            ))}
          </optgroup>
        </select>
      </label>

      <div className="toggle-row">
        <label>
          <input
            type="checkbox"
            checked={filters.ballotingOnly === true}
            onChange={(event) => onChange({ ...filters, ballotingOnly: event.target.checked ? true : undefined })}
          />
          Balloting conducted
        </label>
        <label>
          <input
            type="checkbox"
            checked={filters.vacanciesOnly}
            onChange={(event) => onChange({ ...filters, vacanciesOnly: event.target.checked })}
          />
          Vacancies available
        </label>
      </div>

      <label className="field">
        <span>Sort list by</span>
        <select value={sortMode} onChange={(event) => onSortChange(event.target.value as SortMode)}>
          <option value="ballotingRisk">Balloting risk</option>
          <option value="subscriptionRate">Subscription rate</option>
          <option value="vacancies">Vacancies</option>
          <option value="distance">Distance from selected estate</option>
        </select>
      </label>
    </section>
  );
}
