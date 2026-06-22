type Props = {
  schoolCount: number;
  hdbAreaCount: number;
  hdbBlockCount: number;
};

export function OverviewPanel({ schoolCount, hdbAreaCount, hdbBlockCount }: Props) {
  return (
    <section className="detail-drawer" aria-label="Map overview">
      <p className="eyebrow">Start here</p>
      <h2>Choose a school or an HDB area</h2>
      <p className="helper">
        The map is showing {schoolCount} primary schools. Select a school to see its 1 km HDB catchment, or select an
        HDB area to compare nearby schools from a home-search perspective.
      </p>
      <dl className="stats-grid">
        <div><dt>Schools</dt><dd>{schoolCount}</dd></div>
        <div><dt>HDB areas</dt><dd>{hdbAreaCount}</dd></div>
        <div><dt>HDB blocks</dt><dd>{hdbBlockCount}</dd></div>
        <div><dt>Default view</dt><dd>All schools</dd></div>
      </dl>
    </section>
  );
}
