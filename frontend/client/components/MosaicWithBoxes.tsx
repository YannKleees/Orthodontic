import { useEffect, useRef, useState } from "react";
import type { Visit } from "@/hooks/types";
import { scaleBox }   from "@/lib/geometry";
import { cn }         from "@/lib/utils";
import { mosaicUrl }  from "@/lib/paths";

const colours: Record<string,string> = {
  "Upper Crowding":"border-red-500 bg-red-500/20",
  "Lower Crowding":"border-red-500 bg-red-500/20",
  "Upper Spacing" :"border-blue-500 bg-blue-500/20",
  "Lower Spacing" :"border-blue-500 bg-blue-500/20",
  "Overjet"       :"border-orange-500 bg-orange-500/20",
  "Overbite"      :"border-purple-500 bg-purple-500/20",
  "Crossbite"     :"border-yellow-500 bg-yellow-500/20",
  "Centerline"    :"border-green-500 bg-green-500/20",
};

export function MosaicWithBoxes({ visit }:{ visit:Visit }) {
  const imgRef          = useRef<HTMLImageElement>(null);
  const [size,setSize]  = useState<{w:number;h:number}|null>(null);

  /* keep DOM → state in sync */
  useEffect(() => {
    if (!imgRef.current) return;
    const update = () => {
      setSize({ w: imgRef.current!.clientWidth,
                h: imgRef.current!.clientHeight });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const natW = visit.mosaicWidth  ?? 600;
  const natH = visit.mosaicHeight ?? 400;

  return (
    <div className="relative w-full">
      <img
        ref={imgRef}
        src={visit.mosaicUrl ?? mosaicUrl(visit.patientId, visit.id)}
        alt="Dental mosaic"
        className="w-full h-auto block select-none rounded-lg"
        onLoad={()=>{
          if (imgRef.current)
            setSize({ w: imgRef.current.clientWidth,
                      h: imgRef.current.clientHeight });
        }}
        draggable={false}
      />

      {/* overlay */}
      {size && (visit.boxes ?? []).map(box=>{
        const { left,top,width,height } =
          scaleBox(box.coordinates, {w:natW,h:natH}, size);
        return (
          <div
            key={box.id}
            className={cn("absolute border-2", colours[box.component])}
            style={{ left, top, width, height }}
            title={`${box.component}: ${box.score}/${box.maxScore}`}
          />
        );
      })}
    </div>
  );
}
