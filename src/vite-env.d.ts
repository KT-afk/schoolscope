/// <reference types="vite/client" />
/// <reference types="google.maps" />

declare module "*.css";

interface Window {
  __primarySchoolMapGoogleMapsReady?: () => void;
}
