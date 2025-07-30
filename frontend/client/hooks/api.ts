/* src/hooks/api.ts -------------------------------------------------- */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { Patient, Visit, SimilarPatient, PARComponent } from "@/hooks/types";

/* PATIENTS ---------------------------------------------------------- */
export const usePatients = (search?: string) =>
  useQuery({
    queryKey: ["patients", search ?? ""],
    queryFn : () => apiClient.getPatients(search).then(r => r.data)
  });

export const usePatient = (id: string) =>
  useQuery({
    enabled : !!id,
    queryKey: ["patient", id],
    queryFn : () => apiClient.getPatient(id).then(r => r.data)
  });

/* VISITS ------------------------------------------------------------ */
export const useVisits = (patientId: string) =>
  useQuery({
    enabled : !!patientId,
    queryKey: ["visits", patientId],
    queryFn : () => apiClient.getVisits(patientId).then(r => r.data)
  });

export const useVisit = (visitId: string) =>
  useQuery({
    enabled : !!visitId,
    queryKey: ["visit", visitId],
    queryFn : () => apiClient.getVisit(visitId).then(r => r.data)
  });

export const useCreateVisit = (patientId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn : (payload: Partial<Visit>) =>
      apiClient.createVisit(patientId, payload as any).then(r => r.data),
    onSuccess  : () => qc.invalidateQueries({ queryKey: ["visits", patientId] })
  });
};

/* PAR components ---------------------------------------------------- */
export const usePARComponents = (patientId: string, visitId: string) =>
  useQuery({
    enabled : !!patientId && !!visitId,
    queryKey: ["par", patientId, visitId],
    queryFn : () => apiClient.getPARComponent(patientId, visitId).then(r => r.data)
  });

/* similar – reports, similarPatients etc. */
