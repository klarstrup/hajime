/* eslint-disable @typescript-eslint/no-namespace */
import * as cheerio from "cheerio";
import { pick } from "next/dist/lib/pick";
import {
  convertIcsCalendar,
  type IcsEvent,
  type NonStandardValuesGeneric,
} from "ts-ics";

const icsSources = [
  {
    name: "Dansk Karate Union",
    url: "https://kyokushin.dk/kalender/?ical=1&eventDisplay=past",
  },
  {
    name: "Dansk Karate Union",
    url: "https://kyokushin.dk/kalender/?ical=1",
  },
  {
    name: "Karateklubben Kenzoku",
    url: "https://calendar.google.com/calendar/ical/b418b06beb19586d457e0914c5faa192e5823a33120645206a58c61c8bac1565%40group.calendar.google.com/public/basic.ics",
  },
  {
    name: "Roskilde Karate Klub",
    url: "https://calendar.google.com/calendar/ical/ph0n9gra71t3a81ksfjkhts7mc%40group.calendar.google.com/public/basic.ics",
  },
];

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

export default async function Home() {
  "use cache";

  const shinryokudanHtml = await fetch(
    "https://www.nansensgadekarate.dk/klubkalender",
  ).then((res) => res.text());
  const $ = cheerio.load(shinryokudanHtml);
  $(".eventlist-meta-export-ical").each((_, el) => {
    const icsUrl = $(el).attr("href");
    if (icsUrl) {
      icsSources.push({
        name: "Shinryokudan - Nansensgade Karate",
        url: new URL(icsUrl, "https://www.nansensgadekarate.dk/").toString(),
      });
    }
  });

  const icsEvents: (IcsEvent<NonStandardValuesGeneric> &
    HajimeMeta & {
      _h_url: string;
      _h_source: string;
    })[] = [];
  for (const { url: icsUrl, name: icsName } of icsSources) {
    const response = await fetch(icsUrl);
    const icsCalendarString = await response.text();
    const calendarParsed = convertIcsCalendar(undefined, icsCalendarString);
    if (calendarParsed.events)
      icsEvents.push(
        ...calendarParsed.events.map((e) => ({
          ...e,
          _h_url: icsUrl,
          _h_source: icsName,
        })),
      );
  }
  const karateklubEvents: (KarateKlubbenKyokushinkai.Event & HajimeMeta)[] = [];
  const kkUrl =
    "https://karateklub.com/cms/include/api/calendarj.aspx?start=2007-03-01T00%3A00%3A00%2B01%3A00&end=2047-04-05T00%3A00%3A00%2B02%3A00&tag=";
  for (const event of await fetch(kkUrl).then<
    KarateKlubbenKyokushinkai.Event[]
  >((res) => res.json())) {
    karateklubEvents.push({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end),
      _h_source: "Karateklubben Kyokushinkai København",
      _h_url: kkUrl,
    });
  }

  const shinryokudanSquarespaceCalendarStartDate = new Date(2022, 5);
  // iterate over every month from shinryokudanSquarespaceCalendarStartDate until three empty months are encountered
  let emptyMonths = 0;
  const currentMonth = new Date(shinryokudanSquarespaceCalendarStartDate);
  const shinryokudanEvents: (SquareSpace.GetItemsByMonthEvent & HajimeMeta)[] =
    [];
  while (emptyMonths < 3) {
    // fetch events for the current month
    const month = currentMonth.getMonth() + 1;
    const year = currentMonth.getFullYear();
    const url = `https://www.nansensgadekarate.dk/api/open/GetItemsByMonth?month=${month}-${year}&collectionId=628f69cd8b60603dfc865e80`;
    const response = await fetch(url);
    const events: SquareSpace.GetItemsByMonthEvent[] = await response.json();
    if (events.length === 0) {
      emptyMonths++;
    } else {
      emptyMonths = 0;
      shinryokudanEvents.push(
        ...events.map((e) => ({
          ...e,
          structuredContent: {
            ...e.structuredContent,
            startDate: new Date(e.structuredContent.startDate),
            endDate: new Date(e.structuredContent.endDate),
          },
          _h_source: "Shinryokudan - Nansensgade Karate",
          _h_url: url,
        })),
      );
    }
    currentMonth.setMonth(currentMonth.getMonth() + 1);
  }

  const allEvents = [...icsEvents, ...karateklubEvents, ...shinryokudanEvents];

  return (
    <pre>
      {JSON.stringify(
        allEvents
          .map((e) => ({
            ...e,
            title: "summary" in e ? e.summary : e.title,
            description:
              "excerpt" in e
                ? e.excerpt || undefined
                : e.description || undefined,
            start:
              "structuredContent" in e && e.structuredContent.startDate
                ? new Date(e.structuredContent.startDate)
                : "start" in e
                  ? e.start instanceof Date
                    ? e.start
                    : e.start?.date
                      ? new Date(e.start?.date ?? 0)
                      : undefined
                  : undefined,
            end:
              "structuredContent" in e && e.structuredContent.endDate
                ? new Date(e.structuredContent.endDate)
                : "end" in e
                  ? e.end instanceof Date
                    ? e.end
                    : e.end?.date
                      ? new Date(e.end?.date ?? 0)
                      : undefined
                  : undefined,
            location:
              (typeof e.location === "object"
                ? [
                    e.location.addressTitle,
                    e.location.addressLine1,
                    e.location.addressLine2,
                    e.location.addressCountry,
                  ]
                    .filter((s) => s.trim())
                    .join(", ")
                : e.location) || undefined,
          }))
          .sort((b, a) => (a.start?.valueOf() ?? 0) - (b.start?.valueOf() ?? 0))
          .map((e) =>
            pick(e, [
              "_h_source",
              "description",
              "title",
              "end",
              "start",
              "location",
            ]),
          )
          .map((e) => ({
            ...e,
          })),
        null,
        2,
      )}
    </pre>
  );
}
