import type { HdbEstate, School } from "../../types";
import type { SchoolRepository } from "../../data/schoolRepository";

type Props = {
  repository: SchoolRepository;
  onImport: (schools?: School[], estates?: HdbEstate[]) => void;
  onReset: () => void;
};

export function DataImportPanel({ repository, onImport, onReset }: Props) {
  async function readFile(file: File): Promise<string> {
    return file.text();
  }

  return (
    <section className="panel-section">
      <p className="helper">
        Import JSON generated from MOE vacancy tables and OneMap geocoding/HDB estate data. Imported data is stored in
        this browser for offline use after the first load.
      </p>
      <label className="file-import">
        <span>Import schools JSON</span>
        <input
          type="file"
          accept="application/json,.json"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            onImport(repository.importSchools(await readFile(file)));
          }}
        />
      </label>
      <label className="file-import">
        <span>Import HDB estates JSON</span>
        <input
          type="file"
          accept="application/json,.json"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            onImport(undefined, repository.importEstates(await readFile(file)));
          }}
        />
      </label>
      <button className="secondary-action" onClick={onReset}>Reset to bundled MOE dataset</button>
    </section>
  );
}
