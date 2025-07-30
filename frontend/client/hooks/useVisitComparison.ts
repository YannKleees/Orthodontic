/* client/hooks/useVisitComparison.ts ----------------------------- */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { Visit, PARComponent } from "@/hooks/types";

export function useVisitComparison(
  patientId: string,
  baselineId: string,        // visit to compare *against*
  followUpId: string         // visit to compare *to*
) {
  return useQuery({
    enabled : !!patientId && !!baselineId && !!followUpId,
    queryKey: ["visit-comparison", baselineId, followUpId],
    queryFn : async () => {
      const [a, b] = await Promise.all([
        apiClient.getVisit(baselineId).then(r => r.data),
        apiClient.getVisit(followUpId).then(r => r.data),
      ]);

      /* aggregate by component name */
      const byName = (v: Visit) =>
        (v.boxes ?? []).reduce<Record<string,number>>(
          (m,c)=>(m[c.component]=(m[c.component]||0)+c.score, m), {}
        );

      const pa = byName(a);
      const pb = byName(b);
      const allNames = new Set([...Object.keys(pa), ...Object.keys(pb)]);

      const deltas = [...allNames].map(name => ({
        component: name,
        before   : pa[name] ?? 0,
        after    : pb[name] ?? 0,
        diff     : (pb[name] ?? 0) - (pa[name] ?? 0),
      }));

      return { before:a, after:b, deltas };
    },
  });
}
