/* routes/par-components.ts  ───────────────────────────────────── */
import { Router, Request, Response } from "express";
import { z } from "zod";

/* ─── in‑memory db  (swap for disk/db later) ──────────────────── */
type DB = { [pid:string]: { [vid:string]: any[] } };
const db: DB = {};

/* ─── helpers ─────────────────────────────────────────────────── */
const compSchema = z.object({
  component  : z.enum([
    "Upper Crowding","Lower Crowding","Upper Spacing","Lower Spacing",
    "Overjet","Overbite","Crossbite","Centerline",
  ]),
  toothRegion: z.string(),
  score      : z.number().min(0),
  maxScore   : z.number().min(1),
  confidence : z.number().min(0).max(100),
  previousScore: z.number().min(0).optional(),
  coordinates: z.object({
    x:z.number(), y:z.number(), width:z.number(), height:z.number(),
  }),
  viewId     : z.string(),
  editable   : z.boolean().default(true),
  modifiedBy : z.string().default("backend"),
});
const patchSchema = compSchema.partial();

/* ─── middleware to fetch / create bucket ─────────────────────── */
function bucket(req:Request) {
  const { patientId, visitId } = req.params;
  db[patientId] ??= {};
  db[patientId][visitId] ??= [];
  return db[patientId][visitId];
}

/* ─── router ──────────────────────────────────────────────────── */
export const router = Router();

/* list ---------------------------------------------------------- */
router.get("/:patientId/:visitId", (req,res)=>{
  res.json({ success:true, data: bucket(req) });
});

/* single -------------------------------------------------------- */
router.get("/:patientId/:visitId/:cid", (req,res)=>{
  const comp = bucket(req).find(c=>c.id === req.params.cid);
  return comp
    ? res.json({success:true,data:comp})
    : res.status(404).json({success:false,error:"Not found"});
});

/* create -------------------------------------------------------- */
router.post("/:patientId/:visitId", (req,res)=>{
  const parse = compSchema.safeParse(req.body);
  if (!parse.success)
    return res.status(400).json({success:false,error:"Invalid data", details:parse.error.errors});

  const comp = { id:`comp-${Date.now()}`, ...parse.data, lastModified:new Date().toISOString() };
  bucket(req).push(comp);
  res.status(201).json({ success:true, data:comp });
});

/* update -------------------------------------------------------- */
router.put("/:patientId/:visitId/:cid", (req,res)=>{
  const parse = patchSchema.safeParse(req.body);
  if (!parse.success)
    return res.status(400).json({success:false,error:"Invalid data", details:parse.error.errors});

  const list = bucket(req);
  const idx  = list.findIndex(c=>c.id === req.params.cid);
  if (idx === -1) return res.status(404).json({success:false,error:"Not found"});

  list[idx] = { ...list[idx], ...parse.data, lastModified:new Date().toISOString() };
  res.json({ success:true, data:list[idx] });
});

/* delete -------------------------------------------------------- */
router.delete("/:patientId/:visitId/:cid", (req,res)=>{
  const list = bucket(req);
  const idx  = list.findIndex(c=>c.id === req.params.cid);
  if (idx === -1) return res.status(404).json({success:false,error:"Not found"});

  const [removed] = list.splice(idx,1);
  res.json({ success:true, data:removed });
});
