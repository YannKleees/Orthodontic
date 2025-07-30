/* PatientSidebar.tsx — 2025‑07‑30
   • bug‑fix: PAR filters/sorting now use the score of the **latest visit only**.
   • added: lastParScore() helper; removed allParScores()/latestScore().
   • layout, styling and behaviour otherwise identical to the original.
*/

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  User,
  X,
  SlidersHorizontal,
  ArrowUpAZ,
  ArrowDownAZ,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Visit } from "@/hooks/types";
import "./PatientSidebar.css";

/* ---------- local types ---------------------------------------- */
interface Patient {
  id: string;
  name: string;
  age: number;
  condition?: string;
  visits?: Visit[];

  currentPARScore?: number;           // optional quick‑access
  parScore?: number;                  // optional legacy alias
  treatmentUrgency?: "low" | "medium" | "high" | "emergency";
}

interface PatientSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  availablePatients: Patient[];
  onPatientClick: (id: string, name: string) => void;
  onAddPatient?: () => void;
  selectedPatientId?: string;
}

/* ---------- constants ------------------------------------------ */
const URGENCY = ["low", "medium", "high", "emergency"] as const;
const PAR_COMPONENTS = [
  "Upper Crowding",
  "Lower Crowding",
  "Upper Spacing",
  "Lower Spacing",
  "Overjet",
  "Overbite",
  "Crossbite",
  "Centerline",
] as const;

const SORT_FIELDS = [
  { key: "name", label: "Name" },
  { key: "age", label: "Age" },
  { key: "par", label: "PAR score" },
  { key: "urg", label: "Urgency" },
] as const;

type SortDir = "asc" | "desc";

/* ================================================================= */
export function PatientSidebar({
  expanded,
  onToggle,
  availablePatients,
  onPatientClick,
  onAddPatient,
  selectedPatientId,
}: PatientSidebarProps) {
  /* ---------- UI state ---------------------------------------- */
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [urgSel, setUrgSel] = useState(recordFromArray(URGENCY));
  const [compSel, setCompSel] = useState(recordFromArray(PAR_COMPONENTS));

  const [parMin, setParMin] = useState(0);
  const [parMax, setParMax] = useState(60);

  const [sortField, setSortField] = useState<string>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  /* Close filter drawer with Esc */
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawerOpen) setDrawerOpen(false);
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [drawerOpen]);

  /* ---------- filtering & sorting ----------------------------- */
  const filtered = useMemo(() => {
    let list = [...availablePatients];

    /* free text ------------------------------------------------ */
    if (query.trim()) {
   const tokens = deburr(query).toLowerCase().split(/\s+/);
   list = list.filter(p =>
     matchAll(`${p.name} ${p.condition ?? ""}`, tokens) ||
     matchAll(p.id, tokens) ||
     tokens.every(t => p.age.toString().includes(t))
   );
 }
    /* urgency facet ------------------------------------------- */
    const urgActive = activeKeys(urgSel);
    if (urgActive.length)
      list = list.filter((p) =>
        urgActive.includes(p.treatmentUrgency ?? ""),
      );

    /* PAR score range (latest visit only) ---------------------- */
    if (parMin !== 0 || parMax !== 60) {
      list = list.filter((p) => {
        const s = lastParScore(p);
        return s != null && s >= parMin && s <= parMax;
      });
    }

    /* PAR component facet -------------------------------------- */
    const compActive = activeKeys(compSel).map(lc);
    if (compActive.length) {
      list = list.filter((p) =>
        p.visits?.some((v) =>
          v.boxes?.some((box) => compActive.includes(lc(box.component))),
        ),
      );
    }

    /* sorting -------------------------------------------------- */
    const sign = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortField) {
        case "name":
          return sign * a.name.localeCompare(b.name);
        case "age":
          return sign * (a.age - b.age);
        case "par":
          return sign * ((lastParScore(a) ?? 0) - (lastParScore(b) ?? 0));
        case "urg":
          return sign * (urgRank(a.treatmentUrgency) - urgRank(b.treatmentUrgency));
        default:
          return 0;
      }
    });

    return list;
  }, [
    availablePatients,
    query,
    urgSel,
    compSel,
    parMin,
    parMax,
    sortField,
    sortDir,
  ]);

  /* ---------- chips (active filters) -------------------------- */
  const chips = [
    ...URGENCY.filter((k) => urgSel[k]).map(cap),
    ...PAR_COMPONENTS.filter((c) => compSel[c]),
    ...(parMin !== 0 || parMax !== 60 ? [`${parMin}‑${parMax}`] : []),
  ];
  const untickChip = (lbl: string) => {
    if (URGENCY.map(cap).includes(lbl))
      setUrgSel((s) => ({ ...s, [lbl.toLowerCase()]: false }));
    else if (PAR_COMPONENTS.includes(lbl as any))
      setCompSel((s) => ({ ...s, [lbl]: false }));
    else {
      setParMin(0);
      setParMax(60);
    }
  };

  const openDrawer = () => setDrawerOpen(true);
  const toggleDrawer = () => setDrawerOpen((o) => !o);
  const clearFilters = () => {
    setUrgSel(recordFromArray(URGENCY));
    setCompSel(recordFromArray(PAR_COMPONENTS));
    setParMin(0);
    setParMax(60);
  };

  /* ========================= render =========================== */
  return (
    <>
      {/* small invisible “handle” when sidebar collapsed */}
      {!expanded && (
        <div
          onClick={onToggle}
          className="fixed left-20 top-0 h-full w-2 bg-transparent hover:bg-primary/20 cursor-pointer z-35"
        />
      )}

      {/* main sidebar */}
      <aside
        className={cn(
          "fixed left-20 top-0 h-full bg-white transition-all duration-300 z-40 flex flex-col shadow-lg border-r-2 border-gray-100",
          expanded ? "w-[360px]" : "w-0 overflow-hidden",
        )}
      >
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          {/* --- header (search + chips) ------------------------- */}
          <HeaderRow
            query={query}
            setQuery={setQuery}
            chips={chips}
            onChipClear={untickChip}
            filteredLen={filtered.length}
            onAddPatient={onAddPatient}
            openDrawer={openDrawer}
            toggleDrawer={toggleDrawer}
          />

          {/* --- patient list ----------------------------------- */}
          <PatientList
            patients={filtered}
            selectedId={selectedPatientId}
            onSelect={onPatientClick}
            highlight={(txt) =>
              query
                ? txt
                    .split(new RegExp(`(${escapeRx(query)})`, "gi"))
                    .map((part, i) =>
                      part.toLowerCase() === query.toLowerCase() ? (
                        <span key={i} className="hl">
                          {part}
                        </span>
                      ) : (
                        part
                      ),
                    )
                : txt
            }
          />
        </div>
      </aside>

      {/* draggable filter drawer */}
      <ResizableDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <DrawerContent
          urgSel={urgSel}
          setUrgSel={setUrgSel}
          compSel={compSel}
          setCompSel={setCompSel}
          parMin={parMin}
          parMax={parMax}
          setParMin={setParMin}
          setParMax={setParMax}
          sortField={sortField}
          setSortField={setSortField}
          sortDir={sortDir}
          setSortDir={setSortDir}
          clearFilters={clearFilters}
        />
      </ResizableDrawer>
    </>
  );
}

