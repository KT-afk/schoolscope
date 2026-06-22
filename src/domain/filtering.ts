import type { HdbBlock, HdbEstate, School, SchoolFilters, SortMode } from "../types";
import { estateIntersectsCircle, haversineMeters } from "./distance";
import { selectedPhaseRecord } from "./phaseAggregation";
import { ballotingRiskScore, subscriptionRate } from "./registration";

export function findNearbyEstates(school: School, estates: HdbEstate[]) {
  return estates
    .map((estate) => {
      const distanceMeters = haversineMeters(school.latitude, school.longitude, estate.latitude, estate.longitude);
      return {
        estate,
        distanceMeters,
        intersectsOneKm: estateIntersectsCircle(estate, school.latitude, school.longitude)
      };
    })
    .filter((item) => item.intersectsOneKm)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export function findNearbyHdbBlocks(school: School, blocks: HdbBlock[], limit = 24) {
  return blocks
    .map((block) => ({
      block,
      distanceMeters: haversineMeters(school.latitude, school.longitude, block.latitude, block.longitude)
    }))
    .filter((item) => item.distanceMeters <= 1_000)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, limit);
}

export function findNearbySchoolsForEstate(
  estate: HdbEstate,
  schools: School[],
  preferredPhases: string[] = []
) {
  return schools
    .filter((school) => selectedPhaseRecord(school, preferredPhases))
    .map((school) => ({
      school,
      distanceMeters: haversineMeters(school.latitude, school.longitude, estate.latitude, estate.longitude),
      intersectsOneKm: estateIntersectsCircle(estate, school.latitude, school.longitude)
    }))
    .filter((item) => item.intersectsOneKm)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export function filterSchools(schools: School[], estates: HdbEstate[], filters: SchoolFilters): School[] {
  const hdbTown = filters.hdbTown?.trim().toLowerCase();
  const hdbEstateId = filters.hdbEstateId;
  const matchingFilterEstates = hdbEstateId
    ? estates.filter((estate) => estate.id === hdbEstateId)
    : hdbTown
      ? estates.filter((estate) => estate.town.toLowerCase() === hdbTown)
      : [];
  const query = filters.query.trim().toLowerCase();
  const queryMatchingEstates = query
    ? estates.filter((estate) => estate.name.toLowerCase().includes(query) || estate.town.toLowerCase().includes(query))
    : [];

  return schools.filter((school) => {
    const records = filters.phases.length
      ? school.registrationRecords.filter((record) => filters.phases.includes(record.phase))
      : school.registrationRecords;
    const record = selectedPhaseRecord({ ...school, registrationRecords: records }, filters.phases);
    const rate = subscriptionRate(record);
    const matchesSchoolSearch =
      !query ||
      school.name.toLowerCase().includes(query) ||
      school.address.toLowerCase().includes(query);
    const matchesEstateSearch =
      queryMatchingEstates.length > 0 &&
      queryMatchingEstates.some((estate) => estateIntersectsCircle(estate, school.latitude, school.longitude));
    const matchesSearch =
      matchesSchoolSearch ||
      matchesEstateSearch;
    const matchesTown =
      (!hdbTown && !hdbEstateId) ||
      matchingFilterEstates.some((estate) => estateIntersectsCircle(estate, school.latitude, school.longitude));

    return (
      records.length > 0 &&
      (filters.minSubscriptionRate === undefined || (rate !== null && rate >= filters.minSubscriptionRate)) &&
      (filters.maxSubscriptionRate === undefined || (rate !== null && rate <= filters.maxSubscriptionRate)) &&
      (filters.ballotingOnly === undefined || record?.ballotingConducted === filters.ballotingOnly) &&
      (!filters.vacanciesOnly || (record?.vacancies ?? 0) > (record?.applicants ?? 0)) &&
      matchesTown &&
      matchesSearch
    );
  });
}

export function sortSchools(
  schools: School[],
  sortMode: SortMode,
  selectedEstate?: HdbEstate,
  preferredPhases: string[] = []
): School[] {
  return [...schools].sort((a, b) => {
    const aRecord = selectedPhaseRecord(a, preferredPhases);
    const bRecord = selectedPhaseRecord(b, preferredPhases);
    if (sortMode === "distance") {
      const aDistance = selectedEstate
        ? haversineMeters(a.latitude, a.longitude, selectedEstate.latitude, selectedEstate.longitude)
        : Number.POSITIVE_INFINITY;
      const bDistance = selectedEstate
        ? haversineMeters(b.latitude, b.longitude, selectedEstate.latitude, selectedEstate.longitude)
        : Number.POSITIVE_INFINITY;
      return aDistance - bDistance;
    }
    if (sortMode === "subscriptionRate") {
      return (subscriptionRate(bRecord) ?? -1) - (subscriptionRate(aRecord) ?? -1);
    }
    if (sortMode === "vacancies") {
      return (bRecord?.vacancies ?? 0) - (aRecord?.vacancies ?? 0);
    }
    return ballotingRiskScore(bRecord) - ballotingRiskScore(aRecord);
  });
}
