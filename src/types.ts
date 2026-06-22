export type RegistrationRecord = {
  year: number;
  phase: string;
  vacancies: number;
  applicants: number;
  ballotingConducted: boolean;
  ballotingDetails: string;
  distanceCategory?: string | null;
};

export type School = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  moeSchoolFinderUrl: string;
  registrationRecords: RegistrationRecord[];
};

export type LatLngPoint = {
  latitude: number;
  longitude: number;
};

export type HdbEstate = {
  id: string;
  name: string;
  town: string;
  latitude: number;
  longitude: number;
  polygon?: LatLngPoint[] | null;
  blockCount?: number;
};

export type HdbBlock = {
  id: string;
  block: string;
  name: string;
  area: string;
  town: string;
  townCode?: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
};

export type EstateDistance = {
  estate: HdbEstate;
  distanceMeters: number;
  intersectsOneKm: boolean;
};

export type SchoolFilters = {
  phases: string[];
  minSubscriptionRate?: number;
  maxSubscriptionRate?: number;
  ballotingOnly?: boolean;
  vacanciesOnly: boolean;
  hdbEstateId?: string;
  hdbTown?: string;
  query: string;
};

export type SortMode = "distance" | "subscriptionRate" | "vacancies" | "ballotingRisk";

export type MarkerRisk = "undersubscribed" | "nearFull" | "oversubscribed";
