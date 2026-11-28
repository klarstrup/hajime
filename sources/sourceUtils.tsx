import { tz } from "@date-fns/tz";
import * as cheerio from "cheerio";
import {
  addMonths,
  addYears,
  areIntervalsOverlapping,
  endOfDay,
  isDate,
  isEqual,
  startOfDay,
  startOfToday,
  startOfTomorrow,
  startOfYesterday,
} from "date-fns";
import { convertIcsCalendar } from "ts-ics";
import { fuseCompare, renderClasses } from "../utils";
import type { ParseClassesOptions } from "../utils";
import { eventsSources } from "./sources";
import type {
  HoldsportActivity,
  KlubModul,
  LoadParams,
  Mentoclub,
} from "./sourceTypes";

export const fetch1 = async (url: string | URL) => {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }

  return res;
};
export const fetchText = async (url: string | URL) =>
  (await fetch1(url)).text();
export const fetchJson = async <T,>(url: string | URL) =>
  (await fetch1(url)).json() as Promise<T>;
export const fetchIcsCalendar = async (url: string | URL) =>
  convertIcsCalendar(
    undefined,
    (await fetchText(url))
      .replace(
        /^(DTSTART:\d{8})$/gm,
        (_, p1) => `DTSTART;VALUE=DATE:${p1.slice(8)}`,
      )
      .replace(
        /^(DTEND:\d{8})$/gm,
        (_, p1) => `DTEND;VALUE=DATE:${p1.slice(6)}`,
      ),
  );
export const fetchIcsEvents = async (url: string | URL) =>
  ((await fetchIcsCalendar(url))?.events || []).map((e) => ({
    ...e,
    end: e.end?.date
      ? isEqual(e.end?.date, e.start?.date)
        ? {
            ...e.end,
            date: endOfDay(e.start.date, { in: tz("Europe/Copenhagen") }),
          }
        : e.end
      : {
          ...e.start,
          date: endOfDay(e.start.date, { in: tz("Europe/Copenhagen") }),
        },
  }));
export const fetch$ = async (url: string) => cheerio.load(await fetchText(url));

export const fetchClasses = async (
  url: URL | string,
  now: Date,
  options?: ParseClassesOptions,
) => renderClasses(await fetchText(url), now, options);

export const fetchHoldsportEvents = async (
  {
    clubId,
    contentId,
  }: {
    clubId: number;
    contentId: number;
  },
  { cotemporality, now }: LoadParams,
) => {
  const start = cotemporality === "past" ? farPast : now;
  const end = cotemporality === "future" ? farFuture : now;
  const eventsUrl = new URL(
    "https://www.holdsport.net/klub/hvidovre-karateskole/activities",
  );
  eventsUrl.searchParams.set("club_id", String(clubId));
  eventsUrl.searchParams.set("content_id", String(contentId));
  eventsUrl.searchParams.set("activity_types", "null");
  eventsUrl.searchParams.set("start", start.toISOString());
  eventsUrl.searchParams.set("end", end.toISOString());
  eventsUrl.searchParams.set("timeZone", "Europe/Copenhagen");

  const events = await fetchJson<HoldsportActivity[]>(eventsUrl);
  return events.map((e) => ({
    ...e,
    title: cheerio
      .load(e.title)(".inner_event_wrapper > div")
      .eq(0)
      .text()
      .replace(cheerio.load(e.title)(".event_time").text(), ""),
    description: cheerio.load(e.tooltip).text(),
    start: new Date(e.start),
    end: e.end ? new Date(e.end) : null,
    location: cheerio
      .load(e.tooltip)(".activity_tooltip_subinfo")
      .has(".fa-location-pin")
      .text(),
  }));
};

export const fetchKlubModul = (
  cmsUrl: string,
  { cotemporality, now }: LoadParams,
) => {
  const start = cotemporality === "past" ? farPast : now;
  const end = cotemporality === "future" ? farFuture : now;
  const calendarjUrl = new URL("/cms/include/api/calendarj.aspx", cmsUrl);
  calendarjUrl.searchParams.set("start", start.toISOString());
  calendarjUrl.searchParams.set("end", end.toISOString());

  return fetchJson<KlubModul.Event[]>(calendarjUrl).then((events) =>
    events.map((e) => ({
      ...e,
      location: [e.location, e.address].filter(Boolean).join(", "),
      linkEvent: e.linkEvent
        ? new URL(e.linkEvent, cmsUrl).toString()
        : undefined,
      start: new Date(e.start),
      end: new Date(e.end),
    })),
  );
};

