import { useState } from "react";
import { apiClient } from "@/lib/api";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

interface Props {
  patientId : string;
  visitId   : string;
  initial   : string | undefined;          // current note (may be empty)
  onSaved  ?: (txt: string) => void;       // parent callback
}

/** Light‑weight note pad that PATCHes `doctorReview.doctorNotes` */
export function NotesEditor({ patientId, visitId, initial = "", onSaved }: Props) {
  const [txt, setTxt]   = useState(initial);
  const [busy, setBusy] = useState(false);

  async function save() {
    try {
      setBusy(true);
      await apiClient.updateVisit(patientId, visitId, {
        doctorReview: {
          status      : "reviewed",
          doctorNotes : txt,
          reviewedBy  : "Dr ×",                 // caller may overwrite
          reviewDate  : new Date().toISOString()
        }
      });
      onSaved?.(txt);
    } catch (e) {
      alert("Saving notes failed – see console");
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        rows={5}
        value={txt}
        placeholder="Write clinical notes…"
        onChange={e => setTxt(e.target.value)}
      />
      <Button onClick={save} disabled={busy || txt.trim() === ""}>
        {busy ? "Saving…" : "Save notes"}
      </Button>
    </div>
  );
}
