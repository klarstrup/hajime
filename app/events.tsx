/* eslint-disable @typescript-eslint/no-namespace */
import { tz, TZDate } from "@date-fns/tz";
import * as cheerio from "cheerio";
import {
  areIntervalsOverlapping,
  endOfDay,
  isDate,
  startOfDay,
} from "date-fns";
import { isEqual } from "date-fns/fp/isEqual";
import Fuse from "fuse.js";
import { convertIcsCalendar } from "ts-ics";
import { stringsOverlap } from "./utils";

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

export interface AllEventsResponse {
  error: number;
  message: string;
  request: Request;
  data: Datum[];
  count: number;
}

export interface Datum {
  event_id: string;
  eventname: string;
  eventname_raw: string;
  thumb_url: string;
  thumb_url_large: null;
  banner_url: string;
  start_time: number;
  start_time_display: string;
  end_time: number;
  end_time_display: string;
  location: string;
  venue: Venue;
  label: Label;
  event_url: string;
  share_url: string;
  origin_url: string;
  ticket_url: null | string;
  buy_ticket: number;
  categories: string[];
  tags: string[];
  rsvp_status: number;
  params: ParamsUnion;
  tickets: Tickets;
  organizer: Organizer;
  display_time_label: string;
  display_month: string;
  display_day: number;
  app_display_time: string;
  sort_time: number;
  id: null;
  timezone?: string;
  app_display_time_past?: string;
}

export enum Label {
  Empty = "",
  Upcoming = "Upcoming",
}

export interface Organizer {
  org_id: number;
  username: string;
  is_verified: number;
  name: string;
  org_review: OrgReview;
}

export interface OrgReview {
  rating: number;
  count: number;
}

export type ParamsUnion = unknown[] | ParamsClass | number;

export interface ParamsClass {
  total_interested_count?: number;
  x_categories?: string[];
  xscore_categories?: number[];
}

export interface Tickets {
  has_tickets: boolean;
  ticket_url: string;
}

export interface Venue {
  street: string;
  city: string;
  state: string;
  country: string;
  latitude: string;
  longitude: string;
  full_address: string;
}

