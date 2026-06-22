import type { MarkerRisk, RegistrationRecord, School } from "../types";

export function subscriptionRate(record?: RegistrationRecord): number | null {
  if (!record || record.vacancies <= 0) return null;
  return record.applicants / record.vacancies;
}

export function formatRate(record?: RegistrationRecord): string {
  const rate = subscriptionRate(record);
  return rate === null ? "N/A" : `${rate.toFixed(2)}x`;
}

export function latestRecord(school: School, preferredPhases: string[] = []): RegistrationRecord | undefined {
  const records = preferredPhases.length
    ? school.registrationRecords.filter((record) => preferredPhases.includes(record.phase))
    : school.registrationRecords;

  return [...records].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return a.phase.localeCompare(b.phase);
  })[0];
}

export function markerRisk(record?: RegistrationRecord): MarkerRisk {
  const rate = subscriptionRate(record);
  if (record?.ballotingConducted || (rate !== null && rate > 1)) return "oversubscribed";
  if (rate !== null && rate >= 0.85) return "nearFull";
  return "undersubscribed";
}

export function ballotingRiskScore(record?: RegistrationRecord): number {
  if (!record) return 0;
  const rate = subscriptionRate(record) ?? 0;
  return (record.ballotingConducted ? 2 : 0) + Math.min(rate, 2);
}