/* ================================================================= */
/* ----------------- DrawerContent --------------------------------- */
/* ================================================================= */
function DrawerContent(props: {
  urgSel: FacetState;
  setUrgSel: React.Dispatch<React.SetStateAction<FacetState>>;
  compSel: FacetState;
  setCompSel: React.Dispatch<React.SetStateAction<FacetState>>;
  parMin: number;
  parMax: number;
  setParMin: (n: number) => void;
  setParMax: (n: number) => void;
  sortField: string;
  setSortField: (k: string) => void;
  sortDir: SortDir;
  setSortDir: (d: SortDir) => void;
  clearFilters: () => void;
}) {
  const {
    urgSel,
    setUrgSel,
    compSel,
    setCompSel,
    parMin,
    parMax,
    setParMin,
    setParMax,
    sortField,
    setSortField,
    sortDir,
    setSortDir,
    clearFilters,
  } = props;

  return (
    <div className="filter-drawer-inner">
      <h3 className="drawer-title mb-4">Filters &amp; sort</h3>

      {/* --- urgency facet ------------------------------------ */}
      <Facet
        title="Treatment urgency"
        values={URGENCY}
        state={urgSel}
        setState={setUrgSel}
      />

      {/* --- PAR range facet ---------------------------------- */}
      <section className="facet-section par-range">
        <p className="facet-title">PAR score range</p>
        <div className="range-values">
          {parMin} – {parMax}
        </div>
        <div className="range-wrapper">
          <input
            type="range"
            min={0}
            max={60}
            step={1}
            value={parMin}
            onChange={(e) =>
              setParMin(Math.min(+e.target.value, parMax - 1))
            }
          />
          <input
            type="range"
            min={0}
            max={60}
            step={1}
            value={parMax}
            onChange={(e) =>
              setParMax(Math.max(+e.target.value, parMin + 1))
            }
          />
        </div>
      </section>

      {/* --- PAR component facet ------------------------------ */}
      <Facet
        title="PAR component"
        values={PAR_COMPONENTS}
        state={compSel}
        setState={setCompSel}
        scroll
      />

      {/* --- sorting ------------------------------------------ */}
      <section className="mt-6">
        <p className="facet-title">Sort by</p>
        <div className="radio-inputs">
          {SORT_FIELDS.map((f) => (
            <label key={f.key}>
              <input
                type="radio"
                className="radio-input"
                checked={sortField === f.key}
                onChange={() => setSortField(f.key)}
              />
              <span className="radio-tile small">
                <span className="radio-label">{f.label}</span>
              </span>
            </label>
          ))}
        </div>

        <button
          className="sort-dir-btn"
          onClick={() =>
            setSortDir((prev: SortDir) =>
              prev === "asc" ? "desc" : "asc",
            )
          }
          title={sortDir === "asc" ? "ascending" : "descending"}
        >
          {sortDir === "asc" ? (
            <ArrowUpAZ className="w-4 h-4" />
          ) : (
            <ArrowDownAZ className="w-4 h-4" />
          )}
        </button>
      </section>

      <button className="link mt-6" onClick={clearFilters}>
        Clear all filters
      </button>
    </div>
  );
}

