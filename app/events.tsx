/* eslint-disable @typescript-eslint/no-namespace */
import { TZDate } from "@date-fns/tz/date";
import * as cheerio from "cheerio";
import { endOfDay, isDate, startOfDay } from "date-fns";
import Fuse from "fuse.js";
import { convertIcsCalendar } from "ts-ics";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type HajimeMeta = {
  _h_source: string;
  _h_url: string;
};
namespace SquareSpace {
  export interface GetItemsByMonthEvent {
    recordType: number;
    structuredContent: StructuredContent;
    addedOn: number;
    title: string;
    fullUrl: string;
    assetUrl: string;
    excerpt: string;
    location: Location;
    systemDataId?: string;
    originalSize?: string;
  }

  export interface Location {
    addressTitle: string;
    addressLine1: string;
    addressLine2: string;
    addressCountry: AddressCountry;
  }

  export enum AddressCountry {
    Denmark = "Denmark",
    Empty = "",
    Letland = "Letland",
    Polen = "Polen",
    Svendborg = "Svendborg",
  }

  export interface StructuredContent {
    startDate: Date;
    endDate: Date;
  }
}
namespace KarateKlubbenKyokushinkai {
  export interface Event {
    id: number;
    title: string;
    start: Date;
    end: Date;
    description: string;
    color: string;
    backgroundColor: string;
    borderColor: string;
    calendarEventTimeID: number;
    hasInvites: boolean;
    classNames: ClassName[];
    location: string;
    meetingPlace: MeetingPlace;
    meetingHour: number;
    linkEvent: string;
    address: string;
    clubName: ClubName;
    startDate: string;
    startHour: string;
    endDate: string;
    endHour: string;
    allDay: boolean;
    isClosingDay: boolean;
  }

  export enum ClassName {
    KMCardX = "km-card-x",
  }

  export enum ClubName {
    KarateklubbenKyokushinkaiKøbenhavn = "Karateklubben Kyokushinkai København",
  }

  export enum MeetingPlace {
    Empty = "",
    LilleHoldsal = "Lille Holdsal",
  }
}

export interface FullCalendarEvent {
  id: number;
  start: Date;
  title: string;
  end: Date | null;
  color: string;
  event_type: number;
  allDay: boolean;
  tooltip: string;
}

export interface KumiteTechnologyEventsResponse {
  data: Data;
}

export interface Data {
  events: Events;
}

export interface Events {
  edges: Edge[];
}

export interface Edge {
  node: Node;
}

export interface Node {
  id: string;
  entityId: number;
  name: string;
  website: null | string;
  date: Date;
  type: Type;
  cover: null | string;
  isActivated: boolean;
  discipline: Discipline;
  address: Address;
}

export interface Address {
  fullAddress: string;
  countryCode: string;
  region: null | string;
  city: null | string;
  country: Country;
}

export interface Country {
  name: string;
  code: string;
}

export enum Discipline {
  Ashihara = "ASHIHARA",
  Kickboxing = "KICKBOXING",
  Kudo = "KUDO",
  Kyokushin = "KYOKUSHIN",
  Shotokan = "SHOTOKAN",
}

export enum Type {
  Tournament = "TOURNAMENT",
}

const fetchText = async (url: string) => (await fetch(url)).text();
const fetchJson = async <T,>(url: string) =>
  (await fetch(url)).json() as Promise<T>;
const fetchIcsCalendar = async (url: string) =>
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
const fetchIcsEvents = async (url: string) =>
  (await fetchIcsCalendar(url))?.events || [];
const fetch$ = async (url: string) => cheerio.load(await fetchText(url));

