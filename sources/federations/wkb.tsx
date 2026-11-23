import type { Weekday } from "rrule";
import { nlp } from "../../app/nlp";
import type { LoadParams } from "../sourceTypes";
import { fetch$, fetchIcsEvents, fetchKlubModul } from "../sourceUtils";
import {
  danishFullWeekdays,
  getAgeAndRankFromClassName,
  getNextStartAndEnd,
  getRRuleWeekdaysByFullDanishName,
  render,
  safeParseTimeRange,
  timeRangeRE2,
} from "../../utils";

export const wkbSources = [
  {
    sourceId: "bs-karate",
    name: "BS Karate",
    federation: "wkb",
    type: "club",
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
    classesUrl: "https://www.bskarate.dk/tider-og-priser/",
    async *loadClasses({ now }: { now: Date }) {
      const $res = await fetch$("https://www.bskarate.dk/tider-og-priser/");
      const times = $res("p,figcaption")
        .filter((_, el) => {
          const text = $res(el).text();
          return danishFullWeekdays.some((weekday) => text.includes(weekday));
        })
        .parent()
        .parent();

      times.find("br").replaceWith("\n");

      for (let i = 0; i < times.length; i++) {
        const holdLines = nlp
          .readDoc(
            render(times.eq(i))
              .replace(/(\d+)\./gi, "$1[DOT]")
              .replace(/(min)\. (\d+)/gi, "$1[DOT] $2")
              .replace(/(Kl)\. (\d+)/gi, "$1[DOT] $2"),
          )
          .sentences()
          .out()
          .flatMap((s) => s.replace(/\[DOT\]/g, ".").split(/\n/))
          // split [HH:MM]: [CLASS] strings into separate lines
          .flatMap((line) =>
            line.toLowerCase().startsWith("kl.")
              ? line
                  .split(timeRangeRE2)
                  .filter((s) => s && s.toLowerCase().trim() !== "kl.")
              : line,
          )
          .map((line) => line.trim().replace(/^: ?/, "").replace(/\.$/, ""));

        const superClassName = holdLines[0];
        let classNames: string[] = [];
        let timeRange: { start: Date; end: Date } | undefined = undefined;
        let weekdays: [Weekday, ...Weekday[]] | undefined = undefined;
        const lastLineIsClassName =
          holdLines[holdLines.length - 1] &&
          !getRRuleWeekdaysByFullDanishName(holdLines[holdLines.length - 1])
            ?.length &&
          !safeParseTimeRange(holdLines[holdLines.length - 1], now);
        for (const line of holdLines.slice(1)) {
          const isLastLine = line === holdLines[holdLines.length - 1];
          const newWeekdays = getRRuleWeekdaysByFullDanishName(line);
          const newTimeRange = safeParseTimeRange(line, now);
          if (newWeekdays) weekdays = newWeekdays;
          if (newTimeRange) timeRange = newTimeRange;
          if (!newWeekdays && !newTimeRange) classNames.push(line);

          if (
            weekdays &&
            timeRange &&
            (classNames.length > (lastLineIsClassName ? 1 : 0) || isLastLine)
          ) {
            for (const weekday of weekdays) {
              yield {
                className: [
                  superClassName,
                  ...(classNames?.slice(lastLineIsClassName ? 1 : 0) ?? []),
                ]
                  .filter(Boolean)
                  .join(": "),
                ...getNextStartAndEnd(timeRange, weekday, now),
                ...getAgeAndRankFromClassName(
                  [superClassName, ...(classNames ?? [])]
                    .filter(Boolean)
                    .join(" "),
                ),
              };
            }
            classNames = lastLineIsClassName
              ? [classNames[classNames.length - 2]]
              : [];
            timeRange = undefined;
          }
        }
      }
    },
  },
  {
    sourceId: "world-kyokushin-budokai-denmark",
    name: "World Kyokushin Budokai Denmark",
    type: "federation",
    federation: "wkb",
    calendarUrl: "https://kyokushin.org/begivenheder/",
  },
  {
    sourceId: "odense-kyokushin-karate",
    name: "Odense Kyokushin Karate",
    type: "club",
    federation: "wkb",
    classesUrl: "https://odensekarate.dk/traeningstider/",
  },
  {
    sourceId: "roskilde-karate-og-selvforsvar",
    name: "Roskilde Karate og Selvforsvar",
    type: "club",
    federation: "wkb",
    classesUrl: "https://rkos2020.wixsite.com/website/hold",
  },
  {
    sourceId: "niva-budoklub",
    name: "Nivå Budoklub",
    type: "club",
    federation: "wkb",
    calendarUrl: "https://nbudo.klub-modul.dk/cms/Activity.aspx",
    loadEvents: (loadParams: LoadParams) =>
      fetchKlubModul("https://nbudo.klub-modul.dk/cms/", loadParams),
  },
] as const;