/* ================================================================= */
/* ----------------- HeaderRow ------------------------------------- */
/* ================================================================= */
function HeaderRow(props: {
  query: string;
  setQuery: (s: string) => void;
  chips: string[];
  onChipClear: (txt: string) => void;
  filteredLen: number;
  onAddPatient?: () => void;
  openDrawer: () => void;
  toggleDrawer: () => void;
}) {
  const {
    query,
    setQuery,
    chips,
    onChipClear,
    filteredLen,
    onAddPatient,
    openDrawer,
    toggleDrawer,
  } = props;

  return (
    <>
      {/* --- search bar & icons -------------------------------- */}
      <div className="flex items-center gap-4 top-controls">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="relative w-60"
        >
          <input
            id="patient-search"
            type="text"
            required
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={openDrawer}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            className="peer w-full h-12 bg-white border border-[#fffff] rounded-xl px-4 pr-10 text-base outline-none focus:shadow-md"
            placeholder=" "
          />
          <label htmlFor="patient-search" className="floating-label">
            Search patients
          </label>
          {query ? (
            <X className="clear-ico" onClick={() => setQuery("")} />
          ) : (
            <Search className="search-ico" />
          )}
        </form>

        {/* add‑patient icon ------------------------------------ */}
        {onAddPatient && (
          <button
            title="Add patient"
            onClick={onAddPatient}
            className="group cursor-pointer outline-none hover:rotate-90 duration-300 ml-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="50"
              height="50"
              viewBox="0 0 24 24"
              className="stroke-blue-400 fill-none group-hover:fill-white group-active:stroke-blue-200 duration-300"
            >
              <path
                d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10Z"
                strokeWidth="1.5"
              />
              <path d="M8 12h8M12 16V8" strokeWidth="1.5" />
            </svg>
          </button>
        )}

        {/* filter drawer toggle -------------------------------- */}
        <button
          onClick={toggleDrawer}
          className="ml-auto p-2 rounded-full hover:bg-primary/10 transition"
          title="Filters"
        >
          <SlidersHorizontal className="w-5 h-5 text-primary" />
        </button>
      </div>

      {/* active filter chips ------------------------------------ */}
      {(query || chips.length) && (
        <div className="chips-row">
          {query && (
            <Chip text={`“${query}”`} onClear={() => setQuery("")} />
          )}
          {chips.map((c) => (
            <Chip key={c} text={c} onClear={() => onChipClear(c)} />
          ))}
          {filteredLen > 0 && (
            <span className="result-count">{filteredLen} match</span>
          )}
        </div>
      )}
    </>
  );
}
const Chip = ({
  text,
  onClear,
}: {
  text: string;
  onClear: () => void;
}) => (
  <span className="chip">
    {text}
    <X className="w-3 h-3 ml-1 cursor-pointer" onClick={onClear} />
  </span>
);