const eventsSources = [
  {
    name: "Dansk Karate Union",
    load: () =>
      fetchIcsEvents("https://kyokushin.dk/kalender/?ical=1&eventDisplay=past"),
  },
  {
    name: "Dansk Karate Union",
    load: () => fetchIcsEvents("https://kyokushin.dk/kalender/?ical=1"),
  },
  {
    name: "Karateklubben Kenzoku",
    load: () =>
      fetchIcsEvents(
        "https://calendar.google.com/calendar/ical/b418b06beb19586d457e0914c5faa192e5823a33120645206a58c61c8bac1565%40group.calendar.google.com/public/basic.ics",
      ),
  },
  {
    name: "Roskilde Karate Klub",
    load: () =>
      fetchIcsEvents(
        "https://calendar.google.com/calendar/ical/ph0n9gra71t3a81ksfjkhts7mc%40group.calendar.google.com/public/basic.ics",
      ),
  },
  {
    name: "Farum Kyokushin",
    load: async () => {
      const farumKyokushin$ = await fetch$(
        "https://farumkyokushin.dk/kalenderliste/",
      );
      return Promise.all(
        farumKyokushin$("[data-event_id]")
          .map((_, el) => farumKyokushin$(el).attr("data-event_id"))
          .toArray()
          .map((eventId) =>
            fetchIcsEvents(
              `https://farumkyokushin.dk/export-events/${eventId}_0/?key=c2ee1168ae`,
            ),
          ),
      ).then((events) => events.flat());
    },
  },
  {
    name: "Karateklubben Kyokushinkai København",
    load: () =>
      fetchJson<KarateKlubbenKyokushinkai.Event[]>(
        "https://karateklub.com/cms/include/api/calendarj.aspx?start=2007-03-01T00%3A00%3A00%2B01%3A00&end=2047-04-05T00%3A00%3A00%2B02%3A00&tag=",
      ).then((events) =>
        events.map((e) => ({
          ...e,
          linkEvent: new URL(
            e.linkEvent,
            "https://karateklub.com/cms/",
          ).toString(),
          start: new Date(e.start),
          end: new Date(e.end),
        })),
      ),
  },
  {
    name: "Karate-Do Gentofte",
    load: () =>
      fetchJson<KarateKlubbenKyokushinkai.Event[]>(
        "https://karate-do-gentofte.dk/cms/include/api/calendarj.aspx?start=2006-10-26T00%3A00%3A00%2B01%3A00&end=2046-12-07T00%3A00%3A00%2B01%3A00&tag=",
      ).then((events) =>
        events.map((e) => ({
          ...e,
          linkEvent: new URL(
            e.linkEvent,
            "https://karate-do-gentofte.dk/cms/",
          ).toString(),
          start: new Date(e.start),
          end: new Date(e.end),
        })),
      ),
  },
  {
    name: "Nivå Budoklub",
    load: () =>
      fetchJson<KarateKlubbenKyokushinkai.Event[]>(
        "https://nbudo.klub-modul.dk/cms/include/api/calendarj.aspx?start=2006-10-26T00%3A00%3A00%2B01%3A00&end=2046-12-07T00%3A00%3A00%2B01%3A00&tag=",
      ).then((events) =>
        events.map((e) => ({
          ...e,
          linkEvent: new URL(
            e.linkEvent,
            "https://nbudo.klub-modul.dk/cms/",
          ).toString(),
          start: new Date(e.start),
          end: new Date(e.end),
        })),
      ),
  },
  {
    name: "Shinryokudan - Nansensgade Karate",
    load: async () => {
      const shinryokudanSquarespaceCalendarStartDate = new Date(2022, 5);
      // iterate over every month from shinryokudanSquarespaceCalendarStartDate until three empty months are encountered
      let emptyMonths = 0;
      const currentMonth = new Date(shinryokudanSquarespaceCalendarStartDate);
      const shinryokudanEvents: SquareSpace.GetItemsByMonthEvent[] = [];
      while (emptyMonths < 3) {
        // fetch events for the current month
        const month = currentMonth.getMonth() + 1;
        const year = currentMonth.getFullYear();
        const url = `https://www.nansensgadekarate.dk/api/open/GetItemsByMonth?month=${month}-${year}&collectionId=628f69cd8b60603dfc865e80`;
        const events = await fetchJson<SquareSpace.GetItemsByMonthEvent[]>(url);
        if (events.length === 0) {
          emptyMonths++;
        } else {
          emptyMonths = 0;
          shinryokudanEvents.push(
            ...events.map((e) => ({
              ...e,
              fullUrl: new URL(
                e.fullUrl,
                "https://www.nansensgadekarate.dk",
              ).toString(),
              structuredContent: {
                ...e.structuredContent,
                startDate: new Date(e.structuredContent.startDate),
                endDate: new Date(e.structuredContent.endDate),
              },
            })),
          );
        }
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }
      return shinryokudanEvents;
    },
  },
  {
    name: "Amager Karateskole",
    load: async () => {
      const events = await fetchJson<FullCalendarEvent[]>(
        "https://www.amagerkarateskole.dk/klub/jinzen-do/activities?club_id=27671&content_id=703630&activity_types=null&start=2006-10-26T00%3A00%3A00&end=2046-12-07T00%3A00%3A00&timeZone=Europe%2FBerlin",
      );
      return events
        .filter((e) => e.event_type === 4)
        .map((e) => ({
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
            .eq(1)
            .text(),
        }));
    },
  },
  {
    name: "Ashihara Karate København",
    load: async () => {
      const events = await fetchJson<FullCalendarEvent[]>(
        "https://www.ak-kbh.dk/klub/ashihara-karate-kobenhavn/activities?club_id=43859&content_id=3764362&activity_types=null&start=2006-09-28T00%3A00%3A00&end=2046-11-09T00%3A00%3A00&timeZone=Europe%2FCopenhagen",
      );
      return events
        .filter((e) => e.event_type === 4)
        .map((e) => ({
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
            .eq(1)
            .text(),
        }));
    },
  },
  {
    name: "Taifu Karate Dojo",
    load: () =>
      fetchJson<FullCalendarEvent[]>(
        "https://www.taifu.dk/klub/taifu-karate-dojo/activities?club_id=26219&content_id=3697598&activity_types=null&start=2006-10-26T00%3A00%3A00&end=2046-12-07T00%3A00%3A00&timeZone=Europe%2FBerlin",
      ).then((events) =>
        events
          .filter((e) => e.event_type === 4)
          .map((e) => ({
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
              .eq(1)
              .text(),
          })),
      ),
  },
  {
    name: "Kumite Technology",
    load: async ({ cotemporality }: { cotemporality: "past" | "future" }) => {
      const response = await fetch("https://kumitetechnology.com/api/graphql", {
        headers: { "content-type": "application/json" },
        body: `{"query":"query Events {\\n  events(filter: {address: {countryCode: {_eq: \\"DK\\"}}}, futureEvents: ${cotemporality === "future" ? "true" : "false"} ) {\\n    edges {\\n      node {\\n        id\\n        entityId\\n        name\\n        website\\n        date\\n        type\\n        cover\\n        isActivated\\n        discipline\\n#        categories {          id          name        }\\n#        registration {          registrationStartDate          registrationEndDate        }\\n        address {\\n          fullAddress\\n          countryCode\\n          region\\n          city\\n          country {\\n            name\\n            code\\n          }\\n        }\\n      }\\n    }\\n  }\\n}","operationName":"Events"}`,
        method: "POST",
      }).then((r) => r.json() as Promise<KumiteTechnologyEventsResponse>);

      return response.data.events.edges.map((edge) => {
        const node = edge.node;
        const dateParts = (
          node.date as unknown as `${number}-${number}-${number}`
        )
          .split(/[-T:]/)
          .map(Number);
        return {
          ...node,
          date: new TZDate(
            dateParts[0],
            dateParts[1] - 1,
            dateParts[2],
            "Europe/Copenhagen",
          ),
        };
      });
    },
  },
] as const;

