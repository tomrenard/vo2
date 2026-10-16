import type { Lesson } from "@/lib/content";
import { EnergySystems } from "./EnergySystems";

type Spec = NonNullable<Extract<Lesson["steps"][number], { type: "concept" }>["diagram"]>;

/** The diagram a concept card names. Diagrams not built yet show nothing. */
export function Diagram({ spec }: { spec: Spec }) {
  if (spec.id === "energy-systems")
    return <EnergySystems caption={spec.caption} params={spec.params} />;
  return null;
}
