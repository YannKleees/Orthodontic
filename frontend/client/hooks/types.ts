/* ---------------------------- primitives ------------------------- */
export type VisitStatus =
  | "completed"
  | "upcoming"
  | "cancelled"
  | "analyzing"
  | "reviewed";

/* ---------------------------- PAR box ---------------------------- */
export interface PARBox {
  id         : string;          // unique inside a visit
  component  : string;          // “Upper Crowding” …
  score      : number;          // 0‑…..
  maxScore   : number;          // component‑specific
  coordinates: { x:number; y:number; width:number; height:number };
}

/* ---------------------------- Visit ------------------------------ */
export interface Visit {
  id              : string;
  patientId       : string;
  date            : string;     // ISO yyyy‑mm‑dd
  time?           : string;
  type?           : string;
  status          : VisitStatus;
  doctor?         : string;
  description?    : string;
  treatmentPhase? : string;
  parScoreAtVisit?: number;     // doctor’s manually entered
  mosaicUrl?      : string;     // relative path in /static
  parScore?       : number;     // AI aggregate ( Σ boxes )
  boxes?          : PARBox[];
  nextVisitDate?  : string;
  notes?          : string;
  mosaicWidth? : number;
  mosaicHeight?: number
}

/* ---------------------------- Patient ---------------------------- */
export interface Patient {
  id          : string;
  name        : string;
  dateOfBirth : string;
  age         : number;
  condition?  : string;
  parScore?   : number;       // latest PAR score for sidebar
  currentPARScore?: number;
  treatmentUrgency?: "low" | "medium" | "high" | "emergency";
  createdAt   : string;
  status      : "Active" | "Archived" | "Completed" | "On Hold";
  visits      : Visit[];
}

export interface PARComponent {
  id: string;
  component:
    | "Upper Crowding"
    | "Lower Crowding"
    | "Upper Spacing"
    | "Lower Spacing"
    | "Overjet"
    | "Overbite"
    | "Crossbite"
    | "Centerline";
  toothRegion: string;
  score      : number;
  maxScore   : number;
  confidence : number;
  previousScore?: number;
  coordinates: { x:number; y:number; width:number; height:number };
  viewId     : string;
  editable   : boolean;
  lastModified?: string;
  modifiedBy?  : string;
}

/* ---------------------------- Similar ---------------------------- */
export interface SimilarPatient extends Patient {
  similarity: number;           // %
  outcome   : "excellent" | "good" | "fair";
  treatment : string;
  initialParScore?: number;
  finalParScore?  : number;
}

/* ---------------------------- Report ----------------------------- */
export interface ReportSummary {
  id       : string;
  patientId: string;
  name     : string;
  date     : string;
  type     : string;
  status   : "ready" | "draft" | "pending";
  description?: string;
}