function isWithin24Hours(date1: Date, date2: Date) {
  const diff = Math.abs(date1.getTime() - date2.getTime());
  return diff <= 24 * 60 * 60 * 1000;
}

export const fetchEvents = async ({
  cotemporality,
}: {
  cotemporality: "past" | "future";
}) => {
  "use cache";

  return Promise.all(
    eventsSources.map((source) =>
      source
        .load({ cotemporality })
        .then((events) =>
          events.map((e) => ({ ...e, _h_source: source.name })),
        ),
    ),
  ).then((events) => events.flat());
};

export const getSortedEvents = async ({
  cotemporality,
}: {
  cotemporality: "past" | "future";
}) => {
  "use cache";

  const allEvents = await fetchEvents({ cotemporality });

  const sortedEvents = allEvents
    .map((e) => ({
      ...e,
      source: e._h_source,
      id: String(
        "uid" in e
          ? e.uid
          : "id" in e
            ? e.id
            : "fullUrl" in e
              ? e.fullUrl
              : (e satisfies never),
      ),
      url:
        "fullUrl" in e
          ? e.fullUrl
          : "url" in e
            ? e.url
            : "linkEvent" in e
              ? e.linkEvent
              : "website" in e && e.website
                ? e.website
                : undefined,
      title: ("summary" in e
        ? e.summary
        : "title" in e
          ? e.title
          : "name" in e
            ? e.name
            : (e satisfies never)
      ).trim(),
      description:
        "excerpt" in e
          ? e.excerpt || undefined
          : "description" in e
            ? e.description || undefined
            : undefined,
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
            : undefined,
      location:
        ("address" in e && typeof e.address === "object"
          ? e.address.fullAddress
          : "location" in e && typeof e.location === "object"
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
              : ""
        ).trim().replace(/\s+/g, " ") || undefined,
    }))
    .filter(
      (e) =>
        !e.start ||
        (cotemporality === "past"
          ? e.start <= new Date()
          : e.start >= new Date()),
    )
    .sort((b, a) =>
      cotemporality === "past"
        ? (a.start?.valueOf() ?? 0) - (b.start?.valueOf() ?? 0)
        : (b.start?.valueOf() ?? 0) - (a.start?.valueOf() ?? 0),
    )
    .filter(
      // roughly filter out training and internal club events for now
      (e) => {
        const title = e.title.toLowerCase();
        return (
          !title.includes("træning") &&
          !title.includes("lukket") &&
          !title.includes("bestyrelsesmøde") &&
          !title.includes("bestyrelsemøde") &&
          !title.includes("instruktørmøde") &&
          !title.includes("assistentmøde") &&
          !title.includes("åben dojo") &&
          !title.includes("generalforsamling") &&
          !title.includes("chefinstruktørmøde") &&
          !title.includes("aspirantsamling") &&
          !title.includes("julefrokost") &&
          !title.includes("juletræsfest") &&
          !title.includes("ferie") &&
          !title.includes("frivillig fredag") &&
          !title.includes("aflyst") &&
          !title.includes("udskydes") &&
          !title.includes("placeholder") &&
          !title.includes("afslutning") &&
          !title.includes("rengøringsdojo") &&
          !title.includes("juleklip") &&
          !title.includes("fællesmøde") &&
          !title.includes("kagami biraki") &&
          !title.includes("arbejdsdag") &&
          !title.includes("bestyrelsen") &&
          !title.includes("fastelavn") &&
          !title.includes("miniput") &&
          !title.includes("filmaften") &&
          !title.includes("klubmesterskab") &&
          !title.includes("kr. himmelfartsdag") &&
          !title.includes("pizza og hygge") &&
          !title.includes("erstatningslokaler") &&
          !title.includes("store bededag") &&
          !title.includes("aflysning") &&
          !title.includes("gæsteinstruktør") &&
          !title.includes("førstehjælpskursus") &&
          !(
            title.includes("graduering") &&
            !title.includes("dangraduering") &&
            !title.includes("sortbæltegraduering")
          )
        );
      },
    );

  const fuse = new Fuse(sortedEvents, {
    keys: ["title"],
    useExtendedSearch: true,
    includeScore: true,
    ignoreFieldNorm: true,
    threshold: 1,
    findAllMatches: true,
    ignoreLocation: true,
    minMatchCharLength: 1,
    location: 0,
    distance: 100,
    tokenMatch: "any",
  });

  const groupedEvents: [
    (typeof sortedEvents)[number],
    ...typeof sortedEvents,
  ][] = [];

  for (const event of sortedEvents.sort(
    (a, b) => b.title.length - a.title.length,
  )) {
    const similarEvents = fuse
      .search(
        event.title
          .replaceAll(/\d\d\d\d/g, "")
          .split(" - ")[0]
          .trim(),
      )
      .filter((result) =>
        result.item.start && event.start
          ? isWithin24Hours(result.item.start, event.start)
          : true,
      );

    // if a similar event is already in groupedEvents, add this to the same group
    const existingGroup = groupedEvents.find((group) =>
      group.some(
        (e) =>
          (e.start && event.start
            ? isWithin24Hours(e.start, event.start)
            : true) &&
          (similarEvents.some(
            (result) =>
              result.item === e &&
              (e.start && event.start
                ? isWithin24Hours(e.start, event.start)
                : true),
          ) ||
            e.title === event.title),
      ),
    );
    if (!event.start) console.warn("Event has no start date:", event);

    if (existingGroup) {
      existingGroup.push(event);
    } else {
      groupedEvents.push([event]);
    }
  }

  return groupedEvents
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
                  (endOfDay(a.end).valueOf() - startOfDay(a.start).valueOf()) /
                    (1000 * 60 * 60 * 24),
                )
              : 0;
          const bDays =
            b.end && b.start
              ? Math.ceil(
                  (endOfDay(b.end).valueOf() - startOfDay(b.start).valueOf()) /
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
};
