import { readFileSync } from "node:fs";

const appSource = readFileSync("src/ui/App.tsx", "utf8");

const hasInlineHighlightArray = /highlightedSchoolIds=\{selectedEstateId\s*\?[\s\S]*?\.map\([\s\S]*?:\s*\[\]\}/.test(appSource);

if (hasInlineHighlightArray) {
  console.error(
    "SchoolMap receives a new highlightedSchoolIds array inline, which can recreate map markers on unrelated renders."
  );
  process.exit(1);
}

console.log("SchoolMap highlightedSchoolIds is not created inline.");
