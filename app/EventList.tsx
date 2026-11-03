import Link from "next/link";
import { Fragment } from "react";
import type { getSortedEvents } from "./events";

const timeZone = "Europe/Copenhagen";

export function EventList({
  events,
  title,
  cotemporality = "future",
}: {
  events: Awaited<ReturnType<typeof getSortedEvents>>;
  title: string;
  cotemporality?: "past" | "future";
}) {
  return (
    <div className="flex flex-col max-w-2xl">
      <div className="flex gap-2 mt-2 mb-2 items-baseline justify-between px-2">
        <header className="text-xl font-extrabold">🥋 {title}</header>
        <Link
          className="text-sm text-red-300"
          href={cotemporality === "past" ? `/` : (`/fortid` as `/`)}
        >
          {cotemporality === "past"
            ? "Se kommende karatebegivenheder"
            : "Se tidligere karatebegivenheder"}
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {events.map((gEvents) => {
          const event = gEvents[0];
          return (
            <li
              key={
                event.id + event.start?.toISOString() + event.end?.toISOString()
              }
              className="dark:bg-gray-900 bg-white p-2 pt-1 rounded flex flex-col"
            >
              <a
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-500 hover:underline text-lg font-medium"
              >
                {event.title.replaceAll(/\d\d\d\d/g, "")}
              </a>
              {gEvents.map((e, index) => (
                <span key={index}>
                  {e.start && e.end
                    ? Intl.DateTimeFormat("da", {
                        timeStyle: "short",
                        dateStyle: "medium",
                        timeZone,
                      }).formatRange(e.start, e.end)
                    : e.start
                      ? Intl.DateTimeFormat("da", {
                          timeStyle: "short",
                          dateStyle: "medium",
                          timeZone,
                        }).format(e.start)
                      : null}
                </span>
              ))}
              {gEvents
                .map((e) => e.location)
                .filter((l): l is string => !!l)
                .filter(
                  (location, index, list) =>
                    location &&
                    (list.indexOf(location) === index ||
                      !list.find((l) => l.includes(location))),
                )
                .map((location, index) => (
                  <span key={index} className="text-sm text-gray-400">
                    {" "}
                    @ {location}
                  </span>
                ))}
              <span className="text-xs text-gray-600">
                via{" "}
                {gEvents
                  .filter(
                    // unique sources
                    (e, index, list) =>
                      list.findIndex((ev) => ev.source === e.source) === index,
                  )
                  .map((e, i, l) => (
                    <Fragment key={i}>
                      {i === l.length - 1 ? " og " : i > 0 ? ", " : ""}
                      {"calendarUrl" in e &&
                      typeof e.calendarUrl === "string" ? (
                        <a
                          href={e.calendarUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-500 hover:underline"
                        >
                          {e.source}
                        </a>
                      ) : (
                        e.source
                      )}
                    </Fragment>
                  ))}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
