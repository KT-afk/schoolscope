import type { RegistrationRecord, School } from "../types";

export function selectedPhaseRecord(school: School, preferredPhases: string[] = []): RegistrationRecord | undefined {
  const records = preferredPhases.length
    ? school.registrationRecords.filter((record) => preferredPhases.includes(record.phase))
    : school.registrationRecords.filter((record) => record.phase !== "Total");

  if (records.length === 0) return undefined;
  if (records.length === 1) return records[0];

  const recordsForTotal = records.some((record) => record.phase !== "Total")
    ? records.filter((record) => record.phase !== "Total")
    : records;

  const vacancies = recordsForTotal.reduce((sum, record) => sum + record.vacancies, 0);
  const applicants = recordsForTotal.reduce((sum, record) => sum + record.applicants, 0);
  const ballotingRecords = recordsForTotal.filter((record) => record.ballotingConducted);
  const phaseNames = recordsForTotal.map((record) => record.phase).join(" + ");
  const detailLines = recordsForTotal
    .filter((record) => record.ballotingDetails)
    .map((record) => `${record.phase}: ${record.ballotingDetails}`);
  const distanceCategories = Array.from(
    new Set(recordsForTotal.map((record) => record.distanceCategory).filter(Boolean) as string[])
  );

  return {
    year: Math.max(...recordsForTotal.map((record) => record.year)),
    phase: `${phaseNames} total`,
    vacancies,
    applicants,
    ballotingConducted: ballotingRecords.length > 0,
    ballotingDetails: detailLines.join(" | ") || "Aggregated selected phases.",
    distanceCategory: distanceCategories.length ? distanceCategories.join(" | ") : null
  };
}