export const fetchMentoclub = async (
  baseUrl: string,
  { cotemporality, now }: LoadParams,
) => {
  if (!process.env.VERCEL) return [];

  const from = cotemporality === "future" ? now : new Date(2019, 0);
  const to = cotemporality === "past" ? now : addYears(now, 1);

  // mentoclub gettraining API only allows fetching ~2 months at a time, so
  // we need to split the request into multiple 2-month intervals if the range is larger than that.
  const intervals = [];
  let currentStart = from;
  while (currentStart < to) {
    const currentEnd = addMonths(currentStart, 2);
    intervals.push({ start: currentStart, end: currentEnd });
    currentStart = currentEnd;
  }

  const responses = (
    await Promise.all(
      intervals.map(({ start, end }) => {
        const gettrainingsUrl = new URL("/cms/gettrainings", baseUrl);
        gettrainingsUrl.searchParams.set("start", start.toISOString());
        gettrainingsUrl.searchParams.set("end", end.toISOString());

        return fetchJson<Mentoclub.GettrainingsTraining[]>(gettrainingsUrl);
      }),
    )
  )
    .flat()
    .map((training) => ({
      ...training,
      id: training.id + "-" + training.ident,
      start: new Date(training.start),
      end: new Date(training.end),
      url: training.ident
        ? new URL(`/event/${training.ident}`, baseUrl).toString()
        : undefined,
    }))
    .filter((training) => training.teamid === -1);

  return responses;
};

const farPast = new Date(2010, 0, 1);
const farFuture = new Date(2030, 0, 1);

export const getClasses = async () => {
  "use cache";

  const now = new Date(startOfToday({ in: tz("Europe/Copenhagen") }));

  const anySourceHasOnly = eventsSources.some(
    (source) => "only" in source && source.only,
  );

  return Promise.all(
    eventsSources
      .filter((source) =>
        anySourceHasOnly ? "only" in source && source.only : true,
      )
      .filter((source) =>
        !anySourceHasOnly ? !("skip" in source) || !source.skip : true,
      )
      .flatMap(
        (source) =>
          "loadClasses" in source &&
          source.loadClasses &&
          Array.fromAsync(source.loadClasses({ now }))
            .then((classes) =>
              classes.map((c) => ({
                ...c,
                source: source.name,
                sourceId: source.sourceId,
                classesUrl:
                  "classesUrl" in source ? source.classesUrl : undefined,
                federation:
                  "federation" in source ? source.federation : undefined,
              })),
            )
            .catch((err) => {
              console.error(
                `Error loading classes for source: ${source.sourceId}`,
                err,
              );

              return [];
            }),
      ),
  ).then((classes) => classes.flat().filter(Boolean));
};

function eventsAreCoinciding(
  event1: Awaited<ReturnType<typeof getSortedEvents>>[number][number],
  event2: Awaited<ReturnType<typeof getSortedEvents>>[number][number],
) {
  if (!event1.start) console.warn("Event 1 has no start date", event1);
  if (!event2.start) console.warn("Event 2 has no start date", event2);
  return areIntervalsOverlapping(
    {
      start: startOfDay(event1.start!, { in: tz("Europe/Copenhagen") }),
      end:
        event1.end ?? endOfDay(event1.start!, { in: tz("Europe/Copenhagen") }),
    },
    {
      start: startOfDay(event2.start!, { in: tz("Europe/Copenhagen") }),
      end:
        event2.end ?? endOfDay(event2.start!, { in: tz("Europe/Copenhagen") }),
    },
  );
}