export interface Request {
  organizer_id: string;
  past: number;
  count: number;
  city: number;
  past_events_filter: number;
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

export interface FightCollectiveEvent {
  id: string;
  name: string;
  subtitle: string;
  venue: string;
  date: string;
  time: string;
  address: string;
  registered_count: number;
  max_capacity: number;
  telegram_bot_link: null;
  telegram_community_link: null;
  is_active: boolean;
  created_at: Date;
  announcement_message_id: null | string;
  media_notification_message_id: null | string;
  event_type: string;
  price_dkk: number;
  description: string;
  format_bullets: string[];
  hero_photos: string[] | null;
  cta_label: null | string;
  cta_url: null | string;
  end_date: null;
  reserved_count: number;
  instructor: null | string;
  featured: boolean;
  post_signup_message: null;
  pay_mobilepay: null;
  pay_bank: null | string;
  recap_notes: null;
  content_thread_id: null | string;
  content_topic_link: null | string;
  content_file_count: number;
  content_announced_at: Date | null;
  slug: string;
  confirmed_count: number;
  waitlist_count: number;
  is_full?: boolean;
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
const fetch$ = async (url: string) => cheerio.load(await fetchText(url));

const farPast = new Date(0);
const farFuture = new Date(3333333333333);

interface LoadParams {
  cotemporality: "past" | "future";
  now: Date;
}

const eventsSources = [
  {
    sourceId: "danish-karate-union-facebook",
    name: "Danish Karate Union",
    calendarUrl:
      "https://www.facebook.com/profile.php?id=100064868797020&sk=events",
    load: ({ cotemporality }: LoadParams) =>
      fetch("https://allevents.in/api/index.php/organizer/web/get_events", {
        body: `{"organizer_id":"20980280","past":${cotemporality === "future" ? 0 : 1},"count":99,"city":0,"past_events_filter":0}`,
        method: "POST",
      })
        .then((r) => r.json() as Promise<AllEventsResponse>)
        .then((data) => data.data),
  },
  {
    sourceId: "dansk-karate-union",
    name: "Dansk Karate Union",
    calendarUrl: "https://kyokushin.dk/kalender/",
    load: ({ cotemporality }: { cotemporality: "past" | "future" }) =>
      fetchIcsEvents(
        `https://kyokushin.dk/kalender/?ical=1${cotemporality === "past" ? "&eventDisplay=past" : ""}`,
      ),
  },
  {
    sourceId: "bs-karate",
    name: "BS Karate",
    calendarUrl: "https://bs-karate.dk/kalender",
    load: ({ cotemporality }: LoadParams) =>
      fetchIcsEvents(
        `https://www.bskarate.dk/events/liste/?ical=1${cotemporality === "past" ? "&eventDisplay=past" : ""}`,
      ).then((events) =>
        events.map((e) => ({
          ...e,
          summary: e.summary.replace("Stævne i Helsingør", "Bushido Cup"),
        })),
      ),
  },
  {
    sourceId: "karateklubben-kenzoku",
    name: "Karateklubben Kenzoku",
    calendarUrl: "https://kenzoku-karate.dk/kalender",
    load: () =>
      fetchIcsEvents(
        "https://calendar.google.com/calendar/ical/b418b06beb19586d457e0914c5faa192e5823a33120645206a58c61c8bac1565%40group.calendar.google.com/public/basic.ics",
      ),
  },
  {
    sourceId: "roskilde-karate-klub-facebook",
    name: "Roskilde Karate Klub",
    calendarUrl:
      "https://www.facebook.com/profile.php?id=100063654665814&sk=events",
    load: ({ cotemporality }: LoadParams) =>
      fetch("https://allevents.in/api/index.php/organizer/web/get_events", {
        body: `{"organizer_id":"20470410","past":${cotemporality === "future" ? 0 : 1},"count":99,"city":0,"past_events_filter":0}`,
        method: "POST",
      })
        .then((r) => r.json() as Promise<AllEventsResponse>)
        .then((data) => data.data),
  },
  {
    sourceId: "roskilde-karate-klub",
    name: "Roskilde Karate Klub",
    calendarUrl: "https://roskildekarateklub.dk/events",
    load: () =>
      fetchIcsEvents(
        "https://calendar.google.com/calendar/ical/ph0n9gra71t3a81ksfjkhts7mc%40group.calendar.google.com/public/basic.ics",
      ),
  },
  {
    sourceId: "shobu-ippon-denmark",
    name: "Shobu Ippon Denmark",
    calendarUrl: "https://shobuippondanmark.dk/?post_type=tribe_events",
    load: ({ cotemporality }: LoadParams) =>
      fetchIcsEvents(
        `https://shobuippondanmark.dk/?post_type=tribe_events&eventDisplay=list${cotemporality === "past" ? "&tribe_event_display=past" : ""}&ical=1`,
      ),
  },
  {
    sourceId: "farum-kyokushin",
    name: "Farum Kyokushin",
    calendarUrl: "https://farumkyokushin.dk/kalenderliste/",
    load: async () => {
      const farumKyokushin$ = await fetch$(
        "https://farumkyokushin.dk/kalenderliste/",
      );
      return farumKyokushin$("[data-event_id]")
        .map((_, el) => {
          const timeString = farumKyokushin$(el).attr("data-time")!;
          const [start, end] = timeString
            .split("-")
            .map(Number)
            .map((n) => new Date(n * 1000));

          return {
            id: farumKyokushin$(el).attr("data-event_id"),
            start,
            end,
            title: farumKyokushin$(el).find(".evcal_event_title").text(),
            location: farumKyokushin$(el).find(".event_location_name").text(),
            url: farumKyokushin$(el).find("[itemprop='url']").attr("href"),
          };
        })
        .toArray();
    },
  },
  {
    sourceId: "karateklubben-kyokushinkai-kobenhavn",
    name: "Karateklubben Kyokushinkai København",
    calendarUrl: "https://karateklub.com/cms/Activity.aspx",
    load: async ({ cotemporality, now }: LoadParams) => {
      const start = cotemporality === "past" ? farPast : now;
      const end = cotemporality === "future" ? farFuture : now;
      return fetchJson<KarateKlubbenKyokushinkai.Event[]>(
        `https://karateklub.com/cms/include/api/calendarj.aspx?start=${start.toISOString()}&end=${end.toISOString()}`,
      ).then((events) =>
        events.map((e) => ({
          ...e,
          location: [e.location, e.address].filter(Boolean).join(", "),
          linkEvent: e.linkEvent
            ? new URL(e.linkEvent, "https://karateklub.com/cms/").toString()
            : undefined,
          start: new Date(e.start),
          end: new Date(e.end),
        })),
      );
    },
  },
  {
    sourceId: "karate-do-gentofte",
    name: "Karate-Do Gentofte",
    calendarUrl: "https://karate-do-gentofte.dk/cms/Activity.aspx",
    load: async ({ cotemporality, now }: LoadParams) => {
      const start = cotemporality === "past" ? farPast : now;
      const end = cotemporality === "future" ? farFuture : now;
      return fetchJson<KarateKlubbenKyokushinkai.Event[]>(
        `https://karate-do-gentofte.dk/cms/include/api/calendarj.aspx?start=${start.toISOString()}&end=${end.toISOString()}`,
      ).then((events) =>
        events.map((e) => ({
          ...e,
          location: [e.location, e.address].filter(Boolean).join(", "),
          linkEvent: e.linkEvent
            ? new URL(
                e.linkEvent,
                "https://karate-do-gentofte.dk/cms/",
              ).toString()
            : undefined,
          start: new Date(e.start),
          end: new Date(e.end),
        })),
      );
    },
  },
  {
    sourceId: "niva-budoklub",
    name: "Nivå Budoklub",
    calendarUrl: "https://nbudo.klub-modul.dk/cms/Activity.aspx",
    load: async ({ cotemporality, now }: LoadParams) => {
      const start = cotemporality === "past" ? farPast : now;
      const end = cotemporality === "future" ? farFuture : now;
      return fetchJson<KarateKlubbenKyokushinkai.Event[]>(
        `https://nbudo.klub-modul.dk/cms/include/api/calendarj.aspx?start=${start.toISOString()}&end=${end.toISOString()}`,
      ).then((events) =>
        events.map((e) => ({
          ...e,
          location: [e.location, e.address].filter(Boolean).join(", "),
          linkEvent: e.linkEvent
            ? new URL(
                e.linkEvent,
                "https://nbudo.klub-modul.dk/cms/",
              ).toString()
            : undefined,
          start: new Date(e.start),
          end: new Date(e.end),
        })),
      );
    },
  },
  {
    sourceId: "gladsaxe-karate-klub",
    name: "Gladsaxe Karate Klub",
    calendarUrl: "https://gladsaxekarateklub.dk/cms/Activity.aspx",
    load: async ({ cotemporality, now }: LoadParams) => {
      const start = cotemporality === "past" ? farPast : now;
      const end = cotemporality === "future" ? farFuture : now;
      const events = await fetchJson<KarateKlubbenKyokushinkai.Event[]>(
        `https://gladsaxekarateklub.dk/cms/include/api/calendarj.aspx?start=${start.toISOString()}&end=${end.toISOString()}`,
      );
      return events
        .map((e) => ({
          ...e,
          title: e.title.replace("GKC", "Gladsaxe Karate Cup"),
          location: [e.location, e.address].filter(Boolean).join(", "),
          start: new Date(e.start),
          end: new Date(e.end),
          linkEvent: e.linkEvent
            ? new URL(
                e.linkEvent,
                "https://gladsaxekarateklub.dk/cms/",
              ).toString()
            : undefined,
        }))
        .filter(
          (e) =>
            !e.title.includes("Weekendlejr") && !e.title.includes("Team GKK"),
        );
    },
  },
  {
    sourceId: "shinryokudan-nansensgade-karate",
    name: "Shinryokudan - Nansensgade Karate",
    calendarUrl: "https://www.nansensgadekarate.dk/klubkalender",
    load: async ({ cotemporality, now }: LoadParams) => {
      const shinryokudanSquarespaceCalendarStartDate = new Date(2022, 5);
      // iterate over every month from shinryokudanSquarespaceCalendarStartDate until three empty months are encountered
      let emptyMonths = 0;
      const currentMonth =
        cotemporality === "past"
          ? new Date(shinryokudanSquarespaceCalendarStartDate)
          : new Date(now);
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

        if (cotemporality === "past" && currentMonth < now) break;
      }
      return shinryokudanEvents;
    },
  },
  {
    sourceId: "amager-karateskole",
    name: "Amager Karateskole",
    calendarUrl:
      "https://www.amagerkarateskole.dk/klub/jinzen-do/sider/h1-style-text-align-center-kalender-h1",
    load: async ({ cotemporality, now }: LoadParams) => {
      const start = cotemporality === "past" ? farPast : now;
      const end = cotemporality === "future" ? farFuture : now;
      const events = await fetchJson<FullCalendarEvent[]>(
        `https://www.amagerkarateskole.dk/klub/jinzen-do/activities?club_id=27671&content_id=703630&activity_types=null&start=${start.toISOString()}&end=${end.toISOString()}&timeZone=Europe%2FBerlin`,
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
    sourceId: "ashihara-karate-kobenhavn",
    name: "Ashihara Karate København",
    calendarUrl:
      "https://www.ak-kbh.dk/klub/ashihara-karate-kobenhavn/sider/aktiviteter",
    load: async ({ cotemporality, now }: LoadParams) => {
      const start = cotemporality === "past" ? farPast : now;
      const end = cotemporality === "future" ? farFuture : now;
      const events = await fetchJson<FullCalendarEvent[]>(
        `https://www.ak-kbh.dk/klub/ashihara-karate-kobenhavn/activities?club_id=43859&content_id=3764362&activity_types=null&start=${start.toISOString()}&end=${end.toISOString()}&timeZone=Europe%2FCopenhagen`,
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
    sourceId: "taifu-karate-dojo",
    name: "Taifu Karate Dojo",
    calendarUrl:
      "https://www.taifu.dk/klub/taifu-karate-dojo/sider/aktiviteter",
    load: async ({ cotemporality, now }: LoadParams) => {
      const start = cotemporality === "past" ? farPast : now;
      const end = cotemporality === "future" ? farFuture : now;
      return fetchJson<FullCalendarEvent[]>(
        `https://www.taifu.dk/klub/taifu-karate-dojo/activities?club_id=26219&content_id=3697598&activity_types=null&start=${start.toISOString()}&end=${end.toISOString()}&timeZone=Europe%2FCopenhagen`,
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
      );
    },
  },
  {
    sourceId: "kumite-technology",
    name: "Kumite Technology",
    calendarUrl: "https://kumitetechnology.com/en/tournament/?countryCode=DK",
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
  {
    sourceId: "international-okinawan-goju-ryu-karate-do-federation-danmark",
    name: "International Okinawan Goju Ryu Karate-do Federation – Danmark",
    calendarUrl: "https://www.iogkf.dk/iogkf-events/",
    load: async () => {
      const $ = await fetch$("https://www.iogkf.dk/iogkf-events/");

      const events = $(".event_listing")
        .map((_, el) => {
          const dateString = $(el)
            .find(".wpem-event-date-time-text")
            .text()
            .replace(/\s+/g, " ")
            .trim();
          const [start, end] = dateString
            .split(" - ")
            .map((s) => s.split(/[-T:]/).map(Number))
            .map((parts) => new Date(parts[2], parts[1] - 1, parts[0])) as [
            TZDate,
            TZDate?,
          ];
          return {
            id: $(el).find(".wpem-event-action-url").attr("href")!.trim(),
            title: $(el).find(".wpem-event-title").text().trim(),
            start: new Date(start),
            end: end ? new Date(end) : undefined,
            location:
              $(el).find(".wpem-event-location-text").text().trim() ||
              undefined,
            url: $(el).find(".wpem-event-action-url").attr("href")!.trim(),
          };
        })
        .toArray();

      return events;
    },
  },
  {
    sourceId: "fight-collective",
    name: "Fight Collective",
    calendarUrl: "https://fightcollective.dk/events",
    load: async ({ cotemporality }: LoadParams) =>
      fetchJson<FightCollectiveEvent[]>(
        cotemporality === "future"
          ? "https://fight-collective-bot-production.up.railway.app/api/events"
          : "https://fight-collective-bot-production.up.railway.app/api/events/past",
      ).then((events) =>
        events.map((e) => {
          const [startTime, endTime] = e.time
            .split(" - ")
            .map((s) => s.split(":").map(Number) as [number, number?]);
          const [year, month, day] = e.date.split("-").map(Number);
          return {
            ...e,
            title: e.name,
            start: new Date(year, month - 1, day, startTime[0], startTime[1]),
            end: endTime
              ? new Date(year, month - 1, day, endTime[0], endTime[1])
              : undefined,
            url: `https://fightcollective.dk/events/${e.slug}`,
          };
        }),
      ),
  },
] as const;

function eventsAreCoinciding(
  event1: Awaited<ReturnType<typeof getSortedEvents>>[number][number],
  event2: Awaited<ReturnType<typeof getSortedEvents>>[number][number],
) {
  if (!event1.start) console.warn("Event 1 has no start date", event1);
  if (!event2.start) console.warn("Event 2 has no start date", event2);
  return areIntervalsOverlapping(
    {
      start: event1.start!,
      end:
        event1.end ?? endOfDay(event1.start!, { in: tz("Europe/Copenhagen") }),
    },
    {
      start: event2.start!,
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
  const now = new Date();

  return Promise.all(
    eventsSources.map((source) =>
      source.load({ cotemporality, now }).then((events) =>
        events.map((e) => ({
          ...e,
          source: source.name,
          sourceId: source.sourceId,
          sourceCalendarUrl: source.calendarUrl,
        })),
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
      id: String(
        e.sourceId +
          "-" +
          ("uid" in e
            ? e.uid
            : "id" in e
              ? e.id
              : "fullUrl" in e
                ? e.fullUrl
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
      title: ("summary" in e
        ? e.summary
        : "title" in e
          ? e.title
          : "name" in e
            ? e.name
            : "eventname_raw" in e
              ? e.eventname_raw
              : (e satisfies never)
      )
        // Align dashes
        .replace(/–/g, "-")
        .replace(/dan graduering/i, "Dangraduering")
        .replace(/dan-graduering/i, "Dangraduering")
        .replace(/sortbæltegradueringen/i, "Dangraduering")
        .replace(/^Dansk/i, "")
        .replace(/^Børne/i, "")
        .replace("SAVE THE DATE", "")
        .trim()
        .replace(/^-/, "")
        .trim(),
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
          .replace("Denmark", "Danmark")
          .replace("Copenhagen", "København")
          .replace("Roskilde Karateklub", "Roskilde Karate Klub")
          .replace(/^Danmark$/, "")
          .replace(", Danmark", "") || undefined,
    }))
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
            ? e.start <= new Date()
            : e.start >= new Date())
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
          !title.includes("prøvetimer") &&
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
          !title.includes("opstart") &&
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
          !title.includes("kristi himmelfartsdag") &&
          !(
            title.includes("graduering") &&
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
          !location.includes("barcelona") &&
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

  const fuse = new Fuse(sortedEvents, {
    keys: ["title", "location"],
    useExtendedSearch: true,
    includeScore: true,
    ignoreFieldNorm: true,
    threshold: 1,
    findAllMatches: true,
    ignoreLocation: true,
    minMatchCharLength: 1,
    location: 0,
    distance: 100,
    useTokenSearch: true,
    tokenMatch: "all",
  });

  const groupedEvents: [
    (typeof sortedEvents)[number],
    ...(typeof sortedEvents)[number][],
  ][] = [];

  for (const event of sortedEvents) {
    const similarEvents = fuse
      .search(event.title)
      .filter(
        (result) =>
          eventsAreCoinciding(result.item, event) &&
          (result.score !== undefined ? result.score < 0.5 : true),
      );

    // if a similar event is already in groupedEvents, add this to the same group
    const existingGroup = groupedEvents.find((group) =>
      group.some(
        (e) =>
          eventsAreCoinciding(e, event) &&
          (similarEvents.some((result) => result.item === e) ||
            stringsOverlap(e.title, event.title)),
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
