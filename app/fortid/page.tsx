import { EventList } from "../EventList";
import { getSortedEvents } from "../sourceUtils";

export default async function Fortid() {
  const events = await getSortedEvents({ cotemporality: "past" });

  return <EventList cotemporality="past" events={events} title="Karatetruf" />;
}
