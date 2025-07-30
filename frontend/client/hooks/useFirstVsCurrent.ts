/* ------------------------------------------------------------------
   Returns first‑visit vs latest‑visit data + per‑component deltas
   ----------------------------------------------------------------- */
import { useVisits }           from "./useApi";
import { useVisitComparison }  from "./useVisitComparison";

export function useFirstVsCurrent(patientId: string) {
  /* 1 ─ pull the visit list ------------------------------------------------ */
  const { data: visitList } = useVisits(patientId);
  const completed = Array.isArray(visitList)
    ? visitList.filter(v => v.status === "completed")
    : [];

  /* 2 ─ decide which two visits to compare (oldest vs newest) -------------- */
  const sortedCompleted = [...completed].sort(
    (a, b) => Date.parse(a.date) - Date.parse(b.date),
  );

  const first  = sortedCompleted[0];
  const latest = sortedCompleted[sortedCompleted.length - 1];

  /* 3 ─ ALWAYS call the comparison hook to keep hook order stable ---------- */
  const cmp = useVisitComparison(
    patientId,
    first  ? first.id  : "",
    latest ? latest.id : "",
  );

  /* 4 ─ shape the return object ------------------------------------------- */
  return {
    ready : completed.length >= 2,
    before: first,
    after : latest,
    deltas: cmp.deltas ?? [],
    ...cmp,                     // also exposes before / after PAR etc.
  };
}
  return {
    ready : uniqueCompleted.length >= 2,
    before: first,
    after : latest,
    deltas: cmp.deltas ?? [],
    ...cmp,                     // also exposes before / after PAR etc.
  };
}
