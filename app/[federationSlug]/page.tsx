import { EventList } from "../EventList";
import { getSortedEvents } from "../sources";

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
