import { EventList } from "../EventList";
import { eventsSources, getSortedEvents } from "../sources";

export function generateStaticParams() {
  return eventsSources
    .filter((source): source is typeof source & { federation: string } =>
      Boolean("federation" in source && source.federation),
    )
    .map((source) => source.federation)
    .filter((s, i, l) => i === l.findIndex((t) => t === s))
    .map((federationSlug) => ({ federationSlug }));
}

export const instant = false;
export default async function FederationEvents({
  params,
}: PageProps<"/[federationSlug]">) {
  const federationSlug = (await params).federationSlug;
  const events = await getSortedEvents({ cotemporality: "future" });

  return (
    <EventList
      cotemporality="future"
      events={events}
      title="Karatetræf"
      federationSlug={federationSlug}
    />
  );
}
