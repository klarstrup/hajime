import { differenceInHours } from "date-fns";
import Link from "next/link";
import { Fragment } from "react";
import type { getSortedEvents } from "./events";

const timeZone = "Europe/Copenhagen";

const isUTCOrLocalMidnight = (date: Date) =>
  date.getUTCHours() === 0 ||
  date.getHours() === 0 ||
  date.toLocaleTimeString("da-DK", { timeZone }) === "00:00";

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
              {gEvents
                .filter((e, i, l) =>
                  l.filter((le) => le.start && !isUTCOrLocalMidnight(le.start))
                    .length > 0
                    ? e.start && !isUTCOrLocalMidnight(e.start)
                    : true,
                )
                .map((e) =>
                  e.start &&
                  e.end &&
                  (isUTCOrLocalMidnight(e.end)
                    ? differenceInHours(e.start, e.end) > 24
                    : true)
                    ? Intl.DateTimeFormat("da", {
                        timeStyle: isUTCOrLocalMidnight(e.start)
                          ? undefined
                          : "short",
                        dateStyle: "medium",
                        timeZone,
                      }).formatRange(e.start, e.end)
                    : e.start
                      ? Intl.DateTimeFormat("da", {
                          timeStyle: isUTCOrLocalMidnight(e.start)
                            ? undefined
                            : "short",
                          dateStyle: "short",
                          timeZone,
                        }).format(e.start)
                      : null,
                )
                .filter((etext): etext is string => !!etext)
                .filter((etext, index, list) => list.indexOf(etext) === index)
                .map((e, index) => (
                  <span key={index}>{e}</span>
                ))}
              {gEvents
                .map((e) => e.location)
                .filter((l): l is string => !!l)
                .filter(
                  (location, index, list) =>
                    location &&
                    list.findIndex(
                      (l) =>
                        l === location ||
                        l
                          .replaceAll(",", "")
                          .includes(location.replaceAll(",", "")) ||
                        location
                          .replaceAll(",", "")
                          .includes(l.replaceAll(",", "")),
                    ) === index,
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
                      {l.length > 1 && i === l.length - 1
                        ? " og "
                        : i > 0
                          ? ", "
                          : ""}
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
