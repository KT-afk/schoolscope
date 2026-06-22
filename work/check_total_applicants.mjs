import { readFileSync } from "node:fs";

const schools = JSON.parse(readFileSync("public/data/schools.2025.json", "utf8"));
const failures = [];

for (const school of schools) {
  const total = school.registrationRecords.find((record) => record.phase === "Total");
  const phaseApplicantSum = school.registrationRecords
    .filter((record) => record.phase !== "Total")
    .reduce((sum, record) => sum + record.applicants, 0);

  if (total && phaseApplicantSum > 0 && total.applicants === 0) {
    failures.push({
      school: school.name,
      expectedAtLeast: phaseApplicantSum,
      actual: total.applicants
    });
  }
}

if (failures.length) {
  console.error(`Found ${failures.length} Total records with zero applicants despite non-total applicants.`);
  console.error(JSON.stringify(failures.slice(0, 10), null, 2));
  process.exit(1);
}

console.log("Total applicant counts are populated when phase applicants exist.");
