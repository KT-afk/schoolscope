import { readFileSync } from "node:fs";

const appSource = readFileSync("src/ui/App.tsx", "utf8");
const filterPanelSource = readFileSync("src/ui/components/FilterPanel.tsx", "utf8");

const checks = [
  {
    name: "Default phase filter starts on Total",
    pass: /phases:\s*\[\s*"Total"\s*\]/.test(appSource)
  },
  {
    name: "Selecting Total resets specific phase selections",
    pass: /if\s*\(\s*phase\s*===\s*"Total"\s*\)[\s\S]*onChange\(\{\s*\.\.\.filters,\s*phases:\s*\[\s*"Total"\s*\]\s*\}\)/.test(filterPanelSource)
  },
  {
    name: "Selecting a specific phase while Total is selected removes Total",
    pass: /withoutTotal\s*=\s*filters\.phases\.filter\(\s*\(?item\)?\s*=>\s*item\s*!==\s*"Total"\s*\)/.test(filterPanelSource)
  },
  {
    name: "Removing the last specific phase falls back to Total",
    pass: /next\.length\s*\?\s*next\s*:\s*\[\s*"Total"\s*\]/.test(filterPanelSource)
  }
];

const failures = checks.filter((check) => !check.pass);

if (failures.length) {
  console.error("Phase filter behavior checks failed:");
  for (const failure of failures) console.error(`- ${failure.name}`);
  process.exit(1);
}

console.log("Phase filter behavior checks passed.");
