import { eventsSources } from "@/app/sources";
import HoldList from "../HoldList";

export function generateStaticParams() {
  return eventsSources
    .filter((source) => "loadClasses" in source)
    .map((source) => ({ clubSlug: source.sourceId }));
}

export const instant = false;
export default async function TræningPage({
  params,
}: PageProps<"/hold/[clubSlug]">) {
  const clubSlug = (await params).clubSlug;

  return <HoldList clubSlug={clubSlug} />;
}
