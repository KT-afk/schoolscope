import type { HdbEstate } from "../../types";

type Props = {
  estates: HdbEstate[];
  selectedEstateId?: string;
  onSelectEstate: (estateId: string | undefined) => void;
};

export function EstateSearch({ estates, selectedEstateId, onSelectEstate }: Props) {
  return (
    <section className="panel-section">
      <label className="field">
        <span>Selected HDB area / home area</span>
        <select value={selectedEstateId ?? ""} onChange={(event) => onSelectEstate(event.target.value || undefined)}>
          <option value="">No HDB area selected</option>
          {estates.map((estate) => (
            <option key={estate.id} value={estate.id}>
              {estate.name}, {estate.town}
            </option>
          ))}
        </select>
      </label>
      <p className="helper">
        Selecting an HDB area filters schools whose 1 km radius intersects that URA subzone and sorts the list by
        distance from the area's HDB-building centroid.
      </p>
      <div className="estate-grid">
        {estates.map((estate) => (
          <button
            key={estate.id}
            className={selectedEstateId === estate.id ? "estate-card selected" : "estate-card"}
            onClick={() => onSelectEstate(estate.id)}
          >
            <strong>{estate.name}</strong>
            <span>{estate.town} · {estate.blockCount ?? 0} HDB blocks</span>
          </button>
        ))}
      </div>
    </section>
  );
}
