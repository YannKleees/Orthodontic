// client/lib/paths.ts
const API = import.meta.env.VITE_API_URL ?? "";          // "" in dev (proxy)

export function mosaicUrl(patientId:string, visitId:string, thumb=true){
  const file = thumb ? "mosaic.png" : "mosaic_full.png";
  return `/static/patients/${patientId}/visits/${visitId}/${file}`;
}