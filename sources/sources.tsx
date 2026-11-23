import { TZDate } from "@date-fns/tz";
import * as cheerio from "cheerio";
import type { Weekday } from "rrule";
import { nlp } from "../app/nlp";
import type {
  FightCollectiveEvent,
  KumiteTechnologyEventsResponse,
  LoadParams,
} from "../sources/sourceTypes";
import {
  fetch$,
  fetchHoldsportEvents,
  fetchIcsEvents,
  fetchJson,
  fetchKlubModul,
  parseClassesSchedulesLines,
} from "../sources/sourceUtils";
import {
  danishFullWeekdays,
  danishWeekDayRE,
  getAgeAndRankFromClassName,
  getNextStartAndEnd,
  getRRuleWeekdaysByFullDanishName,
  render,
  safeParseTimeRange,
  timeRangeRE2,
} from "../utils";
import { dkarfSources } from "./federations/dkarf";
import { dkuSources } from "./federations/dku";

export const eventsSources = (
  [
    {
      sourceId: "risskov-karate-skole",
      name: "Risskov Karate Skole",
      type: "club",
      federation: "iogkf",
      classesUrl: "https://risskovkarateskole.dk/",
      async *loadClasses({ now }: { now: Date }) {
        const $res = await fetch$("https://risskovkarateskole.dk/");
        const times = $res(".fl-accordion-content").filter((_, el) =>
          danishWeekDayRE.test(render($res(el))),
        );
        times.find("br").replaceWith("\n");

        const holdLines = nlp
          .readDoc(
            render(times)
              .replace(/(\d+)\./gi, "$1[DOT]")
              .replace(/(min)\. (\d+)/gi, "$1[DOT] $2")
              .replace(/(Kl)\. (\d+)/gi, "$1[DOT] $2"),
          )
          .sentences()
          .out()
          // TODO: hopelessly optimistic, we should be able to parse the line in full
          .flatMap((line) => line.split("træner"))
          .flatMap((s) => s.replace(/\[DOT\]/g, ".").split(/\n/))
          // split [HH:MM]: [CLASS] strings into separate lines
          .flatMap((line) =>
            line.toLowerCase().startsWith("kl.")
              ? line
                  .split(timeRangeRE2)
                  .filter((s) => s && s.toLowerCase().trim() !== "kl.")
              : line,
          )
          .map((line) => line.trim().replace(/^: ?/, "").replace(/\.$/, ""))
          // TODO: brittle
          .slice(3);

        yield* parseClassesSchedulesLines(holdLines, now);
      },
    },
    {
      sourceId: "jundokan-kobenhavn",
      name: "Jundokan København",
      type: "club",
      federation: "ogkk",
      calendarUrl: "https://karatekbh.dk/events/",
      /* // Only classes, no events on their calendar
    loadEvents: () =>
      fetchIcsEvents(
        `https://calendar.google.com/calendar/ical/karatekbh%40gmail.com/public/basic.ics`,
      ),
    */
    },
    {
      sourceId: "praesto-karate-klub",
      name: "Præstø Karate Klub",
      type: "club",
      federation: "ogkk",
      calendarUrl: "https://praestoekarate.dk/begivenheder/",
      classesUrl: "https://praestoekarate.dk/traeningstider/",
      /* // Only classes, no events on their calendar
    loadEvents: () =>
      fetchIcsEvents(
        `https://calendar.google.com/calendar/ical/praestoekarateklub@gmail.com/public/basic.ics`,
      ),
    */
    },
    {
      sourceId: "skovbo-karate-klub",
      name: "Skovbo Karate Klub",
      type: "club",
      federation: "ogkk",
      classesUrl: "https://skovbokarate.dk/#hold",
    },
    {
      sourceId: "stevns-karate-klub",
      name: "Stevns Karateklub",
      type: "club",
      federation: "ogkk",
      calendarUrl: "https://stevnskarateklub.dk/?page_id=92",
      classesUrl: "https://stevnskarateklub.dk/?page_id=54",
    },
    {
      sourceId: "faxe-karate-klub",
      name: "Faxe Karate Klub",
      type: "club",
      federation: "ogkk",
      calendarUrl: "http://faxekarate.dk/?page_id=138",
      classesUrl: "http://faxekarate.dk/?page_id=167",
    },
    {
      sourceId: "broderup-karate-klub",
      name: "Brøderup Karate Klub",
      type: "club",
      federation: "ogkk",
      calendarUrl: "https://broederupkarate.dk/index.php/arrangementer/",
      classesUrl: "https://broederupkarate.dk/index.php/programs/",
    },
    {
      sourceId: "vester-hjermitslev-karate-klub",
      name: "Vester Hjermitslev Karate Klub",
      type: "club",
      federation: "ogkk",
      classesUrl: "https://vhjermitslev.dk/idraetsforening/kreaklubben/",
    },
    {
      sourceId: "karatestævner",
      name: "Karatestævner",
      type: "platform",
      calendarUrl: "https://xn--karatestvner-edb.dk/",
      loadEvents: () =>
        fetchIcsEvents(`https://karatestævner.dk/eksport/alle-alle.ics`),
    },
    {
      sourceId: "hadsund-karate-skole",
      name: "Hadsund Karate Skole",
      type: "club",
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
      type: "club",
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
      sourceId: "jeff-speakman-kenpo-5-0-himmerland",
      name: "Jeff Speakman’s Kenpo 5.0 - Himmerland",
      type: "club",
      federation: "jsmaf",
      classesUrl: "https://www.jeffspeakman.dk/2021/05/09/traeningstider/",
    },
    {
      sourceId: "egedal-karate",
      name: "Egedal Karate",
      type: "club",
      federation: "gkif",
      calendarUrl: "https://www.egedalkarate.dk/calendar.asp",
      // TODO: loadEvents: build KlubNet support  https://www.intra-kom.dk/klubnet/klubnetinfo.asp
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
    {
      sourceId: "amager-karateskole",
      name: "Amager Karateskole",
      type: "club",
      federation: "kwo-smo",
      calendarUrl:
        "https://www.amagerkarateskole.dk/klub/jinzen-do/sider/h1-style-text-align-center-kalender-h1",
      loadEvents: (loadParams: LoadParams) =>
        fetchHoldsportEvents(
          { clubId: 27671, contentId: 703630 },
          loadParams,
        ).then((events) =>
          events.filter((e) => e.event_type !== 2 && e.event_type !== 3),
        ),
    },
    {
      sourceId: "sax-karatecenter",
      name: "Sax-Karatecenter",
      federation: "iogkf",
      calendarUrl: "https://saxkarate.dk/cms/Activity.aspx",
      loadEvents: (loadParams: LoadParams) =>
        fetchKlubModul("https://saxkarate.dk/cms/", loadParams),
    },
    {
      sourceId: "tst-karate-skole",
      name: "TST Karate Skole",
      type: "club",
      federation: "dwk",
      calendarUrl:
        "https://www.tstkarateskole.dk/klub/tst-karate-skole/sider/h1-style-text-align-center-kalender-h1",
      loadEvents: (loadParams: LoadParams) =>
        fetchHoldsportEvents(
          { clubId: 19717, contentId: 709571 },
          loadParams,
        ).then((events) => events.filter((e) => e.event_type !== 2)),
    },
    {
      sourceId: "hvidovre-karateskole",
      name: "Hvidovre Karateskole",
      federation: "iogkf",
      calendarUrl:
        "https://www.holdsport.net/klub/hvidovre-karateskole/sider/kalender",
      loadEvents: (loadParams: LoadParams) =>
        fetchHoldsportEvents(
          { clubId: 20708, contentId: 468935 },
          loadParams,
        ).then((events) => events.filter((e) => e.event_type !== 2)),
    },
    {
      sourceId: "keikokan-karate-kobudo-ryu",
      name: "Keikokan Karate Kobudo Ryu",
      type: "club",
      calendarUrl:
        "https://www.keikokan.dk/klub/keikokan-karate-kobudo-ryu/sider/h1-style-text-align-center-kalender-h1",
      loadEvents: (loadParams: LoadParams) =>
        fetchHoldsportEvents(
          { clubId: 11214, contentId: 706501 },
          loadParams,
        ).then((events) => events.filter((e) => e.event_type !== 2)),
    },
    {
      sourceId: "gilleleje-karate",
      name: "Gilleleje Karate Klub",
      type: "club",
      federation: "jks",
      calendarUrl:
        "https://www.gilleleje-karate.dk/klub/gilleleje-karate-klub/sider/h1-style-text-align-center-kalender-h1",
      loadEvents: (loadParams: LoadParams) =>
        fetchHoldsportEvents(
          { clubId: 34372, contentId: 2921593 },
          loadParams,
        ).then((events) => events.filter((e) => e.event_type !== 148927)),
    },
    {
      sourceId: "ashihara-karate-kobenhavn",
      name: "Ashihara Karate København",
      type: "club",
      federation: "dao",
      calendarUrl:
        "https://www.ak-kbh.dk/klub/ashihara-karate-kobenhavn/sider/aktiviteter",
      loadEvents: (loadParams: LoadParams) =>
        fetchHoldsportEvents(
          { clubId: 43859, contentId: 3764362 },
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
      sourceId: "kumite-technology",
      name: "Kumite Technology",
      type: "platform",
      calendarUrl: "https://kumitetechnology.com/en/tournament/?countryCode=DK",
      loadEvents: async ({
        cotemporality,
      }: {
        cotemporality: "past" | "future";
      }) => {
        const response = await fetch(
          "https://kumitetechnology.com/api/graphql",
          {
            headers: { "content-type": "application/json" },
            body: `{"query":"query Events {\\n  events(filter: {address: {countryCode: {_eq: \\"DK\\"}}}, futureEvents: ${cotemporality === "future" ? "true" : "false"} ) {\\n    edges {\\n      node {\\n        id\\n        entityId\\n info        name\\n        website\\n        date\\n        type\\n        cover\\n        isActivated\\n        discipline\\n#        categories {          id          name        }\\n#        registration {          registrationStartDate          registrationEndDate        }\\n        address {\\n          fullAddress\\n          countryCode\\n          region\\n          city\\n          country {\\n            name\\n            code\\n          }\\n        }\\n      }\\n    }\\n  }\\n}","operationName":"Events"}`,
            method: "POST",
          },
        ).then((r) => r.json() as Promise<KumiteTechnologyEventsResponse>);

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
      type: "federation",
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
      type: "organization",
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
    ...dkuSources,
    ...dkarfSources,
  ] as const
).toSorted((a, b) => a.name.localeCompare(b.name));
