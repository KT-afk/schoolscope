export function AboutPanel() {
  return (
    <section className="panel-section">
      <p>
        Data source attribution: MOE official “Vacancies and balloting data: 2025 P1 Registration Exercise” page,
        last updated 29 Apr 2026.
      </p>
      <p>
        HDB area and block proximity uses data.gov.sg official HDB Existing Building GeoJSON and URA Master Plan 2019
        Subzone Boundary GeoJSON, processed into local centroids and area polygons for offline use.
      </p>
      <a
        className="source-link"
        href="https://www.moe.gov.sg/primary/p1-registration/past-vacancies-and-balloting-data"
        target="_blank"
        rel="noreferrer"
      >
        Open MOE source page
      </a>
      <a className="source-link" href="https://www.onemap.gov.sg/" target="_blank" rel="noreferrer">
        Open OneMap
      </a>
      <a className="source-link" href="https://data.gov.sg/" target="_blank" rel="noreferrer">
        Open data.gov.sg
      </a>
      <p className="helper">
        Distances are straight-line estimates from school coordinates to HDB building centroids or subzone polygons.
        Verify addresses and boundaries against official sources before making decisions.
      </p>
    </section>
  );
}
