import { EventList } from "./EventList";
import { getSortedEvents } from "./events";

export default async function Fremtid() {
  const events = await getSortedEvents({ cotemporality: "future" });

  return (
    <div>
      <div className="flex gap-8 justify-evenly">
        <EventList
          cotemporality="future"
          events={events}
          title="Hvad Der Sker I Karate"
        />
      </div>
    </div>
  );
}
