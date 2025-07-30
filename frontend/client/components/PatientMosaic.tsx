import { cn }              from "@/lib/utils";
import { useVisitDetail, useParComponentList  }  from "@/hooks/useApi";
import { mosaicUrl }       from "@/lib/paths";
import { useState as reactUseState } from "react";

export const getMosaicData = (visitId:string)=>({
  title : "Orthodontic PAR Analysis",
  date  : new Date().toISOString().slice(0,10),
  visitId
});

/* small (dashboard) mosaic – requires visitId */
/* ▸ AFTER — scale against the image’s *real* intrinsic size */
// Map component names to Tailwind color classes or your preferred color classes
const colour: Record<string, string> = {
  "Upper Crowding" : "border-red-500 bg-red-500/25",
  "Lower Crowding" : "border-red-500 bg-red-500/25",
  "Upper Spacing"  : "border-blue-500 bg-blue-500/25",
  "Lower Spacing"  : "border-blue-500 bg-blue-500/25",
  Overjet          : "border-orange-500 bg-orange-500/25",
  Overbite         : "border-purple-500 bg-purple-500/25",
  Crossbite        : "border-yellow-500 bg-yellow-500/25",
  Centerline       : "border-green-500 bg-green-500/25",
};

export function PatientMosaic({ visitId, className }: { visitId: string; className?: string }) {
  const { data: visit, loading } = useVisitDetail(visitId);
  const { data: boxes = [], loading: boxesLoading } =
          useParComponentList(visit?.patientId, visit?.id);

    /* we only need the natural pixel size for the <img>, not for scaling */
    const [dim, setDim] = reactUseState({ w: 1200, h: 800 });
  if (loading || boxesLoading || !visit) {
    return <div className={cn("bg-gray-100 animate-pulse rounded-lg", className)} />;
  }
  const A_RATIO = "aspect-[3/2]"; 
  /* grab naturalWidth / naturalHeight once the mosaic has loaded */
  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setDim({
      w: e.currentTarget.naturalWidth,
      h: e.currentTarget.naturalHeight,
    });
  };

  return (
    <div className={cn(
      "relative w-full rounded-lg overflow-hidden bg-gray-50",
      A_RATIO,            // keep the card height predictable
      className
    )}>
      <img
        src={visit.mosaicUrl || mosaicUrl(visit.patientId, visit.id)}
        alt="Mosaic"
        className="absolute inset-0 w-full h-full object-contain"  /* ← was cover */
      />
     {boxes.map(b => (
        <div
          key={b.id}
          className={cn(
            "absolute border-2 rounded-sm overflow-hidden",
            colour[b.component] ?? "border-gray-400 bg-black/10",
          )}
          style={{
            left  : `${(b.coordinates.x      / 600) * 100}%`,
            top   : `${(b.coordinates.y      / 400) * 100}%`,
            width : `${(b.coordinates.width  / 600) * 100}%`,
            height: `${(b.coordinates.height / 400) * 100}%`,

          }}
          title={`${b.component}: ${b.score}/${b.maxScore}`}
        />
      ))}
    </div>
  );
}

// Use React's useState for the local state
function useState(arg0: { w: number; h: number; }): [typeof arg0, React.Dispatch<React.SetStateAction<typeof arg0>>] {
  return reactUseState(arg0);
}