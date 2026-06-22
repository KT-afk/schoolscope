export type OneMapSearchResult = {
  searchval: string;
  blk_no: string;
  road_name: string;
  building: string;
  address: string;
  postal: string;
  x: string;
  y: string;
  latitude: string;
  longitude: string;
};

type OneMapSearchResponse = {
  found: number;
  totalNumPages: number;
  pageNum: number;
  results: OneMapSearchResult[];
};

export async function geocodeWithOneMap(searchValue: string): Promise<OneMapSearchResult[]> {
  const url = new URL("https://www.onemap.gov.sg/api/common/elastic/search");
  url.searchParams.set("searchVal", searchValue);
  url.searchParams.set("returnGeom", "Y");
  url.searchParams.set("getAddrDetails", "Y");
  url.searchParams.set("pageNum", "1");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OneMap geocoding failed: ${response.status}`);
  }

  const payload = (await response.json()) as OneMapSearchResponse;
  return payload.results;
}