export const fetchEvents = async ({
  cotemporality,
}: {
  cotemporality: "past" | "future";
}) => {
  "use cache";
  // a TZDate will stringify with its local time zone representation, which parsers can
  // fail to parse, so we convert it to a standard Date object which always toISOString()'s in Z(UTC)
  const now =
    cotemporality === "past"
      ? new Date(startOfTomorrow({ in: tz("Europe/Copenhagen") }))
      : new Date(startOfYesterday({ in: tz("Europe/Copenhagen") }));

  // For debugging
  const anySourceHasOnly = eventsSources.some(
    (source) => "only" in source && source.only,
  );

  return Promise.all(
    eventsSources
      .filter((source) =>
        anySourceHasOnly ? "only" in source && source.only : true,
      )
      .filter((source) =>
        !anySourceHasOnly ? !("skip" in source) || !source.skip : true,
      )
      .map((source) => {
        if (!("loadEvents" in source)) return [];
        if (process.env.VERCEL) {
          console.time(
            `Loading events for source: ${source.name} ${source.calendarUrl} ${cotemporality}`,
          );
        }
        const events = source
          .loadEvents({ cotemporality, now })
          .then((events) =>
            events.map((e) => ({
              federation:
                "federation" in source
                  ? source.federation
                  : "federation" in e
                    ? e.federation
                    : undefined,
              ...e,
              source: source.name,
              sourceId: source.sourceId,
              sourceCalendarUrl: source.calendarUrl,
            })),
          );

        return events
          .catch((err) => {
            console.error(
              `Error loading events for source: ${source.name}`,
              err,
            );

            return [];
          })
          .finally(() => {
            if (process.env.VERCEL) {
              console.timeEnd(
                `Loading events for source: ${source.name} ${source.calendarUrl} ${cotemporality}`,
              );
            }
          });
      }),
  ).then((events) => events.flat());
};

