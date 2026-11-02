import { parseIcsCalendar } from "@ts-ics/schema-zod";
import { pick } from "next/dist/lib/pick";
import type { IcsCalendar, IcsEvent, NonStandardValuesGeneric } from "ts-ics";

const icsSources = [
  {
    name: "Dansk Karate Union",
    url: "https://kyokushin.dk/kalender/?ical=1&eventDisplay=past",
  },
  {
    name: "Karateklubben Kenzoku",
    url: "https://calendar.google.com/calendar/ical/b418b06beb19586d457e0914c5faa192e5823a33120645206a58c61c8bac1565%40group.calendar.google.com/public/basic.ics",
  },
] as const;

type HajimeMeta = {
  _h_source: string;
  _h_url: string;
};

// eslint-disable-next-line @typescript-eslint/no-namespace
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
  const icsEvents: (IcsEvent<NonStandardValuesGeneric> &
    HajimeMeta & {
      _h_url: string;
      _h_source: string;
    })[] = [];
  for (const { url: icsUrl, name: icsName } of icsSources) {
    const response = await fetch(icsUrl);
    const icsCalendarString = await response.text();
    const calendarParsed: IcsCalendar = parseIcsCalendar(icsCalendarString);
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

  const allEvents = [...icsEvents, ...karateklubEvents];

  return (
    <pre>
      {JSON.stringify(
        allEvents
          .map((e) => ({
            ...e,
            title: "summary" in e ? e.summary : e.title,
            start:
              e.start instanceof Date
                ? e.start
                : e.start?.date
                  ? new Date(e.start?.date ?? 0)
                  : undefined,
            end:
              e.end instanceof Date
                ? e.end
                : e.end?.date
                  ? new Date(e.end?.date ?? 0)
                  : undefined,
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
