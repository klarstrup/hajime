import { differenceInHours } from "date-fns";
import Link from "next/link";
import { Fragment } from "react";
import type { getSortedEvents } from "./events";

const timeZone = "Europe/Copenhagen";

const isUTCOrLocalMidnight = (date: Date) =>
  date.getUTCHours() === 0 ||
  date.getHours() === 0 ||
  date.toLocaleTimeString("da-DK", { timeZone }) === "00.00.00";

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
        <header className="text-xl font-extrabold flex gap-1">
          <span>🥋</span>
          <span>{title}</span>
        </header>
        <Link
          className="text-sm text-red-300 text-right"
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

          const uniqueSources = gEvents.filter(
            (s, index, list) =>
              list.findIndex((x) => x.source === s.source) === index,
          );

          const usedSources: typeof uniqueSources = [];

          let usedIndex = usedSources.findIndex(
            (us) => us.sourceId === event.sourceId,
          );
          if (usedIndex === -1) {
            usedIndex = usedSources.push(event) - 1;
          }

          return (
            <li
              key={
                event.id + event.start?.toISOString() + event.end?.toISOString()
              }
              className="dark:bg-gray-900 bg-white p-2 pt-1 rounded flex flex-col attribution-container"
            >
              <div>
                <a
                  href={gEvents.find((e) => e.url?.trim().length)?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-500 hover:underline text-lg font-medium"
                >
                  {event.title.replaceAll(/\d\d\d\d/g, "").trim()}
                </a>
                <span className="text-[8px] align-super text-gray-500 attribution -mr-1">
                  {usedIndex + 1}
                </span>
              </div>
              {gEvents
                .filter((e, i, l) =>
                  l.filter((le) => le.start && !isUTCOrLocalMidnight(le.start))
                    .length > 0
                    ? e.start && !isUTCOrLocalMidnight(e.start)
                    : true,
                )
                .slice(0, 1)
                .map((e) => [
                  e,
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
                ])
                .filter(
                  (eandtext): eandtext is [(typeof gEvents)[0], string] =>
                    !!eandtext[1],
                )
                .filter(
                  ([, etext], index, list) =>
                    list.findIndex(([, t]) => t === etext) === index,
                )
                .map((e, index) => {
                  let usedIndex = usedSources.findIndex(
                    (us) => us.sourceId === e[0].sourceId,
                  );
                  if (usedIndex === -1) {
                    usedIndex = usedSources.push(e[0]) - 1;
                  }
                  return (
                    <span key={index}>
                      {e[1]}
                      <span className="text-[8px] align-super text-gray-500 attribution -mr-1">
                        {usedIndex + 1}
                      </span>
                    </span>
                  );
                })}
              {gEvents
                .filter(
                  ({ location }, index, list) =>
                    location &&
                    list.findIndex(
                      ({ location: l }) =>
                        l &&
                        (l
                          .toLowerCase()
                          .replaceAll(",", "")
                          .includes(
                            location.toLocaleLowerCase().replaceAll(",", ""),
                          ) ||
                          location
                            .toLowerCase()
                            .replaceAll(",", "")
                            .includes(l.toLowerCase().replaceAll(",", ""))),
                    ) === index,
                )
                .map(
                  (e) =>
                    [
                      e,
                      gEvents
                        .filter(
                          (ge) =>
                            e.location &&
                            ge.location &&
                            (ge.location
                              .toLowerCase()
                              .replaceAll(",", "")
                              .includes(
                                e.location.toLowerCase().replaceAll(",", ""),
                              ) ||
                              e.location
                                .toLowerCase()
                                .replaceAll(",", "")
                                .includes(
                                  ge.location.toLowerCase().replaceAll(",", ""),
                                )),
                        )
                        .filter((ge) => ge.source)
                        .filter(
                          (ge, i, l) =>
                            l.findIndex((x) => x.source === ge.source) === i,
                        ),
                    ] as const,
                )
                .sort(([, a], [, b]) => b.length - a.length)
                .reduce(
                  (
                    memo: (typeof eventLocationSourcesPair)[],
                    eventLocationSourcesPair,
                    index,
                    list,
                  ) => {
                    return list;
                    // If one location has clear consensus just keep that one
                    const [, locationSources] = eventLocationSourcesPair;
                    const maxLength = Math.max(
                      ...list.map(([, ls]) => ls.length),
                    );
                    if (locationSources.length === maxLength) {
                      memo.push(eventLocationSourcesPair);
                    }
                    return memo;
                  },
                  [],
                )
                .map(([e, locationSources], index) => {
                  return (
                    <span key={index} className="text-sm text-gray-400">
                      {" "}
                      @ {e.location}
                      {locationSources.map((s, i) => {
                        let usedIndex = usedSources.findIndex(
                          (us) => us.sourceId === s.sourceId,
                        );
                        if (usedIndex === -1) {
                          usedIndex = usedSources.push(s) - 1;
                        }

                        return (
                          <span
                            key={s.sourceId}
                            className="text-[8px] align-super text-gray-500 attribution"
                          >
                            {i > 0 ? "," : ""}
                            {usedIndex + 1}
                          </span>
                        );
                      })}
                    </span>
                  );
                })}
              <span className="text-xs text-gray-600">
                via{" "}
                {[...usedSources, ...uniqueSources]
                  .filter(
                    (e, i, l) =>
                      l.findIndex((x) => x.sourceId === e.sourceId) === i,
                  )
                  .map((e, i, l) => (
                    <Fragment key={i}>
                      {l.length > 1 && i === l.length - 1
                        ? " og "
                        : i > 0
                          ? ", "
                          : ""}
                      {usedSources.includes(e) && (
                        <span className="text-[6px] align-super text-gray-500 attribution font-bold">
                          {i + 1}
                        </span>
                      )}
                      <a
                        href={e.sourceCalendarUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-500 hover:underline"
                      >
                        {e.source}
                      </a>
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
