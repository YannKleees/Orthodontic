/* ------------------------------------------------------------------ */
/*  hooks/usePARComponentsContext.tsx                                 */
/* ------------------------------------------------------------------ */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useState,
  ReactNode,
} from "react";
import { apiClient } from "@/lib/api";
import type { PARComponent } from "@/hooks/types";

/* ---------- Richmond weights ------------------------------------- */
const WEIGHTS: Record<string, number> = {
  "Upper Crowding": 1,
  "Lower Crowding": 1,
  "Upper Spacing" : 1,
  "Lower Spacing" : 1,
  Overjet         : 6,
  Centerline      : 4,
  Overbite        : 2,
  Crossbite       : 1,
};

/* ---------- leading‑edge debounce -------------------------------- */
function useDebounced() {
  const timers = useRef<Record<string, any>>({});
  return (key: string, fn: () => void, ms = 250) => {
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(fn, ms);
  };
}

/* ---------- context boiler‑plate --------------------------------- */
interface Ctx {
  components: PARComponent[];
  loading: boolean;
  error: string | null;
  updateComponent(id: string, patch: Partial<PARComponent>): void;
  createComponent(comp: Omit<PARComponent, "id">): Promise<PARComponent>;
  deleteComponent(id: string): Promise<void>;
  getComponentsByView(viewId: string): PARComponent[];
}
const C = createContext<Ctx | undefined>(undefined);

export function PARComponentsProvider({
  patientId,
  visitId,
  children,
}: {
  patientId: string;
  visitId: string;
  children: ReactNode;
}) {
  /* ---------- local state ---------------------------------------- */
  const [components, setComponents] = useState<PARComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---------- fetch --------------------------------------------- */
  const fetchComponents = useCallback(async () => {
    if (!visitId) {
      setComponents([]); setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data } = await apiClient.getPARComponent(patientId, visitId);
      setComponents(data);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Unable to load PAR components");
    } finally {
      setLoading(false);
    }
  }, [patientId, visitId]);

  useEffect(() => { fetchComponents(); }, [fetchComponents]);

  /* ---------- helper: POST weighted total to visit -------------- */
  const debounced = useDebounced();
  const persistTotal = useCallback(
    (list: PARComponent[]) => {
      const total = list.reduce(
        (sum, c) => sum + (WEIGHTS[c.component] ?? 1) * c.score,
        0,
      );
      debounced("__total__", () =>
        apiClient
          .updateVisit(patientId, visitId, { parScore: total } as any)
          .then(() => {
         /*  notify the rest of the app that PAR changed            */
         window.dispatchEvent(
           new CustomEvent("par-score-updated", {
             detail: { patientId, visitId, parScore: total },
           }),
         );
      })
          .catch(() => {/* silent  */}),
      );
    },
    [patientId, visitId, debounced],
  );

  /* ---------- update one component ------------------------------ */
  const updateComponent = useCallback(
    (id: string, patch: Partial<PARComponent>) => {
      setComponents(prev => {
        const next = prev.map(c => (c.id === id ? { ...c, ...patch } : c));
        persistTotal(next);
        return next;
      });

      /* PUT (debounced per component) */
      debounced(id, () => {
        apiClient
          .updatePARComponent(patientId, visitId, id, {
            ...patch,
            modifiedBy: "frontend",
          })
          .catch(fetchComponents);
      });
    },
    [patientId, visitId, debounced, fetchComponents, persistTotal],
  );

  /* ---------- create -------------------------------------------- */
  const createComponent = async (
    comp: Omit<PARComponent, "id">,
  ): Promise<PARComponent> => {
    const { data: created } = await apiClient.createPARComponent(
      patientId,
      visitId,
      { ...comp, modifiedBy: "frontend" },
    );

    setComponents(prev => {
      const next = [...prev, created];
      persistTotal(next);
      return next;
    });
    return created;
  };

  /* ---------- delete -------------------------------------------- */
  const deleteComponent = async (id: string) => {
    setComponents(prev => {
      const next = prev.filter(c => c.id !== id);
      persistTotal(next);
      return next;
    });
    try {
      await apiClient.deletePARComponent(patientId, visitId, id);
    } catch {
      fetchComponents();
    }
  };

  /* ---------- helpers ------------------------------------------- */
  const getComponentsByView = (viewId: string) =>
    components.filter(c => c.viewId === viewId);

  return (
    <C.Provider
      value={{
        components,
        loading,
        error,
        updateComponent,
        createComponent,
        deleteComponent,
        getComponentsByView,
      }}
    >
      {children}
    </C.Provider>
  );
}

export function usePARComponentsContext(
  _patientId?: string,
  _visitId?: string,
) {
  const ctx = useContext(C);
  if (!ctx)
    throw new Error(
      "usePARComponentsContext must be used inside PARComponentsProvider",
    );
  return ctx;
}
