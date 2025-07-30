/* ------------------------------------------------------------------
   POST /api/upload/:patientId   – exactly 5 images
   ------------------------------------------------------------------ */
import { Router }  from "express";
import multer       from "multer";
import { spawn }    from "child_process";
import path         from "path";
import fs           from "fs-extra";
import sharp        from "sharp";
import { v4 as uuid } from "uuid";

import { pJson, load as loadJson, save as saveJson, vDir } from "../utils/fileStore.js";
import { visits as visitsCache } from "./visits.js";

/* ───────────── configuration ──────────────────────────────────── */
const PY_MOSAIC  = path.join(process.cwd(),"../","src","yrcnn","intra_oral_mosaic.py");
const MOSAIC_W   = 1200, MOSAIC_H = 800;
const STATIC_URL = "/static";

export const uploadRouter = Router();
const upload = multer({ dest:"tmp/" });

/* ───────────── helpers ────────────────────────────────────────── */
const VIEW_LIST = ["right","center","left","up","down"];
const toView: Record<string,string> = {
  R:"right", RIGHT:"right",
  L:"left",  LEFT:"left",
  U:"up",    UP:"up", UPPER:"up",
  D:"down",  DOWN:"down", LOWER:"down", B:"down",
  C:"center", CENTRE:"center", F:"center", FRONT:"center",
};

function cleanToken(filename:string){
  return path.parse(filename).name           // drop extension
             .replace(/[\s\-_()]+/g,"")      // "u (1)" → "u1"
             .toUpperCase()                  // case‑insensitive
             .replace(/\d+$/,"");            // drop trailing 1,2,…
}

/* build 3×2 with Sharp ------------------------------------------ */
async function sharpMosaic(srcDir:string, visitId:string, outFull:string, outThumb:string){
  const files = VIEW_LIST.map(v=>path.join(srcDir,`${visitId}_${v}.png`));
  for(const f of files) if(!await fs.pathExists(f)) return;  // guard
  const CELL_W=2048, CELL_H=1200;
  const canvas = sharp({create:{width:CELL_W*3,height:CELL_H*2,channels:3,background:"#ffffff"}});
  for(let i=0;i<5;i++){
    const buf = await sharp(files[i]).resize(CELL_W,CELL_H,{fit:"contain",background:"#000"}).toBuffer();
    await canvas.composite([{input:buf,left:(i%3)*CELL_W,top:i<3?0:CELL_H}]);
  }
  await canvas.png().toFile(outFull);
  await sharp(outFull).resize(MOSAIC_W,MOSAIC_H,{fit:"inside"}).toFile(outThumb);
}

/* ───────────── route ─────────────────────────────────────────── */
uploadRouter.post("/:patientId", upload.array("images",5), async (req,res)=>{
  try{
    const { patientId } = req.params;
    // Generate a unique visit ID if not provided
    const visitId = req.body.visitId || `visit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const visitDir = vDir(patientId, visitId);
    
    // Ensure the directories exist
    await fs.ensureDir(visitDir);
    await fs.ensureDir(path.join(visitDir, 'images'));

    /* 1 – folders ------------------------------------------------ */
    const rawDir   = path.join(visitDir,"raw");
    const wrkDir   = path.join(visitDir,"wrk");
    await fs.ensureDir(rawDir); await fs.ensureDir(wrkDir);

    /* 2 – originals → raw, detect view, copy alias → wrk ---------- */
    const files = req.files as Express.Multer.File[];
    const used=new Set<string>(), leftovers:Express.Multer.File[]=[];
    for(const f of files){
      const rawFile = path.join(rawDir,f.originalname);
      try {
        // Allow overwriting files - change to overwrite:true
        await fs.move(f.path, rawFile, {overwrite:true});
        
        const view = toView[ cleanToken(f.originalname) ];
        if(view && !used.has(view)){
          used.add(view);
          await sharp(rawFile).png().toFile(path.join(wrkDir,`${visitId}_${view}.png`));
        }else{
          leftovers.push(f);
        }
      } catch(e) {
        console.error(`Failed to process file ${f.originalname}:`, e.message);
        // Continue with other files
        leftovers.push(f);
      }
    }
    for(const f of leftovers){
      const view = VIEW_LIST.find(v=>!used.has(v));
      if(!view) break;
      used.add(view);
      await sharp(path.join(rawDir,f.originalname))
            .png()
            .toFile(path.join(wrkDir,`${visitId}_${view}.png`));
    }

    /* 2.b – verify we really have 5 PNGs -------------------------- */
    const missing = VIEW_LIST.filter(v=>!fs.existsSync(path.join(wrkDir,`${visitId}_${v}.png`)));
    if(missing.length){
      await fs.remove(wrkDir);
      return res.status(400).json({
        success:false,
        error:`Could not map the following view(s): ${missing.join(", ")}. ` +
              `Make sure you selected all 5 different intra‑oral photos.`
      });
    }

    /* 3 – build mosaic (Python first) ---------------------------- */
    const mosaicFull  = path.join(visitDir,"mosaic_full.png");
    const mosaicRel   = path.join("patients",patientId,"visits",visitId,"mosaic.png");
    const mosaicThumb = path.join("data",mosaicRel);
    let mosaicOK=false;

    try{
      await new Promise((ok,err)=>{
        const p = spawn("python",[PY_MOSAIC,"--input",wrkDir,"--output",visitDir]);
        p.stderr?.on("data",d=>console.error("[python]",d.toString().trim()));
        p.on("exit",c=>c===0?ok(null):err(new Error("Python returned "+c)));
      });
      await fs.rename(path.join(visitDir,`${visitId}_mosaic.png`), mosaicFull);
      mosaicOK=true;
    }catch(e){
      console.warn("⚠️  Python mosaic failed – falling back to Sharp", e.message);
    }

    if(!mosaicOK){
      await sharpMosaic(wrkDir, visitId, mosaicFull, mosaicThumb);
      mosaicOK=await fs.pathExists(mosaicFull);
    }else{
      await sharp(mosaicFull).resize(MOSAIC_W,MOSAIC_H,{fit:"inside"}).toFile(mosaicThumb);
    }
    await fs.remove(wrkDir);

    if(!mosaicOK)
      return res.status(500).json({success:false,error:"Could not create mosaic"});

    /* 4 – stub boxes & persist ---------------------------------- */
    const boxes: any[] = [];


    const visit = {
      id:visitId, patientId,
      date:new Date().toISOString(),
      status:"completed", parScore:0,
      mosaicUrl:`http://localhost:8000${STATIC_URL}/${mosaicRel.replace(/\\/g,"/")}`,
      boxes,
    };
    await fs.writeJson(path.join(visitDir,"meta.json"),visit,{spaces:2});
    (visitsCache[patientId] ||= []).push(visit);

    const pFile=pJson(patientId);
    const patient=(await loadJson(pFile))??{id:patientId,name:"",visits:[]};
    patient.visits.push({id:visit.id,date:visit.date,status:visit.status,
                         mosaicUrl:visit.mosaicUrl,parScore:0});
    patient.totalVisits     = patient.visits.length;
    patient.lastVisitDate   = visit.date;
    patient.currentPARScore = 0;
    await saveJson(pFile,patient);

    res.status(201).json({success:true,data:visit});
  }catch(e:any){
    console.error("[upload]",e);
    res.status(500).json({success:false,error:String(e)});
  }
});
