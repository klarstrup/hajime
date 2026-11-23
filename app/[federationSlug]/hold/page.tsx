import { eventsSources } from "@/sources/sources";
import HoldList from "../../hold/HoldList";

export function generateStaticParams() {
  return eventsSources
    .filter((source): source is typeof source & { federation: string[] } =>
      Boolean(
        "federation" in source &&
        Array.isArray(source.federation) &&
        source.federation.length,
      ),
    )
    .flatMap((source) => source.federation)
    .filter((s, i, l) => i === l.findIndex((t) => t === s))
    .map((federationSlug) => ({ federationSlug }));
}

export const instant = false;
export default async function TræningPage({
  params,
}: PageProps<"/[federationSlug]/hold">) {
  const federationSlug = (await params).federationSlug;

  return <HoldList federationSlug={federationSlug} />;
}