export const getSortedEvents = async ({
  cotemporality,
}: {
  cotemporality: "past" | "future";
}) => {
  "use cache";
  const now =
    cotemporality === "past"
      ? new Date(startOfTomorrow({ in: tz("Europe/Copenhagen") }))
      : new Date(startOfYesterday({ in: tz("Europe/Copenhagen") }));

  const allEvents = await fetchEvents({ cotemporality });

  const sortedEvents = allEvents
    .map((e) => {
      let title =
        "summary" in e
          ? e.summary || null
          : "title" in e
            ? e.title
            : "name" in e
              ? e.name
              : "eventname_raw" in e
                ? e.eventname_raw
                : // ical events can actually omit the summary field, so we fall back to null if no title is found
                  (e satisfies never) && null;

      if (title) {
        for (const f of e.federation || []) {
          if (title.toLowerCase().includes(f.toLowerCase())) {
            title = title
              .replace(new RegExp(f, "i"), "")
              .trim()
              // Remove any leading hyphen after federation removal
              .replace(/^-/, "");
          }
        }

        title = title
          .replace(/–/g, "-")
          .replace(/DAO Graduering/i, "Dangraduering")
          .replace(/dan graduering/i, "Dangraduering")
          .replace(/dan-graduering/i, "Dangraduering")
          .replace(/sortbæltegradueringen/i, "Dangraduering")
          .replace("DANMARKSMESTERSKABERNE", "Danmarksmesterskaberne")
          .replace(/ - Holbæk/g, "")
          .replace(/^DM$/, "Danmarksmesterskaberne")
          .replace(/^DM /, "Danmarksmesterskaberne ")
          .replace(/ DM$/, " Danmarksmesterskaberne")
          .replace(/^Dansk/i, "")
          .replace(/^Børne/i, "")
          .replace("SAVE THE DATE", "")
          .trim()
          .replace(/^-/, "")
          .trim();
      }

      return {
        ...e,
        id: String(
          e.sourceId +
            "-" +
            ("uid" in e
              ? e.uid
              : "id" in e
                ? e.id
                : "fullUrl" in e
                  ? e.fullUrl
                  : "url" in e
                    ? e.url
                    : (e satisfies never)),
        ),
        url:
          "fullUrl" in e
            ? e.fullUrl
            : "url" in e
              ? e.url
              : "linkEvent" in e
                ? e.linkEvent
                : "entityId" in e && e.entityId
                  ? `https://kumitetechnology.com/en/tournament/${e.entityId}/`
                  : /*"origin_url" in e
                  ? e.origin_url
                  :*/ undefined,
        title,
        start:
          "structuredContent" in e
            ? new Date(e.structuredContent.startDate)
            : "start" in e
              ? isDate(e.start)
                ? e.start
                : isDate(e.start?.date)
                  ? e.start.date
                  : undefined
              : "date" in e
                ? new Date(e.date)
                : "start_time" in e
                  ? new Date(e.start_time * 1000)
                  : (e satisfies never),
        end:
          "structuredContent" in e
            ? new Date(e.structuredContent.endDate)
            : "end" in e
              ? isDate(e.end)
                ? e.end
                : e.end?.date
                  ? new Date(e.end.date)
                  : undefined
              : "end_time" in e
                ? new Date(e.end_time * 1000)
                : undefined,
        location:
          ("address" in e && typeof e.address === "object"
            ? e.address.fullAddress
            : "location" in e && typeof e.location === "object" && e.location
              ? [
                  e.location.addressTitle,
                  e.location.addressLine1,
                  e.location.addressLine2,
                  e.location.addressCountry,
                ]
                  .filter((s) => s.trim())
                  .join(", ")
              : "location" in e && typeof e.location === "string"
                ? e.location
                : "venue" in e
                  ? typeof e.venue === "string"
                    ? e.venue
                    : e.venue.full_address
                  : ""
          )
            .trim()
            .replace(/\s+/g, " ")
            .replace(/, ,/g, ",")
            .replace(/ ,/g, ",")
            .replace(/Denmark/gi, "Danmark")
            .replace("Copenhagen", "København")
            .replace("Roskilde Karateklub", "Roskilde Karate Klub")
            .replace(/^Danmark$/, "")
            .replace(/, Danmark/gi, "")
            .replace(/, DK/gi, "")
            .trim() || undefined,
      };
    })
    .filter((e): e is typeof e & { title: string } => Boolean(e.title))
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (e, i, l): e is (typeof l)[number] & { start: Date } => {
        if (!e.start) {
          console.warn("Event has no start date:", e);
          return false;
        }
        return (
          e.start &&
          (cotemporality === "past"
            ? e.start <= now
            : e.end
              ? e.end >= now
              : e.start >= now)
        );
      },
    )
    .filter(
      // roughly filter out training and internal club events for now
      (e) => {
        const title = e.title.toLowerCase();
        const location = (e.location || "").toLowerCase();
        return (
          !title.includes("træning") &&
          !title.includes("tilmelding") &&
          !title.includes("prøvetime") &&
          !title.includes("lukket") &&
          !title.includes("bestyrelsesmøde") &&
          !title.includes("bestyrelsemøde") &&
          !title.includes("instruktørmøde") &&
          !title.includes("assistentmøde") &&
          !title.includes("åben dojo") &&
          !title.includes("generalforsamling") &&
          !title.includes("chefinstruktørmøde") &&
          !title.includes("aspirantsamling") &&
          !title.includes("talent") &&
          !title.includes("julefrokost") &&
          !title.includes("juletræsfest") &&
          !title.includes("ferie") &&
          !title.includes("frivillig fredag") &&
          !title.includes("aflyst") &&
          !title.includes("klublejr") &&
          !title.includes("udskydes") &&
          !title.includes("placeholder") &&
          !title.includes("afslutning") &&
          !title.includes("rengøringsdojo") &&
          !title.includes("tekken") &&
          !title.includes("juleklip") &&
          !title.includes("julemiddag") &&
          !title.includes("fælles middag") &&
          !title.includes("nissecup") &&
          !title.includes("hygge") &&
          !title.includes("grill") &&
          !title.includes("gløgg") &&
          !title.includes("filmaften") &&
          !title.includes("fællesmøde") &&
          !title.includes("pizza og hygge") &&
          !title.includes("lalandia") &&
          !title.includes("kagami biraki") &&
          !title.includes("opstart") &&
          !title.includes("arbejdsdag") &&
          !title.includes("bestyrelsen") &&
          !title.includes("fastelavn") &&
          !title.includes("halloween") &&
          !title.includes("miniput") &&
          !title.includes("klubmesterskab") &&
          !title.includes("bjj") &&
          !title.includes("kr. himmelfartsdag") &&
          !title.includes("erstatningslokaler") &&
          !title.includes("store bededag") &&
          !title.includes("aflysning") &&
          !title.includes("bus til") &&
          !title.includes("gæsteinstruktør") &&
          !title.includes("førstehjælpskursus") &&
          !title.includes("kristi himmelfartsdag") &&
          !title.includes("latvia grand prix") &&
          !title.includes("arawaza cup") &&
          !title.includes("czech open") &&
          !title.includes("polish open") &&
          !title.includes("slovakia grand prix") &&
          !title.match(/^test$/i) &&
          !title.match(/^test /i) &&
          !title.includes("swedish karate open") &&
          !(
            (title.includes("graduering") || title.includes("gradering")) &&
            !title.includes("dangraduering") &&
            !title.includes("sortbæltegraduering") &&
            !title.includes("dan graduering")
          ) &&
          !location.includes("spanien") &&
          !location.includes("ungarn") &&
          !location.includes("finland") &&
          !location.includes("montesilvano") &&
          !location.includes("letland") &&
          !location.includes("tokyo") &&
          !location.includes("georgia") &&
          !location.includes("sverige") &&
          !location.includes("sweden") &&
          !location.includes("barcelona") &&
          !location.includes("united kingdom") &&
          !location.includes("slovakia") &&
          !location.includes("helsingborg") &&
          !location.includes("norway") &&
          !location.includes("malmø") &&
          !location.includes("tyskland") &&
          !location.includes("zoom")
        );
      },
    )
    .sort((a, b) =>
      cotemporality === "past"
        ? (b.start?.valueOf() ?? 0) - (a.start?.valueOf() ?? 0)
        : (a.start?.valueOf() ?? 0) - (b.start?.valueOf() ?? 0),
    )
    .sort((a, b) => {
      // sort by event hours
      const aLength = a.start
        ? (a.end || a.start).valueOf() - a.start.valueOf()
        : 0;
      const bLength = b.start
        ? (b.end || b.start).valueOf() - b.start.valueOf()
        : 0;
      return bLength - aLength;
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  const groupedEvents: [
    (typeof sortedEvents)[number],
    ...(typeof sortedEvents)[number][],
  ][] = [];

  for (const event of sortedEvents) {
    // if a similar event is already in groupedEvents, add this to the same group
    const existingGroup = groupedEvents.find((group) =>
      group.some(
        (e) =>
          fuseCompare(e.title, event.title) < 0.3 &&
          eventsAreCoinciding(e, event) &&
          (e.location && event.location
            ? fuseCompare(e.location, event.location) < 0.42
            : true),
      ),
    );

    if (existingGroup) {
      existingGroup.push(event);
    } else {
      groupedEvents.push([event]);
    }
  }

  const groupedEvents2 = groupedEvents
    .map((events) =>
      events
        .sort((a, b) =>
          cotemporality === "past"
            ? (b.start?.valueOf() ?? 0) - (a.start?.valueOf() ?? 0)
            : (a.start?.valueOf() ?? 0) - (b.start?.valueOf() ?? 0),
        )
        .sort((a, b) => {
          // sort by event hours
          const aLength =
            a.end && a.start ? a.end.valueOf() - a.start.valueOf() : 0;
          const bLength =
            b.end && b.start ? b.end.valueOf() - b.start.valueOf() : 0;
          return aLength - bLength;
        })
        .sort((a, b) => {
          // sort by event days
          const aDays =
            a.end && a.start
              ? Math.ceil(
                  (endOfDay(a.end, { in: tz("Europe/Copenhagen") }).valueOf() -
                    startOfDay(a.start, {
                      in: tz("Europe/Copenhagen"),
                    }).valueOf()) /
                    (1000 * 60 * 60 * 24),
                )
              : 0;
          const bDays =
            b.end && b.start
              ? Math.ceil(
                  (endOfDay(b.end, { in: tz("Europe/Copenhagen") }).valueOf() -
                    startOfDay(b.start, {
                      in: tz("Europe/Copenhagen"),
                    }).valueOf()) /
                    (1000 * 60 * 60 * 24),
                )
              : 0;

          return bDays - aDays;
        }),
    )
    .sort(([a], [b]) =>
      cotemporality === "past"
        ? (b.start?.valueOf() ?? 0) - (a.start?.valueOf() ?? 0)
        : (a.start?.valueOf() ?? 0) - (b.start?.valueOf() ?? 0),
    );

  // console.log(groupedEvents2.map((group) => group.map((e) => e.title)));

  return groupedEvents2;
};
