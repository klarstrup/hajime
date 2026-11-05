import Link from "next/link";
import { Fragment } from "react";
import type { getSortedEvents } from "./events";
import { fuseCompare } from "./utils";

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
  const eventsByYearAndMonth = events.reduce(
    (acc, gEvents) => {
      const event = gEvents[0];
      const year = event.start.getFullYear();
      const month = event.start.getMonth();
      if (!acc[year]) acc[year] = {};
      if (!acc[year][month]) acc[year][month] = [];
      acc[year][month].push(gEvents);
      return acc;
    },
    {} as Record<number, Record<number, typeof events>>,
  );
  return (
    <div className="flex flex-col max-w-xl">
      <div className="flex gap-2 mt-2 items-baseline justify-between">
        <header className="text-xl font-extrabold flex gap-1 items-baseline">
          <span className="text-[1.75rem] md:text-[2rem] lg:text-[2.5rem] xl:text-[3rem]">
            🥋
          </span>
          <span className="text-lg md:text-xl lg:text-2xl xl:text-3xl">
            {title}
          </span>
        </header>
        <Link
          className="text-sm text-red-400 text-right"
          href={cotemporality === "past" ? `/` : (`/fortid` as `/`)}
        >
          {cotemporality === "past"
            ? "Se kommende karate"
            : "Se tidligere karate"}
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {(cotemporality === "past"
          ? Object.entries(eventsByYearAndMonth).reverse()
          : Object.entries(eventsByYearAndMonth)
        ).map(([yearIndex, eventsByMonth]) => (
          <div key={yearIndex} className="flex gap-1">
            <div>
              <h2
                className="text-xl font-bold sticky -top-0.5 -mt-0.5 -mr-0.5 opacity-60 md:text-2xl lg:text-3xl xl:text-4xl"
                style={{
                  writingMode: "vertical-rl",
                  textOrientation: "upright",
                  lineHeight: 0.5,
                  letterSpacing: "-0.3em",
                }}
              >
                {new Date(Number(yearIndex), 0, 1)
                  .toLocaleString("da-DK", { year: "numeric" })
                  .toUpperCase()}
              </h2>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              {(cotemporality === "past"
                ? Object.entries(eventsByMonth).reverse()
                : Object.entries(eventsByMonth)
              ).map(([monthIndex, monthEvents]) => (
                <div key={yearIndex + "-" + monthIndex} className="flex">
                  <div>
                    <h2
                      className="text-md font-bold sticky top-0 md:text-lg lg:text-xl xl:text-2xl"
                      style={{
                        writingMode: "vertical-rl",
                        textOrientation: "upright",
                        lineHeight: 1.25,
                        letterSpacing: "-0.25em",
                      }}
                    >
                      {new Date(Number(yearIndex), Number(monthIndex), 1)
                        .toLocaleString("da-DK", { month: "long" })
                        .toUpperCase()}
                    </h2>
                  </div>
                  <ul className="flex flex-col gap-2 flex-1">
                    {monthEvents.map((gEvents) => {
                      const event =
                        gEvents.find(
                          (e) => e.sourceId === "kumite-technology",
                        ) ?? gEvents[0];

                      const uniqueSources = gEvents.filter(
                        (s, index, list) =>
                          list.findIndex((x) => x.source === s.source) ===
                          index,
                      );

                      const usedSources: typeof uniqueSources = [];

                      let usedIndex = usedSources.findIndex(
                        (us) => us.sourceId === event.sourceId,
                      );
                      if (usedIndex === -1) {
                        usedIndex = usedSources.push(event) - 1;
                      }

                      const url =
                        event.url ||
                        gEvents.find((e) => e.url?.trim().length)?.url;
                      let title = event.title
                        .replaceAll(/\d\d\d\d/g, "")
                        .trim()
                        .replace(/ Efterår$/gi, "")
                        .trim()
                        .replace(/ Forår$/gi, "")
                        .trim()
                        .replace(/ Vinter$/gi, "")
                        .trim()
                        .replace(/ Sommer$/gi, "")
                        .trim()
                        .replace(/ –$/g, "")
                        .trim()
                        .replace(/-$/g, "")
                        .trim();
                      // if there are more than two words, prevent orphaned words by replacing the last space with a non-breaking space
                      if (title.split(" ").length > 2) {
                        title = title.replace(/ (\S+)$/, "\u00A0$1");
                      }

                      const federations = gEvents
                        .filter((e): e is typeof e & { federation: string } =>
                          Boolean("federation" in e && e.federation),
                        )
                        .map((e) => e.federation);
                      const federationsWithCount = Object.entries(
                        federations
                          // Find the most common federation among the events
                          .reduce((acc: Record<string, number>, fed) => {
                            if (!acc[fed]) acc[fed] = 0;
                            acc[fed] += 1;
                            return acc;
                          }, {}),
                      ).sort((a, b) => b[1] - a[1]);

                      let federation: string | undefined;
                      if (
                        federations.length > 0 &&
                        federationsWithCount.length > 0
                      ) {
                        federation = federationsWithCount[0][0];
                        if (
                          // If the most common federation has the same count as the second most common, it's ambiguous, so unset it.
                          federationsWithCount[0][1] ===
                          federationsWithCount[1]?.[1]
                        ) {
                          // federation = undefined;
                        }
                      }
                      if (federations.some((fed) => fed === "*")) {
                        federation = "*";
                      }

                      return (
                        <li
                          key={
                            event.id +
                            event.start?.toISOString() +
                            event.end?.toISOString()
                          }
                          className="dark:bg-gray-900 bg-white p-2 pt-1 rounded flex flex-col attribution-container leading-tight"
                        >
                          <div>
                            {federation &&
                              (title.includes("graduering") ||
                                title.includes("mesterskab") ||
                                title.toLowerCase().includes("lejr") ||
                                title.toLowerCase().includes("camp") ||
                                title.toLowerCase().includes("gasshuku")) && (
                                <span
                                  className={
                                    "opacity-25 ml-2 float-right " +
                                    (federation === "*" ? "text-lg" : "text-sm")
                                  }
                                >
                                  {federation === "*" ? "✱" : federation}
                                </span>
                              )}
                            {url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-red-500 hover:underline text-xl font-bold"
                              >
                                {title}
                              </a>
                            ) : (
                              <span className="light:text-gray-600  text-xl font-bold">
                                {title}
                              </span>
                            )}
                            <span className="text-[8px] align-super text-gray-500 attribution -mr-1">
                              {usedIndex + 1}
                            </span>
                          </div>
                          {gEvents
                            .filter((e, i, l) =>
                              l.filter(
                                (le) =>
                                  le.start && !isUTCOrLocalMidnight(le.start),
                              ).length > 0
                                ? e.start && !isUTCOrLocalMidnight(e.start)
                                : true,
                            )
                            .slice(0, 1)
                            .map((e) => [
                              e,
                              e.start && e.end
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
                              (
                                eandtext,
                              ): eandtext is [(typeof gEvents)[0], string] =>
                                !!eandtext[1],
                            )
                            .filter(
                              ([, etext], index, list) =>
                                list.findIndex(([, t]) => t === etext) ===
                                index,
                            )
                            .map((e, index) => {
                              let usedIndex = usedSources.findIndex(
                                (us) => us.sourceId === e[0].sourceId,
                              );
                              if (usedIndex === -1) {
                                usedIndex = usedSources.push(e[0]) - 1;
                              }
                              return (
                                <span
                                  key={index}
                                  className="leading-none opacity-90 font-medium"
                                >
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
                                    fuseCompare(
                                      l.replaceAll(",", ""),
                                      location.replaceAll(",", ""),
                                    ) < 0.42,
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
                                        fuseCompare(
                                          ge.location.replaceAll(",", ""),
                                          e.location.replaceAll(",", ""),
                                        ) < 0.42,
                                    )
                                    .filter((ge) => ge.source)
                                    .filter(
                                      (ge, i, l) =>
                                        l.findIndex(
                                          (x) => x.source === ge.source,
                                        ) === i,
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
                                // If one location has clear consensus just keep that one
                                const [, locationSources] =
                                  eventLocationSourcesPair;
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
                                <span
                                  key={index}
                                  className="text-sm text-gray-400 flex gap-0.5 items-baseline"
                                >
                                  <span className="text-gray-400 text-[11px]">
                                    @
                                  </span>
                                  <span>
                                    {e.location}
                                    {locationSources
                                      .map((s) => {
                                        let usedIndex = usedSources.findIndex(
                                          (us) => us.sourceId === s.sourceId,
                                        );
                                        if (usedIndex === -1) {
                                          usedIndex = usedSources.push(s) - 1;
                                        }
                                        return s;
                                      })
                                      .sort(
                                        (a, b) =>
                                          usedSources.findIndex(
                                            (us) => us.sourceId === a.sourceId,
                                          ) -
                                          usedSources.findIndex(
                                            (us) => us.sourceId === b.sourceId,
                                          ),
                                      )
                                      .map((s, i) => {
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
                                </span>
                              );
                            })}
                          <span className="text-xs text-gray-600">
                            via{" "}
                            {[...usedSources, ...uniqueSources]
                              .filter(
                                (e, i, l) =>
                                  l.findIndex(
                                    (x) => x.sourceId === e.sourceId,
                                  ) === i,
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
                                    className="text-red-400 hover:underline"
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
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
