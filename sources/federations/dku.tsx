import { nlp } from "../../app/nlp";
import {
  danishFullWeekdays,
  getAgeAndRankFromClassName,
  getRRuleWeekdaysByFullDanishName,
  render,
  safeParseTimeRange,
  timeRangeRE2,
} from "../../utils";
import type {
  AllEventsResponse,
  LoadParams,
  SquareSpace,
} from "../sourceTypes";
import {
  fetch$,
  fetchIcsEvents,
  fetchJson,
  fetchKlubModul,
  parseClassesSchedulesLines,
} from "../sourceUtils";

export const dkuSources = [
  {
    sourceId: "dansk-karate-union-facebook",
    name: "Dansk Karate Union",
    type: "federation",
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
    type: "federation",
    federation: "dku",
    calendarUrl: "https://kyokushin.dk/kalender/",
    loadEvents: ({ cotemporality }: { cotemporality: "past" | "future" }) =>
      fetchIcsEvents(
        `https://kyokushin.dk/kalender/?ical=1${cotemporality === "past" ? "&eventDisplay=past" : ""}`,
      ),
  },
  {
    sourceId: "kakushin-dojo",
    name: "Kakushin Dojo",
    type: "club",
    federation: "dku",
    classesUrl: "https://kakushin.dk/",
  },
  {
    sourceId: "ballerup-kyokushin-karate",
    name: "Ballerup Kyokushin Karate",
    type: "club",
    federation: "dku",
    classesUrl: "https://www.ballerupkyokushin.dk/programmer",
  },
  {
    sourceId: "enso-people-karate",
    name: "Ensō People Karate",
    type: "club",
    federation: "dku",
    classesUrl: "https://www.ensopeople.org/kopi-af-karate",
  },
  {
    sourceId: "kyokushin-karate-billund",
    name: "Kyokushin Karate Billund",
    type: "club",
    federation: "dku",
    classesUrl:
      "https://www.billund-if.dk/afdeling_karate/dk/schedule-location/",
  },
  {
    sourceId: "graasten-karate-klub",
    name: "Gråsten Karate Klub",
    type: "club",
    federation: "dku",
    classesUrl: "https://www.graastenkarateklub.dk/priser/",
    calendarUrl: "https://www.graastenkarateklub.dk/kalender/",
  },
  {
    sourceId: "aabenraa-karate-klub",
    name: "Aabenraa Karate Klub",
    type: "club",
    federation: "dku",
    classesUrl: "https://www.aabenraakarateklub.dk/traeningstider/",
    calendarUrl: "https://www.aabenraakarateklub.dk/aktiviteter/",
  },
  {
    sourceId: "aarhus-shinkyokushin-karate",
    name: "Aarhus Shinkyokushin Karate",
    type: "club",
    federation: "dku",
    classesUrl: "https://aarhusshinkyokushinkarate.dk/?page_id=1361",
  },
  {
    sourceId: "middelfart-karate-klub",
    name: "Middelfart Karate Klub",
    type: "club",
    federation: "dku",
    classesUrl: "https://middelfartkarate.dk/traeningstider/",
    calendarUrl: "https://middelfartkarate.dk/events/",
    // loadEvents: should be trivial
  },
  {
    sourceId: "svendborg-karateskole-kyokushinkai",
    name: "Svendborg Karateskole Kyokushinkai",
    type: "club",
    federation: "dku",
    classesUrl: "https://svendborg-karateskole.dk/#tider",
  },
  {
    sourceId: "karateklubben-kenzoku",
    name: "Karateklubben Kenzoku",
    type: "club",
    federation: "dku",
    calendarUrl: "https://kenzoku-karate.dk/kalender",
    loadEvents: () =>
      fetchIcsEvents(
        "https://calendar.google.com/calendar/ical/b418b06beb19586d457e0914c5faa192e5823a33120645206a58c61c8bac1565%40group.calendar.google.com/public/basic.ics",
      ),
    classesUrl: "https://kenzoku-karate.dk/hold",
    async *loadClasses({ now }: { now: Date }) {
      const $res = await fetch$("https://kenzoku-karate.dk/hold");
      const times = $res(".contentgroup__text-wrapper:nth(2)")
        .parent()
        .parent()
        .parent()
        .parent()
        .parent()
        .parent()
        .find(".contentgroup__text-wrapper");
      times.find("br").replaceWith("\n");

      for (let i = 0; i < times.length; i++) {
        const holdLines = render(times.eq(i)).split("\n");

        const className = holdLines[0];
        yield* parseClassesSchedulesLines(
          holdLines.slice(1),
          now,
          {
            className: () => className,
            ageRange: (line) => {
              const lineAgeRange = getAgeAndRankFromClassName(line).ageRange;

              return lineAgeRange.min !== null || lineAgeRange.max !== null
                ? lineAgeRange
                : null;
            },
          },
          { ageRange: getAgeAndRankFromClassName(className).ageRange },
        );
      }
    },
  },
  {
    sourceId: "roskilde-karate-klub-facebook",
    name: "Roskilde Karate Klub",
    type: "club",
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
  },
  {
    sourceId: "roskilde-karate-klub",
    name: "Roskilde Karate Klub",
    type: "club",
    federation: "dku",
    calendarUrl: "https://roskildekarateklub.dk/events",
    loadEvents: () =>
      fetchIcsEvents(
        "https://calendar.google.com/calendar/ical/ph0n9gra71t3a81ksfjkhts7mc%40group.calendar.google.com/public/basic.ics",
      ),
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

      for (const [superHold, lines] of holdLines) {
        yield* parseClassesSchedulesLines(
          lines,
          now,
          undefined,
          undefined,
          (className) => superHold + ", " + className,
        );
      }
    },
  },
  {
    sourceId: "farum-kyokushin",
    name: "Farum Kyokushin",
    type: "club",
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

      // The lines can be weekday names, time range of day, class name and instructors. In that order. Assemble them into structured data.
      yield* parseClassesSchedulesLines(holdLines, now);
    },
  },
  {
    sourceId: "karateklubben-kyokushinkai-kobenhavn",
    name: "Karateklubben Kyokushinkai København",
    type: "club",
    federation: "dku",
    calendarUrl: "https://karateklub.com/cms/Activity.aspx",
    loadEvents: (loadParams: LoadParams) =>
      fetchKlubModul("https://karateklub.com/cms/", loadParams),
  },
  {
    sourceId: "shinryokudan-nansensgade-karate",
    name: "Shinryokudan - Nansensgade Karate",
    type: "club",
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
        // split [HH:MM]: [CLASS] strings into separate lines
        .flatMap((line) => line.split(timeRangeRE2))
        .map((line) => line.trim().replace(/^: ?/, "").replace(/\.$/, ""))
        .filter(Boolean);

      yield* parseClassesSchedulesLines(
        holdLines.map((l) => l.replace("Kamphold torsdag", "Kamphold")),
        now,
        {
          className: (line, now, data) => {
            if (
              data.className ||
              !data.weekdays ||
              !data.timeRange ||
              safeParseTimeRange(line, now) ||
              getRRuleWeekdaysByFullDanishName(line)
            )
              return null;

            return line;
          },
          instructors: (line, now, data) => {
            if (
              !data.className ||
              data.className === line ||
              !data.weekdays ||
              !data.timeRange ||
              safeParseTimeRange(line, now) ||
              getRRuleWeekdaysByFullDanishName(line)
            )
              return null;

            return line.split(",").flatMap((s) => s.trim().split(" og "));
          },
        },
        undefined,
        undefined,
        (data) => {
          data.instructors = undefined;
          data.className = undefined;
        },
      );
    },
  },
  {
    sourceId: "frederiksberg-karateskole",
    name: "Frederiksberg Karateskole",
    type: "club",
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

      yield* parseClassesSchedulesLines(holdLines, now);
    },
  },
] as const;
