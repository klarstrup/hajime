import { EventList } from "./EventList";
import { getSortedEvents } from "../sources/sourceUtils";

export default async function Fremtid() {
  const events = await getSortedEvents({ cotemporality: "future" });

  return (
    <EventList cotemporality="future" events={events} title="Karatetræf" />
  );
}
