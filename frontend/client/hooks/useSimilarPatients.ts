import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { SimilarPatient } from "@/lib/api";

export const useSimilarPatients = (pid: string, k = 10) =>
  useQuery<SimilarPatient[]>({
    enabled : !!pid,
    queryKey: ["similar", pid, k],
    queryFn : () =>
      apiClient.getSimilarPatients(pid, k).then(r => r.data),
  });