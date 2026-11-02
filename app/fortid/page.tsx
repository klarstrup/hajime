import Link from "next/dist/client/link";
import { getSortedEvents } from "../events";

const timeZone = "Europe/Copenhagen";

export default async function Fortid() {
  const events = await getSortedEvents({ cotemporality: "past" });

  return (
    <div>
      <div className="flex gap-8 justify-evenly">
        <EventList events={events} title="Hvad Der Skete I Karate" />
      </div>
    </div>
  );
}

function EventList({
  events,
  title,
}: {
  events: Awaited<ReturnType<typeof getSortedEvents>>;
  title: string;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex gap-2 mt-2 mb-4 items-baseline justify-between">
        <header className="text-xl font-extrabold">🥋 {title}</header>
        <Link className="text-sm text-red-300" href={"/"}>
          Se kommende karatebegivenheder
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {events.map((event) => (
          <li
            key={event.id}
            className="dark:bg-gray-900 bg-white p-2 rounded flex flex-col"
          >
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-500 hover:underline text-lg font-medium"
            >
              {event.title}
            </a>
            <span>
              {event.start && event.end
                ? Intl.DateTimeFormat("da", {
                    timeStyle: "short",
                    dateStyle: "medium",
                    timeZone,
                  }).formatRange(event.start, event.end)
                : event.start
                  ? Intl.DateTimeFormat("da", {
                      second: undefined,
                      minute: "2-digit",
                      hour: "2-digit",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      timeZone,
                    }).format(event.start)
                  : null}
            </span>
            {event.location && (
              <span className="text-sm text-gray-400"> @ {event.location}</span>
            )}
            <span className="text-xs text-gray-600">via {event.source}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
