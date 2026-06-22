import type { EstateDistance, HdbBlock, RegistrationRecord, School } from "../../types";
import { formatDistance } from "../../domain/distance";
import { formatRate } from "../../domain/registration";

type Props = {
  school: School;
  record?: RegistrationRecord;
  nearbyEstates: EstateDistance[];
  nearbyHdbBlocks: { block: HdbBlock; distanceMeters: number }[];
  selectedEstateDistance?: number;
};

export function SchoolDetail({ school, record, nearbyEstates, nearbyHdbBlocks, selectedEstateDistance }: Props) {
  return (
    <section className="detail-drawer" aria-label="Selected school details">
      <div>
        <p className="eyebrow">Selected school</p>
        <h2>{school.name}</h2>
        <p>{school.address}</p>
      </div>

      <dl className="stats-grid">
        <div><dt>Phase</dt><dd>{record?.phase ?? "N/A"}</dd></div>
        <div><dt>Vacancies</dt><dd>{record?.vacancies ?? "N/A"}</dd></div>
        <div><dt>Applicants</dt><dd>{record?.applicants ?? "N/A"}</dd></div>
        <div><dt>Subscription</dt><dd>{formatRate(record)}</dd></div>
        <div><dt>Balloting</dt><dd>{record?.ballotingConducted ? "Conducted" : "Not conducted"}</dd></div>
        <div><dt>Distance band</dt><dd>{record?.distanceCategory ?? "N/A"}</dd></div>
      </dl>

      <p className="detail-note">{record?.ballotingDetails}</p>
      <p className="helper">Distance from selected estate: {formatDistance(selectedEstateDistance)}</p>

      <div>
        <h3>HDB areas intersecting 1 km</h3>
        {nearbyEstates.length ? (
          <ul className="nearby-list">
            {nearbyEstates.map(({ estate, distanceMeters }) => (
              <li key={estate.id}>
                <strong>{estate.name}</strong>
                <span>{estate.town} · {estate.blockCount ?? 0} HDB blocks · {formatDistance(distanceMeters)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="helper">No HDB area intersects this 1 km radius.</p>
        )}
      </div>

      <div>
        <h3>Nearby HDB blocks</h3>
        {nearbyHdbBlocks.length ? (
          <ul className="nearby-list">
            {nearbyHdbBlocks.map(({ block, distanceMeters }) => (
              <li key={block.id}>
                <strong>{block.name}</strong>
                <span>{block.area}, {block.town} · {formatDistance(distanceMeters)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="helper">No HDB building centroid is within 1 km.</p>
        )}
      </div>
    </section>
  );
}
