import { EventList } from "../EventList";
import { getSortedEvents } from "../events";

export default async function Fortid() {
  const events = await getSortedEvents({ cotemporality: "past" });

  return (
    <div>
      <div className="flex gap-8 justify-evenly">
        <EventList
          cotemporality="past"
          events={events}
          title="Hvad Der Skete I Karate"
        />
      </div>
    </div>
  );
}
