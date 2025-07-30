/* ------------------------------------------------------------------
   DentalImageUpload – now sends ONE request to /api/upload/:patientId
   ------------------------------------------------------------------ */
import { useState, useRef } from "react";
import { Upload, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { cn } from "../lib/utils";
import { apiClient } from "@/lib/api";

// Add Visit type definition or import it from your types/models
type Visit = {
  id: string;
  // Add other properties as needed
};

type ViewId = "up" | "down" | "left" | "right" | "centre";

type View = {
  id: ViewId;
  name: string;
  description: string;
  file?: File;
  progress: number;
};

const VIEW_PRESET: View[] = [
  { id: "up",     name: "Upper Jaw",  description: "Occlusal upper",  progress: 0 },
  { id: "down",   name: "Lower Jaw",  description: "Occlusal lower",  progress: 0 },
  { id: "left",   name: "Left Side",  description: "Left buccal",     progress: 0 },
  { id: "right",  name: "Right Side", description: "Right buccal",    progress: 0 },
  { id: "centre", name: "Front View", description: "Anterior",        progress: 0 },
];

export function DentalImageUpload({
  patientId,
  patientName,
  onAllCompleted,
}: {
  patientId: string;
  patientName: string;
  onAllCompleted: (visitId: string) => void; 
}) {
  const [views, setViews] = useState<View[]>(VIEW_PRESET);
  const fileRefs = useRef<Record<ViewId, HTMLInputElement | null>>({} as any);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false); 
  const [visitId] = useState(() => `${patientId}-visit-${Date.now()}`);
  /* helper: when all 5 files are chosen -> send to backend */
  /* helper: push each view to /api/upload/:jobId/file --------------- */
 async function sendAll() {
   setUploading(true);

  /* ----------------------------------------------------------------
     1) Assemble ONE multipart body with the five images
        (field‑name must be **images** because
        uploadRouter.post('/:patientId', upload.array('images', 5))
        expects that key)
  ----------------------------------------------------------------- */
  const fd = new FormData();
  views.forEach(v => fd.append("images", v.file!, v.file!.name));

  /* 2) Send straight to the correct Express route
        POST /api/upload/<patientId>
        The backend returns the full Visit object.
  ----------------------------------------------------------------- */
  const { data: visit } = await apiClient.request<Visit>(
    `/upload/${patientId}`,
    { method: "POST", body: fd }
  );

  setUploading(false);
  setSubmitted(true); 
  onAllCompleted(visit.id);            // use the ID returned by the API
 }
  /* handle one file selection */
  const onSelect = (vId: ViewId, file: File) => {
    setViews(prev =>
      prev.map(v =>
        v.id === vId ? { ...v, file, progress: 100 } : v,
      ),
    );
  };

  /* watch for completeness */
  const allPicked = views.every(v => v.file);

  if (allPicked && !uploading && !submitted) {
    // fire & forget (component will re‑render but flag prevents loops)
    sendAll().catch(console.error);
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold">
          PAR Analysis – {patientName}
        </h2>
        <p>Upload the five intra‑oral views. AI will analyse them automatically.</p>
      </div>

      {uploading && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-center">
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-green-800 font-medium">
            Upload finished – processing…
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {views.map(view => (
          <Card key={view.id}>
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-lg">{view.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {view.description}
              </p>
            </CardHeader>

            <CardContent>
              {!view.file ? (
                <div
                  className={cn(
                    "border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400",
                    uploading && "opacity-50 pointer-events-none",
                  )}
                  onClick={() => fileRefs.current[view.id]?.click()}
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm">Click to choose image</p>
                  <input
                    ref={el => (fileRefs.current[view.id] = el)}
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) onSelect(view.id, f);
                    }}
                    className="hidden"
                  />
                </div>
              ) : (
                <>
                  <div className="aspect-video rounded overflow-hidden mb-3">
                    <img
                      src={URL.createObjectURL(view.file)}
                      alt=""
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <Progress value={view.progress} className="h-2" />
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
