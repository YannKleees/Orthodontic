/* ------------------------------------------------------------------
   client/hooks/useApi.ts      —  FULL FILE
------------------------------------------------------------------- */
import { useState, useEffect, useCallback } from "react";
import { apiClient, type ApiResponse }      from "@/lib/api";

/* domain types ---------------------------------------------------- */
import type {
  Visit,
  Patient,
  PARComponent,
  SimilarPatient,
} from "@/hooks/types";

/* ================================================================
   1.  Generic helper – turns any async GET into a small React hook
   ================================================================ */
export function useApi<T>(
  apiFn: () => Promise<ApiResponse<T>>,
  deps : any[] = [],                        // re‑run when deps change
) {
  const [data,    setData   ] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError  ] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { success, data } = await apiFn();
      success ? setData(data) : setError("Request failed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/* ================================================================
   2.  Read‑only hooks (auto‑refetch on dependency change)
   ================================================================ */
export const usePatients = (opts?: { q?: string; parMin?: number; parMax?: number; severity?: string }) =>
  useApi<Patient[]>(
    () => apiClient.getPatients(opts),          // ← pass whole object
    [JSON.stringify(opts ?? {})],               // ensure proper memo key
  );
export const usePatient = (id?: string) =>
  useApi<Patient>(() => apiClient.getPatient(id!), [id]);

export const useVisits = (pid?: string, filter?: any) =>
  useApi<Visit[]>(() => apiClient.getVisits(pid!, filter), [pid, filter]);

export const useVisitDetail = (vid?: string) =>
  useApi<Visit>(() => apiClient.getVisit(vid!), [vid]);

export const useReports = (pid?: string, filter?: any) =>
  useApi<any[]>(() => apiClient.getReports(pid!, filter), [pid, filter]);

export const useSimilarPatients = (pid?: string, k = 10) =>
  useApi<SimilarPatient[]>(
    () =>
      apiClient.getSimilarPatients(pid!, k) as unknown as Promise<
        ApiResponse<SimilarPatient[]>
      >,
    [pid, k],
  );

/* ----------------------------------------------------------------
   Live list of PAR components for a visit  (dashboard & editor)
   ---------------------------------------------------------------- */
export const usePARComponentList = (pid?: string, vid?: string) =>
  useApi<PARComponent[]>(
    () => apiClient.getPARComponent(pid!, vid!), [pid, vid]);

/*  lower‑case alias so the earlier import in PatientMosaic still
    works without code changes                                        */
export const useParComponentList = usePARComponentList;

/* ================================================================
   3.  CRUD helpers for PAR components (plain async, not hooks)
   ================================================================ */

/** Create a new PAR component */
export const createPARComponent = async (
  patientId : string,
  visitId   : string,
  component : Omit<PARComponent, "id" | "lastModified">,
) =>
  apiClient.createPARComponent(patientId, visitId, {
    ...component,
    modifiedBy: "frontend",
  });

/** Update an existing PAR component */
export const updatePARComponent = async (
  patientId   : string,
  visitId     : string,
  componentId : string,
  updates     : Partial<PARComponent>,
) =>
  apiClient.updatePARComponent(patientId, visitId, componentId, {
    ...updates,
    modifiedBy: "frontend",
  });

/** Delete a PAR component */
export const deletePARComponent = async (
  patientId   : string,
  visitId     : string,
  componentId : string,
) => apiClient.deletePARComponent(patientId, visitId, componentId);
