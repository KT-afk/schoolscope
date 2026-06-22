# SchoolScope SG

A responsive React + TypeScript web app for exploring Singapore primary schools, P1 registration demand, balloting risk, and nearby HDB areas/blocks within a 1 km radius.

## Features

- Interactive Singapore map using Google Maps.
- Colour-coded school markers:
  - Green: undersubscribed
  - Yellow: near full
  - Red: oversubscribed or balloting conducted
- School detail drawer with address, registration phase, vacancies, applicants, subscription rate, balloting status, balloting details, and distance category.
- 1 km radius circle around the selected school.
- Nearby HDB area detection using URA subzone polygon intersection.
- Nearby HDB block list using official HDB building centroids.
- Filters for phase, subscription rate, balloting, vacancy availability, HDB town/area, and search text.
- HDB area selection and list sorting by distance, subscription rate, vacancies, or balloting risk.
- Data import screen for replacing bundled sample JSON with locally stored school and estate data.
- About panel with MOE and OneMap attribution.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open the local Vite URL shown in the terminal.

Google Maps requires a browser API key:

```text
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_browser_key
```

The key must have the Maps JavaScript API enabled. Restrict it to your local/dev and production domains in Google Cloud.

This workspace was validated with `pnpm`:

```bash
pnpm install
pnpm run build
```

For a production build:

```bash
npm run build
```

## Data Sources

The app is designed around MOE's official “Vacancies and balloting data: 2025 P1 Registration Exercise” page:

https://www.moe.gov.sg/primary/p1-registration/past-vacancies-and-balloting-data

MOE describes the page as vacancy, applicant, and balloting data for the 2025 P1 Registration Exercise. The referenced page was last updated on 29 Apr 2026.

HDB area/block proximity uses official data.gov.sg geospatial datasets:

- HDB Existing Building, managed by HDB, GEOJSON, last updated 3 Apr 2026.
- Master Plan 2019 Subzone Boundary (No Sea), managed by URA, GEOJSON.

OneMap should still be used where possible for production address geocoding and address verification:

https://www.onemap.gov.sg/

The repository includes `src/data/oneMapClient.ts` for OneMap address geocoding using the public elastic search endpoint.

## Data Assumptions

Bundled files in `public/data` include local JSON generated from official sources:

- `schools.2025.json`
- `hdb-areas.json`
- `hdb-blocks.json`
- `hdb-estates.sample.json` compatibility copy of the HDB areas

Production data should be regenerated from the official MOE table and official data.gov.sg geospatial datasets. Address coordinates should be checked with OneMap where possible.

The app computes:

```text
subscriptionRate = applicants / vacancies
```

If vacancies are `0`, the subscription rate is displayed as `N/A`.

“Nearby” means within a straight-line 1 km radius from the school coordinate. HDB areas use URA subzone polygon-circle checks. HDB blocks use building centroid distance.

## Project Structure

```text
src/data       Repository and import/local persistence
src/domain     Distance, filtering, sorting, and registration logic
src/ui         React app and UI components
public/data    Sample local JSON files
public/sw.js   Basic offline cache for app shell and sample data
```

## Important Warnings

Past balloting data does not guarantee future admission outcomes.

Distance results are approximate unless verified against official addresses and boundary data.

Sample or imported data should always be checked against MOE's official source before relying on it for school choice.
