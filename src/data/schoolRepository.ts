import type { HdbBlock, HdbEstate, School, SchoolFilters } from "../types";
import { filterSchools } from "../domain/filtering";

const SCHOOLS_KEY = "schoolscope-sg:schools";
const ESTATES_KEY = "schoolscope-sg:estates";
const BLOCKS_KEY = "schoolscope-sg:hdb-blocks";
const SCHOOLS_VERSION_KEY = "schoolscope-sg:schools-version";
const CUSTOM_VERSION = "custom-import";

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Unable to load ${path}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function readStoredJson<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

export class SchoolRepository {
  async getSchools(): Promise<School[]> {
    return readVersionedSchools() ?? fetchJson<School[]>("/data/schools.2025.json");
  }

  async getEstates(): Promise<HdbEstate[]> {
    return readVersionedEstates() ?? fetchJson<HdbEstate[]>("/data/hdb-areas.json");
  }

  async getHdbBlocks(): Promise<HdbBlock[]> {
    return readStoredJson<HdbBlock[]>(BLOCKS_KEY) ?? fetchJson<HdbBlock[]>("/data/hdb-blocks.json");
  }

  async filterSchools(filters: SchoolFilters): Promise<School[]> {
    const [schools, estates] = await Promise.all([this.getSchools(), this.getEstates()]);
    return filterSchools(schools, estates, filters);
  }

  importSchools(json: string): School[] {
    const parsed = JSON.parse(json) as School[];
    validateSchools(parsed);
    localStorage.setItem(SCHOOLS_KEY, JSON.stringify(parsed));
    localStorage.setItem(SCHOOLS_VERSION_KEY, CUSTOM_VERSION);
    return parsed;
  }

  importEstates(json: string): HdbEstate[] {
    const parsed = JSON.parse(json) as HdbEstate[];
    validateEstates(parsed);
    localStorage.setItem(ESTATES_KEY, JSON.stringify(parsed));
    return parsed;
  }

  resetImports(): void {
    localStorage.removeItem(SCHOOLS_KEY);
    localStorage.removeItem(SCHOOLS_VERSION_KEY);
    localStorage.removeItem(ESTATES_KEY);
    localStorage.removeItem(BLOCKS_KEY);
  }
}

function readVersionedSchools(): School[] | null {
  if (localStorage.getItem(SCHOOLS_VERSION_KEY) !== CUSTOM_VERSION) {
    localStorage.removeItem(SCHOOLS_KEY);
    return null;
  }
  const schools = readStoredJson<School[]>(SCHOOLS_KEY);
  if (schools && schools.length < 100) {
    localStorage.removeItem(SCHOOLS_KEY);
    localStorage.removeItem(SCHOOLS_VERSION_KEY);
    return null;
  }
  return schools;
}

function readVersionedEstates(): HdbEstate[] | null {
  const estates = readStoredJson<HdbEstate[]>(ESTATES_KEY);
  if (estates && estates.length < 100) {
    localStorage.removeItem(ESTATES_KEY);
    return null;
  }
  return estates;
}

function validateSchools(schools: School[]): void {
  if (!Array.isArray(schools)) throw new Error("School import must be a JSON array.");
  for (const school of schools) {
    if (!school.id || !school.name || !Number.isFinite(school.latitude) || !Number.isFinite(school.longitude)) {
      throw new Error("Each school must include id, name, latitude, and longitude.");
    }
    if (!Array.isArray(school.registrationRecords)) {
      throw new Error(`${school.name} must include registrationRecords.`);
    }
  }
}

function validateEstates(estates: HdbEstate[]): void {
  if (!Array.isArray(estates)) throw new Error("Estate import must be a JSON array.");
  for (const estate of estates) {
    if (!estate.id || !estate.name || !estate.town || !Number.isFinite(estate.latitude) || !Number.isFinite(estate.longitude)) {
      throw new Error("Each estate must include id, name, town, latitude, and longitude.");
    }
  }
}
