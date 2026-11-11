/* eslint-disable @typescript-eslint/no-namespace */
import { tz, TZDate } from "@date-fns/tz";
import * as cheerio from "cheerio";
import {
  areIntervalsOverlapping,
  endOfDay,
  isDate,
  startOfDay,
  startOfToday,
} from "date-fns";
import { isEqual } from "date-fns/fp/isEqual";
import type { Weekday } from "rrule";
import { convertIcsCalendar } from "ts-ics";
import { nlp } from "./nlp";
import {
  danishFullWeekdays,
  fuseCompare,
  getAgeAndRankFromClassName,
  getNextStartAndEnd,
  getRRuleWeekdayByFullDanishName,
  render,
  safeParseTimeRange,
} from "./utils";

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
    location: Location | null;
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

export interface HoldsportActivity {
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
  info: string;
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

const fetchText = async (url: string | URL) => (await fetch(url)).text();
const fetchJson = async <T,>(url: string | URL) =>
  (await fetch(url)).json() as Promise<T>;
const fetchIcsCalendar = async (url: string | URL) =>
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
const fetchIcsEvents = async (url: string | URL) =>
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

const fetchHoldsportEvents = async (
  {
    activitiesEndpointUrl,
    clubId,
    contentId,
  }: {
    activitiesEndpointUrl: string | URL;
    clubId: number;
    contentId: number;
  },
  { cotemporality, now }: LoadParams,
) => {
  const start = cotemporality === "past" ? farPast : now;
  const end = cotemporality === "future" ? farFuture : now;
  const eventsUrl = new URL(activitiesEndpointUrl);
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

const farPast = new Date(2010, 0, 1);
const farFuture = new Date(2030, 0, 1);

interface LoadParams {
  cotemporality: "past" | "future";
  now: Date | TZDate;
}

const eventsSources = [
  {
    sourceId: "dansk-karate-union-facebook",
    name: "Dansk Karate Union",
    federation: "dku",
    calendarUrl:
      "https://www.facebook.com/profile.php?id=100064868797020&sk=events",
    loadEvents: ({ cotemporality }: LoadParams) =>
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
    federation: "dku",
    calendarUrl: "https://kyokushin.dk/kalender/",
    loadEvents: ({ cotemporality }: { cotemporality: "past" | "future" }) =>
      fetchIcsEvents(
        `https://kyokushin.dk/kalender/?ical=1${cotemporality === "past" ? "&eventDisplay=past" : ""}`,
      ),
  },
  {
    sourceId: "karatestævner",
    name: "Karatestævner",
    calendarUrl: "https://xn--karatestvner-edb.dk/",
    loadEvents: () =>
      fetchIcsEvents(`https://karatestævner.dk/eksport/alle-alle.ics`),
  },
  {
    sourceId: "hadsund-karate-skole",
    name: "Hadsund Karate Skole",
    federation: "dao",
    calendarUrl: "https://ashiharahadsund.dk/kalender/",
    loadEvents: () =>
      fetchIcsEvents(
        `https://calendar.google.com/calendar/ical/ashiharakaratehadsund@gmail.com/public/basic.ics`,
      ).then((events) =>
        events.map((e) => {
          let summary = e.summary;
          let location = e.location;
          if (!location && e.summary?.includes("i Randers")) {
            location = "Randers Karate Skole";
            summary = summary.replace("i Randers", "").trim();
          }

          return { ...e, summary, location };
        }),
      ),
  },
  {
    sourceId: "ashihara-karate-sonderborg",
    name: "Ashihara Karate Sønderborg",
    federation: "dao",
    calendarUrl: "https://www.ashihara-sonderborg.dk/",
    loadEvents: () =>
      fetchIcsEvents(
        `https://calendar.google.com/calendar/ical/ashihara.karate.sonderborg%40gmail.com/public/basic.ics`,
      ).then((events) =>
        events.map((e) => {
          let summary = e.summary;
          let location = e.location;
          if (!location && e.summary?.includes("i Randers")) {
            location = "Randers Karate Skole";
            summary = summary.replace("i Randers", "").trim();
          }

          return { ...e, summary, location };
        }),
      ),
  },
  {
    sourceId: "bushi-karate",
    name: "Bushi Karate & Combat Sport",
    federation: "dkarf",
    calendarUrl: "https://www.bushi.dk/kalender--events/kalender",
    loadEvents: () =>
      fetchIcsEvents(
        "https://calendar.google.com/calendar/ical/890f871f68c1185a2c3eb0c2f7ce3c52fd4724be39afae0c1f2f5f598e051548%40group.calendar.google.com/public/basic.ics",
      ).then((events) =>
        events.filter((e) => !e.summary.includes("X-Mas Cup")),
      ),
  },
  {
    sourceId: "bushi-karate",
    name: "Bushi Karate & Combat Sport",
    federation: "dkarf",
    calendarUrl: "https://www.bushi.dk/kalender--events/events",
    loadEvents: async ({ cotemporality }: LoadParams) => {
      if (cotemporality === "past") return [];

      const bushi$ = await fetch$(
        "https://www.bushi.dk/kalender--events/events",
      );

      const events = bushi$("[data-event-card]")
        .map((_, el) => {
          const $el = bushi$(el);

          const startDateString =
            $el.find("time[datetime]").attr("datetime") || "";
          const startTimeString =
            $el.find(".time .from").text().trim() ||
            $el.find(".time").text().trim() ||
            "";

          const isAllDay =
            startTimeString === "All day" || startTimeString === "Hele dagen";

          const startDate = isAllDay
            ? new Date(`${startDateString}T00:00`)
            : new Date(`${startDateString}T${startTimeString}`);

          const endTimeString = $el.find(".time .to").text().trim() || "";

          const endDateDay = $el.find("time .to .day").text().trim() || "";
          const endDateMonthText = $el.find("time .to .month").text().trim();
          // map text month to number
          const months = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];
          const endDateMonth =
            (endDateMonthText &&
              (months.indexOf(endDateMonthText) + 1)
                .toString()
                .padStart(2, "0")) ||
            (startDate.getMonth() + 1).toString().padStart(2, "0");

          const endDateTimeString = `${startDateString
            .split("-")
            .map((part, index) =>
              index === 0
                ? part
                : index === 1 && endDateMonth
                  ? endDateMonth.padStart(2, "0")
                  : index === 2 && endDateDay
                    ? endDateDay.padStart(2, "0")
                    : part,
            )
            .join("-")}T${endTimeString}`;

          const endDate = isAllDay
            ? endOfDay(startDate, { in: tz("Europe/Copenhagen") })
            : new Date(endDateTimeString);

          return {
            title: $el.find("h2").text().trim(),
            url:
              `https://www.bushi.dk/${$el.find("a").attr("href")}` || undefined,
            start: startDate,
            end: endDate,
            location: $el.find(".location").text().trim() || undefined,
          };
        })
        .toArray()
        .filter((e) => !e.title.includes("X-Mas Cup"));

      return events;
    },
  },
  {
    sourceId: "bs-karate",
    name: "BS Karate",
    federation: "wkb",
    calendarUrl: "https://bskarate.dk/events/",
    loadEvents: ({ cotemporality }: LoadParams) =>
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
    federation: "dku",
    calendarUrl: "https://kenzoku-karate.dk/kalender",
    loadEvents: () =>
      fetchIcsEvents(
        "https://calendar.google.com/calendar/ical/b418b06beb19586d457e0914c5faa192e5823a33120645206a58c61c8bac1565%40group.calendar.google.com/public/basic.ics",
      ),
  },
  {
    sourceId: "roskilde-karate-klub-facebook",
    name: "Roskilde Karate Klub",
    federation: "dku",
    calendarUrl:
      "https://www.facebook.com/profile.php?id=100063654665814&sk=events",
    loadEvents: ({ cotemporality }: LoadParams) =>
      fetch("https://allevents.in/api/index.php/organizer/web/get_events", {
        body: `{"organizer_id":"20470410","past":${cotemporality === "future" ? 0 : 1},"count":99,"city":0,"past_events_filter":0}`,
        method: "POST",
      })
        .then((r) => r.json() as Promise<AllEventsResponse>)
        .then((data) => data.data),
    classesUrl: "https://roskildekarateklub.dk/hold-priser",
    async *loadClasses({ now }: { now: Date }) {
      const $res = await fetch$("https://roskildekarateklub.dk/hold-priser");

      let times = $res("p")
        .filter((_, el) => {
          const text = $res(el).text();
          return danishFullWeekdays.some((weekday) => text.includes(weekday));
        })
        .parent()
        .parent()
        .parent();

      times.find("br").replaceWith("\n");

      times = times.filter((i, e) => {
        const text = $res(e).text();
        for (let j = 0; j < i; j++)
          if ($res(times[j]).text() === text) return false;

        return true;
      });

      const holdLines = times
        .map(
          (_, el) =>
            [
              $res(el).parent().find("h2").text(),
              nlp
                .readDoc(render($res(el)).replace(/(\d+)\./g, "$1[DOT]"))
                .sentences()
                .out()
                .flatMap((s) => s.replace(/\[DOT\]/g, ".").split(/\.?\n/))
                .flatMap((line) => {
                  const lineHasWeekday = danishFullWeekdays.find((weekday) =>
                    line.includes(weekday),
                  );
                  if (!lineHasWeekday) return line;

                  return line
                    .split(new RegExp(lineHasWeekday + ":?"))
                    .flatMap((part, i, l) =>
                      i === 0 && l.length > 1 ? [lineHasWeekday, part] : part,
                    );
                })
                .filter((line) => line.trim())
                .map((line) => line.trim()),
            ] as const,
        )
        .toArray()
        .filter(Boolean)
        .reduce(
          (acc, item) => {
            if (typeof item === "string") {
              acc.push([item, []]);
            } else {
              acc[acc.length - 1][1].push(...item);
            }
            return acc;
          },
          [] as [string, string[]][],
        );

      let weekday: Weekday | undefined = undefined;
      let timeRange: { start: Date; end: Date } | undefined = undefined;
      let className: string | undefined = undefined;

      // The lines are class name, weekday names and time range of day. In that order. Assemble them into structured data.
      for (const [superHold, lines] of holdLines) {
        weekday = undefined;
        timeRange = undefined;
        className = undefined;
        for (const line of lines) {
          const newWeekday = getRRuleWeekdayByFullDanishName(line);
          const newTimeRange = safeParseTimeRange(line, now);
          // if it's not a time range or a weekday, it must be a class
          if (!newTimeRange && !newWeekday) {
            weekday = undefined;
            timeRange = undefined;
            className = superHold + ", " + line;
          }
          if (newWeekday) weekday = newWeekday;
          if (newTimeRange) timeRange = newTimeRange;

          if (weekday && timeRange && className) {
            const { rankRange, ageRange } =
              getAgeAndRankFromClassName(className);

            const { nextStart, nextEnd } = getNextStartAndEnd(
              timeRange,
              weekday,
            );
            if (!nextStart) continue;

            yield {
              className,
              nextStart,
              nextEnd,
              rankRange,
              ageRange,
            };
          }
        }
      }
    },
  },
  {
    sourceId: "roskilde-karate-klub",
    name: "Roskilde Karate Klub",
    federation: "dku",
    calendarUrl: "https://roskildekarateklub.dk/events",
    loadEvents: () =>
      fetchIcsEvents(
        "https://calendar.google.com/calendar/ical/ph0n9gra71t3a81ksfjkhts7mc%40group.calendar.google.com/public/basic.ics",
      ),
  },
  {
    sourceId: "shobu-ippon-denmark",
    name: "Shobu Ippon Denmark",
    federation: "dkarf",
    calendarUrl: "https://shobuippondanmark.dk/?post_type=tribe_events",
    loadEvents: ({ cotemporality }: LoadParams) =>
      fetchIcsEvents(
        `https://shobuippondanmark.dk/?post_type=tribe_events&eventDisplay=list${cotemporality === "past" ? "&tribe_event_display=past" : ""}&ical=1`,
      ),
  },
  {
    sourceId: "budokan-solrod",
    name: "Budokan Karate Solrød",
    federation: "dkarf",
    calendarUrl: "https://www.budokan-solrod.dk/events/",
    loadEvents: ({ cotemporality }: LoadParams) =>
      fetchIcsEvents(
        `https://www.budokan-solrod.dk/events/?post_type=tribe_events&eventDisplay=list${cotemporality === "past" ? "&tribe_event_display=past" : ""}&ical=1`,
      ),
  },
  {
    sourceId: "farum-kyokushin",
    name: "Farum Kyokushin",
    federation: "dku",
    calendarUrl: "https://farumkyokushin.dk/kalenderliste/",
    loadEvents: async () => {
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
    classesUrl: "https://farumkyokushin.dk/traeningstider/",
    async *loadClasses({ now }: { now: Date }) {
      const $res = await fetch$("https://farumkyokushin.dk/traeningstider/");

      $res(".av_one_half")
        .parent()
        .children()
        .each((_, el) => {
          if (!$res(el).hasClass("av_one_half")) $res(el).remove();
        });

      const times = $res(".av_one_half").parent();
      times.find("br").replaceWith("\n");

      const holdLines = nlp
        .readDoc(
          render(times)
            .replace(/(\d+)\./g, "$1[DOT]")
            .replace(/(min)\. (\d+)/g, "$1[DOT] $2"),
        )
        .sentences()
        .out()
        .flatMap((s) => s.replace(/\[DOT\]/g, ".").split(/\.?\n/))
        .flatMap((line) => line.split(/:/))
        .map((line) => line.trim());

      let weekday: Weekday | undefined = undefined;
      let timeRange: { start: Date; end: Date } | undefined = undefined;
      let className: string | undefined = undefined;

      // The lines can be weekday names, time range of day, class name and instructors. In that order. Assemble them into structured data.
      for (const line of holdLines) {
        const newWeekday = getRRuleWeekdayByFullDanishName(line);
        const newTimeRange = safeParseTimeRange(line, now);
        if (newWeekday) weekday = newWeekday;
        if (newTimeRange) timeRange = newTimeRange;

        // If the line is neither a weekday nor a time range, it's the name of the class
        if (!newWeekday && !newTimeRange) className = line;

        if (weekday && timeRange && className) {
          const { ageRange, rankRange } = getAgeAndRankFromClassName(className);

          const { nextStart, nextEnd } = getNextStartAndEnd(timeRange, weekday);
          if (!nextStart) continue;

          yield { nextStart, nextEnd, className, ageRange, rankRange };
          className = undefined;
        }
      }
    },
  },
  {
    sourceId: "sportskarate-dk",
    name: "Sportskarate.dk",
    federation: "dkarf",
    calendarUrl: "https://sportskarate.dk/cms/Activity.aspx",
    loadEvents: async ({ cotemporality, now }: LoadParams) => {
      const start = cotemporality === "past" ? farPast : now;
      const end = cotemporality === "future" ? farFuture : now;
      return fetchJson<KarateKlubbenKyokushinkai.Event[]>(
        `https://sportskarate.dk/cms/include/api/calendarj.aspx?start=${start.toISOString()}&end=${end.toISOString()}`,
      ).then((events) =>
        events
          .map((e) => ({
            ...e,
            location: [e.location, e.address].filter(Boolean).join(", "),
            linkEvent: e.linkEvent
              ? new URL(e.linkEvent, "https://sportskarate.dk/cms/").toString()
              : undefined,
            start: new Date(e.start),
            end: new Date(e.end),
          }))
          .filter((e) => !e?.title.includes("Bestilling")),
      );
    },
  },
  {
    sourceId: "karateklubben-kyokushinkai-kobenhavn",
    name: "Karateklubben Kyokushinkai København",
    federation: "dku",
    calendarUrl: "https://karateklub.com/cms/Activity.aspx",
    loadEvents: async ({ cotemporality, now }: LoadParams) => {
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
    federation: "dkarf",
    calendarUrl: "https://karate-do-gentofte.dk/cms/Activity.aspx",
    loadEvents: async ({ cotemporality, now }: LoadParams) => {
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
    sourceId: "gentofte-shotokan-karate-do-kai",
    name: "Gentofte Shotokan Karate-Do Kai",
    federation: "hdki",
    calendarUrl: "https://gentoftekarate.dk/cms/Activity.aspx",
    loadEvents: async ({ cotemporality, now }: LoadParams) => {
      const start = cotemporality === "past" ? farPast : now;
      const end = cotemporality === "future" ? farFuture : now;
      return []; // No public events on their calendar i think.
      return fetchJson<KarateKlubbenKyokushinkai.Event[]>(
        `https://gentoftekarate.dk/cms/include/api/calendarj.aspx?start=${start.toISOString()}&end=${end.toISOString()}`,
      ).then((events) =>
        events.map((e) => ({
          ...e,
          location: [e.location, e.address].filter(Boolean).join(", "),
          linkEvent: e.linkEvent
            ? new URL(e.linkEvent, "https://gentoftekarate.dk/cms/").toString()
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
    federation: "wkb",
    calendarUrl: "https://nbudo.klub-modul.dk/cms/Activity.aspx",
    loadEvents: async ({ cotemporality, now }: LoadParams) => {
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
    federation: "dkarf",
    calendarUrl: "https://gladsaxekarateklub.dk/cms/Activity.aspx",
    loadEvents: async ({ cotemporality, now }: LoadParams) => {
      const start = cotemporality === "past" ? farPast : now;
      const end = cotemporality === "future" ? farFuture : now;
      const events = await fetchJson<KarateKlubbenKyokushinkai.Event[]>(
        `https://gladsaxekarateklub.dk/cms/include/api/calendarj.aspx?start=${start.toISOString()}&end=${end.toISOString()}`,
      );
      return events
        .map((e) => ({
          ...e,
          title: e.title.replace("GKC", "Gladsaxe Karate Cup"),
          location:
            [e.location, e.address].filter(Boolean).join(", ") ||
            (e.title.includes("Kalundborg")
              ? "Kalundborg Gymnasium og HF, J. Hagemann-Petersens Allé 4, 4400 Kalundborg"
              : "") ||
            null,
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
    federation: "dku",
    calendarUrl: "https://www.nansensgadekarate.dk/klubkalender",
    loadEvents: async ({ cotemporality, now }: LoadParams) => {
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
              location: null,
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
    classesUrl: "https://www.nansensgadekarate.dk/traeningstider",
    async *loadClasses({ now }: { now: Date }) {
      const $res = await fetch$(
        "https://www.nansensgadekarate.dk/traeningstider",
      );

      const times = $res(".page-section")
        .filter((_, el) => $res(el).text().includes("Kamphold"))
        .eq(0);
      times.find("br").replaceWith("\n");

      const holdLines = nlp
        .readDoc(render(times).replace(/(\d+)\./g, "$1[DOT]"))
        .sentences()
        .out()
        .flatMap((s) => s.replace(/\[DOT\]/g, ".").split(/\.?\n/))
        .flatMap((line) => {
          const parts = line.split(/:/);
          if (parts.length == 4) {
            return [
              parts[0].trim() + ":" + parts[1].trim() + ":" + parts[2].trim(),
              parts[3]?.trim(),
            ];
          }
          return line;
        })
        .map((line) => line.trim());

      let weekday: Weekday | undefined = undefined;
      let timeRange: { start: Date; end: Date } | undefined = undefined;
      let className: string | undefined = undefined;
      let instructors: string[] | undefined = undefined;

      // The lines can be weekday names, time range of day, class name and instructors. In that order. Assemble them into structured data.
      for (const line of holdLines) {
        const newWeekday = getRRuleWeekdayByFullDanishName(line);
        const newTimeRange = safeParseTimeRange(line, now);
        if (newWeekday) weekday = newWeekday;
        if (newTimeRange) timeRange = newTimeRange;

        // If the line is neither a weekday nor a time range, it's the name of the class or the instructors
        if (!newWeekday && !newTimeRange && !className) {
          className = line;
        } else if (!newWeekday && !newTimeRange && className && !instructors) {
          instructors = line.split(",").flatMap((s) => s.trim().split(" og "));
        }

        if (weekday && timeRange && className && instructors) {
          const { ageRange, rankRange } = getAgeAndRankFromClassName(className);

          const { nextStart, nextEnd } = getNextStartAndEnd(timeRange, weekday);
          if (!nextStart) continue;

          yield {
            nextStart,
            nextEnd,
            className,
            ageRange,
            rankRange,
            instructors,
          };

          className = undefined;
          instructors = undefined;
        }
      }
    },
  },
  {
    sourceId: "amager-karateskole",
    name: "Amager Karateskole",
    federation: "kwo-smo",
    calendarUrl:
      "https://www.amagerkarateskole.dk/klub/jinzen-do/sider/h1-style-text-align-center-kalender-h1",
    loadEvents: (loadParams: LoadParams) =>
      fetchHoldsportEvents(
        {
          activitiesEndpointUrl:
            "https://www.amagerkarateskole.dk/klub/jinzen-do/activities",
          clubId: 27671,
          contentId: 703630,
        },
        loadParams,
      ).then((events) =>
        events.filter((e) => e.event_type !== 2 && e.event_type !== 3),
      ),
  },
  {
    sourceId: "gilleleje-karate",
    name: "Gilleleje Karate Klub",
    federation: "jks",
    calendarUrl:
      "https://www.gilleleje-karate.dk/klub/gilleleje-karate-klub/sider/h1-style-text-align-center-kalender-h1",
    loadEvents: (loadParams: LoadParams) =>
      fetchHoldsportEvents(
        {
          activitiesEndpointUrl:
            "https://www.gilleleje-karate.dk/klub/gilleleje-karate-klub/activities",
          clubId: 34372,
          contentId: 2921593,
        },
        loadParams,
      ).then((events) => events.filter((e) => e.event_type !== 148927)),
  },
  {
    sourceId: "ashihara-karate-kobenhavn",
    name: "Ashihara Karate København",
    federation: "dao",
    calendarUrl:
      "https://www.ak-kbh.dk/klub/ashihara-karate-kobenhavn/sider/aktiviteter",
    loadEvents: (loadParams: LoadParams) =>
      fetchHoldsportEvents(
        {
          activitiesEndpointUrl:
            "https://www.ak-kbh.dk/klub/ashihara-karate-kobenhavn/activities",
          clubId: 43859,
          contentId: 3764362,
        },
        loadParams,
      ).then((events) =>
        events
          .filter((e) => e.event_type !== 9)
          .map((e) => {
            let title = e.title;
            let location = e.location;
            if (!location && e.title.includes("Randers karateskole")) {
              location = "Randers Karate Skole";
              title = title.replace("Randers karateskole", "").trim();
            }
            if (!location && e.title.includes("i Randers")) {
              location = "Randers Karate Skole";
              title = title.replace("i Randers", "").trim();
            }

            return { ...e, title, location };
          }),
      ),
  },
  {
    sourceId: "taifu-karate-dojo",
    name: "Taifu Karate Dojo",
    calendarUrl:
      "https://www.taifu.dk/klub/taifu-karate-dojo/sider/aktiviteter",
    federation: "dkarf",
    loadEvents: (loadParams: LoadParams) =>
      fetchHoldsportEvents(
        {
          activitiesEndpointUrl:
            "https://www.taifu.dk/klub/taifu-karate-dojo/activities",
          clubId: 26219,
          contentId: 3697598,
        },
        loadParams,
      ).then((events) => events.filter((e) => e.event_type !== 2)),
  },
  {
    sourceId: "kumite-technology",
    name: "Kumite Technology",
    calendarUrl: "https://kumitetechnology.com/en/tournament/?countryCode=DK",
    loadEvents: async ({
      cotemporality,
    }: {
      cotemporality: "past" | "future";
    }) => {
      const response = await fetch("https://kumitetechnology.com/api/graphql", {
        headers: { "content-type": "application/json" },
        body: `{"query":"query Events {\\n  events(filter: {address: {countryCode: {_eq: \\"DK\\"}}}, futureEvents: ${cotemporality === "future" ? "true" : "false"} ) {\\n    edges {\\n      node {\\n        id\\n        entityId\\n info        name\\n        website\\n        date\\n        type\\n        cover\\n        isActivated\\n        discipline\\n#        categories {          id          name        }\\n#        registration {          registrationStartDate          registrationEndDate        }\\n        address {\\n          fullAddress\\n          countryCode\\n          region\\n          city\\n          country {\\n            name\\n            code\\n          }\\n        }\\n      }\\n    }\\n  }\\n}","operationName":"Events"}`,
        method: "POST",
      }).then((r) => r.json() as Promise<KumiteTechnologyEventsResponse>);

      return response.data.events.edges.map((edge) => {
        const node = edge.node;
        const dateParts = (
          node.date as unknown as `${number}-${number}-${number}`
        )
          .split(/[-T:]/)
          .map(Number);

        const extra: { federation?: string } = {};
        const info$ = node.info && cheerio.load(node.info);
        if (info$) {
          const infoText = info$.text();

          if (infoText.includes("alle er velkomne")) {
            extra.federation = "*";
          }
          if (infoText.includes("a tournament for everyone")) {
            extra.federation = "*";
          }
        }

        return {
          ...node,
          ...extra,
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
    federation: "iogkf",
    calendarUrl: "https://www.iogkf.dk/iogkf-events/",
    loadEvents: async () => {
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
    federation: "*",
    calendarUrl: "https://fightcollective.dk/events",
    loadEvents: async ({ cotemporality }: LoadParams) =>
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
  {
    sourceId: "set-online-karate",
    name: "SET Online Karate",
    federation: "dkarf", // wkf really
    calendarUrl:
      "https://www.sportdata.org/karate/set-online/calendar_main.php",
    loadEvents: () =>
      fetchIcsEvents(
        "https://www.google.com/calendar/ical/office@sportdata.org/public/basic.ics",
      ).then((events) =>
        events
          .filter((event) => event.location?.includes("DENMARK"))
          .map((e) => ({
            ...e,
            summary: e.summary?.replace(/, DENMARK$/, ""),
            url: e.description?.match(/https?:\/\/\S+/)?.[0] ?? undefined,
          })),
      ),
  },
  {
    sourceId: "frederiksberg-karateskole",
    name: "Frederiksberg Karateskole",
    federation: "dku",
    classesUrl: "https://www.frederiksbergkarateskole.dk/tr%C3%A6ningstider-0",
    async *loadClasses({ now }: { now: Date }) {
      const fk$ = (
        await fetch$(
          "https://www.frederiksbergkarateskole.dk/tr%C3%A6ningstider",
        )
      )("#main");
      fk$.find("h1").remove();

      const holdLines = nlp
        .readDoc(render(fk$).replace(/(\d+)\./g, "$1[DOT]"))
        .sentences()
        .out()
        .flatMap((s) => s.replace(/\[DOT\]/g, ".").split(/\.?\n/))
        .map((line) => line.trim().replace(/\:$/, ""));

      let weekday: Weekday | undefined = undefined;
      let className: string | undefined = undefined;
      let timeRange: { start: Date; end: Date } | undefined = undefined;
      // The lines can be weekday names, class name and time range of day. In that order. Assemble them into structured data.
      for (const line of holdLines) {
        const newWeekday = getRRuleWeekdayByFullDanishName(line);
        const newTimeRange = safeParseTimeRange(line, now);
        if (newWeekday) weekday = newWeekday;
        if (newTimeRange) timeRange = newTimeRange;

        // If the line is neither a weekday nor a time range, it's the name of the class
        if (!newWeekday && !newTimeRange) className = line;

        if (weekday && timeRange && className) {
          const { ageRange, rankRange } = getAgeAndRankFromClassName(className);

          const { nextStart, nextEnd } = getNextStartAndEnd(timeRange, weekday);
          if (!nextStart) continue;

          yield { nextStart, nextEnd, className, ageRange, rankRange };

          timeRange = undefined;
        }
      }
    },
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
  const now = new Date(startOfToday({ in: tz("Europe/Copenhagen") }));

  // For debugging
  const anySourceHasOnly = eventsSources.some(
    (source) => "only" in source && source.only,
  );

  return Promise.all(
    eventsSources
      .filter((source) =>
        "loadClasses" in source && anySourceHasOnly
          ? "only" in source && source.only
          : true,
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
                `Loading events for source: ${source.name} ${source.calendarUrl}`,
              );
            }
          });
      }),
  ).then((events) => events.flat());
};

export const getClasses = async () => {
  "use cache";

  const now = new Date(startOfToday({ in: tz("Europe/Copenhagen") }));

  const anySourceHasOnly = eventsSources.some(
    (source) => "only" in source && source.only,
  );

  return Promise.all(
    eventsSources
      .filter(
        (source) =>
          "loadClasses" in source &&
          (anySourceHasOnly ? "only" in source && source.only : true),
      )
      .flatMap(
        (source) =>
          "loadClasses" in source &&
          source.loadClasses &&
          Array.fromAsync(source.loadClasses({ now })).then((classes) =>
            classes.map((c) => ({
              ...c,
              source: source.name,
              classesUrl:
                "classesUrl" in source ? source.classesUrl : undefined,
              federation:
                "federation" in source ? source.federation : undefined,
            })),
          ),
      ),
  ).then((classes) => classes.flat().filter(Boolean));
};

export const getSortedEvents = async ({
  cotemporality,
}: {
  cotemporality: "past" | "future";
}) => {
  "use cache";
  const now = new Date(startOfToday({ in: tz("Europe/Copenhagen") }));

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
          (cotemporality === "past" ? e.start <= now : e.start >= now)
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
          !title.includes("tekken") &&
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
          !title.includes("klublejr") &&
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
          !title.includes("halloween") &&
          !title.includes("miniput") &&
          !title.includes("filmaften") &&
          !title.includes("klubmesterskab") &&
          !title.includes("bjj") &&
          !title.includes("kr. himmelfartsdag") &&
          !title.includes("pizza og hygge") &&
          !title.includes("erstatningslokaler") &&
          !title.includes("store bededag") &&
          !title.includes("aflysning") &&
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
