import { EventList } from "../EventList";
import { getSortedEvents } from "../sources";

export default async function Fortid() {
  const events = await getSortedEvents({ cotemporality: "past" });

  return (
    <EventList cotemporality="past" events={events} title="Tidligere Karatetræf" />
  );
}