/* ================================================================= */
/* ----------------- Facet (checkbox list) ------------------------- */
/* ================================================================= */
type FacetState = Record<string, boolean>;
function Facet({
  title,
  values,
  state,
  setState,
  scroll = false,
}: {
  title: string;
  values:
    | readonly string[]
    | readonly { key: string; label: string }[];
  state: FacetState;
  setState: React.Dispatch<React.SetStateAction<FacetState>>;
  scroll?: boolean;
}) {
  const opts = (values as any[]).map((v) =>
    typeof v === "string" ? { key: v, label: v } : v,
  );
  const toggle = (k: string) =>
    setState((s) => ({ ...s, [k]: !s[k] }));

  return (
    <section className="facet-section">
      <p className="facet-title">{title}</p>
      <div className={cn("facet-values", scroll && "scrollable")}>
        {opts.map((o) => (
          <label key={o.key} className="facet-value">
            <input
              type="checkbox"
              className="facet-checkbox"
              checked={!!state[o.key]}
              onChange={() => toggle(o.key)}
            />
            <span className="facet-label">{o.label}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

/* ================================================================= */
/* ----------------- PatientList (uses lastParScore) --------------- */
/* ================================================================= */
function PatientList({
  patients,
  selectedId,
  onSelect,
  highlight,
}: {
  patients: Patient[];
  selectedId?: string;
  onSelect: (id: string, name: string) => void;
  highlight: (s: string) => React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-[40px] shadow-md border border-gray-100">
      <div className="p-2">
        {patients.length ? (
          patients.map((p) => (
            <div
              key={p.id}
              onClick={() => onSelect(p.id, p.name)}
              className={cn(
                "flex items-center h-14 px-3 rounded-lg cursor-pointer transition-colors group",
                selectedId === p.id
                  ? "bg-primary/10 border-l-4 border-primary"
                  : "hover:bg-gray-50",
              )}
            >
              <User
                className={cn(
                  "w-4 h-4 mr-3",
                  selectedId === p.id
                    ? "text-primary"
                    : "text-gray-400 group-hover:text-gray-600",
                )}
              />
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    "text-sm font-medium truncate",
                    selectedId === p.id
                      ? "text-primary"
                      : "text-on-surface",
                  )}
                >
                  {highlight(p.name)}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-gray-500 text-xs truncate">
                    ID:{p.id.split("-")[1]?.substring(0, 6) || p.id} •{" "}
                    {p.age}y
                  </div>
                  <div className="flex items-center gap-1">
                    {!!p.visits?.length && (
                      <span className="badge blue">
                        {p.visits.length}v
                      </span>
                    )}
                    {lastParScore(p) != null && (
                      <span className="badge green">
                        PAR:{lastParScore(p)}
                      </span>
                    )}
                    {p.treatmentUrgency && (
                      <span
                        className={cn(
                          "badge",
                          urgColor(p.treatmentUrgency),
                        )}
                      >
                        {p.treatmentUrgency}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty">No patients match</div>
        )}
      </div>
    </div>
  );
}

/* ================================================================= */
/* ----------------- ResizableDrawer --------------------------------*/
/* ================================================================= */
function ResizableDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<number>(0);
  const width = useRef<number>(320);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!start.current || !ref.current) return;
      const dx = start.current - e.clientX;
      width.current = Math.min(
        500,
        Math.max(240, width.current + dx),
      );
      ref.current!.style.width = `${width.current}px`;
      start.current = e.clientX;
    };
    const up = () => {
      start.current = 0;
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "filter-drawer",
        open ? "translate-x-0" : "translate-x-full",
      )}
      style={{ width: `${width.current}px` }}
    >
      <div
        className="resize-bar"
        onMouseDown={(e) => {
          start.current = e.clientX;
          document.body.style.cursor = "ew-resize";
        }}
        onDoubleClick={onClose}
      />
      {children}
    </div>
  );
}

/* ================================================================= */
/* ----------------- helpers (misc) -------------------------------- */
/* ================================================================= */
function recordFromArray(arr: readonly string[]) {
  return Object.fromEntries(arr.map((k) => [k, false])) as FacetState;
}
const activeKeys = (rec: FacetState) =>
  Object.entries(rec)
    .filter(([, v]) => v)
    .map(([k]) => k);
const lc = (s: string) => s.toLowerCase();
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const escapeRx = (s: string) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const urgRank = (u?: string) =>
  u ? URGENCY.indexOf(u as any) : -1;
const urgColor = (u: string) =>
  u === "high" || u === "emergency"
    ? "red"
    : u === "medium"
    ? "yellow"
    : "gray";

const deburr = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function matchAll(haystack: string, needles: string[]) {
  const h = deburr(haystack.toLowerCase());
  return needles.every(n => h.includes(n));
}

/* ---------- NEW: return the PAR score of the latest visit ------- */
function lastParScore(p: Patient): number | undefined {
  /* If the parent already supplies a scalar, prefer that. */
  if (!p.visits || !p.visits.length) {
    return p.currentPARScore ?? p.parScore;
  }

  /* pick the chronologically latest visit (regardless of status) */
  const visits = p.visits.filter(
    (v): v is Visit => !!v && typeof v.date === "string"
  );
  if (!visits.length) return p.currentPARScore ?? p.parScore;

  const latest = visits.sort(
    (a, b) => Date.parse(b.date) - Date.parse(a.date)
  )[0];

  /* hierarchy: manual score → visit.parScore → Σ boxes fallback */
  if (typeof (latest as any).parScoreAtVisit === "number")
    return (latest as any).parScoreAtVisit;

  if (typeof latest.parScore === "number") return latest.parScore;

  if (latest && Array.isArray(latest.boxes) && latest.boxes.length) {
    return latest.boxes.reduce((s, b) => s + (b.score ?? 0), 0);
  }

  return p.currentPARScore ?? p.parScore;
}
