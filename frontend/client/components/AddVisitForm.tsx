/* eslint-disable react/prop-types */
import { useState, useRef } from "react";
import {
  Upload, Camera, Calendar, CheckCircle
} from "lucide-react";
import { Button }        from "./ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Progress }      from "./ui/progress";
import { cn }            from "@/lib/utils";
import { apiClient }     from "@/lib/api";

/* ------------------------------------------------------------------ */
/* constants                                                          */
type ViewId = "up" | "down" | "left" | "right" | "centre";
const VIEW_PRESET: { id:ViewId; label:string }[] = [
  { id:"up",     label:"Upper (occlusal)"  },
  { id:"down",   label:"Lower (occlusal)"  },
  { id:"left",   label:"Left buccal"       },
  { id:"centre", label:"Frontal / centre"  },
  { id:"right",  label:"Right buccal"      },
];

interface Props {
  patientId  : string;
  patientName: string;
  onSave     : (visitId:string)=>void;     // <- parent will open Workspace
  onCancel   : ()=>void;
}

/* ------------------------------------------------------------------ */
export default function AddVisitForm(props:Props) {
  const { patientId, patientName, onSave, onCancel } = props;

  /* state for each of the five tiles */
  const [tiles, setTiles] = useState(
    VIEW_PRESET.map(v=>({ ...v, file:null as File|null, uploaded:false }))
  );
  const [step , setStep ] = useState<"select"|"uploading"|"analysing">("select");
  const [visitId, setVisitId] = useState<string|null>(null);
  const inputs = useRef<Record<ViewId,HTMLInputElement|null>>({} as any);

  /* helpers --------------------------------------------------------- */
  const createVisit = async () => {
    const { data } = await apiClient.request<{id:string}>(
      `/visits/${patientId}/visits`,
      { method:"POST" }
    );
    setVisitId(data.id);
    return data.id;
  };

  const uploadOne = async (vid:string, view:ViewId, file:File) => {
    const fd = new FormData();
    fd.append("file", file, file.name);
    return apiClient.request(
      `/visits/images/${vid}?view=${view}`,
      { method:"POST", body:fd }
    );
  };

  const runAnalysis = (vid:string) =>
    apiClient.request(`/visits/${vid}/analyze`, { method:"POST" });

  /* ---------------------------------------------------------------- */
  const handleFilePick = (view:ViewId, file:File) =>
    setTiles(t =>
      t.map(v=> v.id===view ? {...v, file} : v)
    );

  const startUpload = async () => {
    const vid = visitId ?? await createVisit();
    setStep("uploading");

    /* sequential upload keeps demo simple – change to Promise.all for speed */
    for (const v of tiles) {
      if (!v.file) continue;
      await uploadOne(vid, v.id, v.file);
      setTiles(t=>t.map(x=>x.id===v.id? {...x, uploaded:true}:x));
    }

    setStep("analysing");
    await runAnalysis(vid);                // build mosaic & PAR on backend
    onSave(vid);                           // <-- hand control back to parent
  };

  /* ---------------------------------------------------------------- */
  if (step==="analysing")
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 border-4 border-blue-200
                            border-t-navyblue-600 rounded-full animate-spin
                            mx-auto mb-4"/>
            <CardTitle>AI analysis in progress …</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-1 text-gray-600">
            <p>Detecting PAR components</p>
            <p>Building mosaic</p>
            <p>Calculating scores</p>
          </CardContent>
        </Card>
      </div>
    );

  /* ---------------------------------------------------------------- */
  return (
    <div className="max-w-5xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5"/>
                New Visit – {patientName}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Upload the five standard intra‑oral views
              </p>
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <Calendar className="w-4 h-4"/>
              {new Date().toLocaleDateString()}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* tiles grid ------------------------------------------------ */}
          <div className="grid sm:grid-cols-3 gap-6">
            {tiles.map(v=>(
              <div key={v.id} className="flex flex-col items-center space-y-2">
                <div
                  className={cn(
                    "w-full aspect-square border-2 border-dashed rounded-lg",
                    v.file ? "border-green-300" : "border-gray-300",
                    "flex items-center justify-center relative cursor-pointer"
                  )}
                  onClick={()=>inputs.current[v.id]?.click()}
                >
                  {v.file
                    ? <img src={URL.createObjectURL(v.file)}
                           className="object-cover w-full h-full rounded-lg"/>
                    : <Upload className="w-10 h-10 text-gray-400"/>}
                  {v.uploaded &&
                    <CheckCircle className="absolute top-1 right-1
                                            text-green-600 w-5 h-5"/>}
                  <input
                    ref={el=>inputs.current[v.id]=el}
                    type="file" accept="image/*" hidden
                    onChange={e=>{
                      const f=e.target.files?.[0];
                      if (f) handleFilePick(v.id,f);
                    }}/>
                </div>
                <span className="text-sm text-gray-700">{v.label}</span>
              </div>
            ))}
          </div>

          {/* progress ------------------------------------------------- */}
          {step==="uploading" && (
            <Progress
              value={tiles.filter(t=>t.uploaded).length*20}
              className="h-2"
            />
          )}

          {/* actions -------------------------------------------------- */}
          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1"
              disabled={!tiles.every(t=>t.file)}
              onClick={startUpload}
            >
              <Camera className="w-4 h-4 mr-2"/>
              {step==="uploading" ? "Uploading…" : "Create Visit"}
            </Button>
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
