import { TZDate } from "@date-fns/tz";
import { nlp } from "../../app/nlp";
import { danishWeekDayRE, render, timeRangeRE2 } from "../../utils";
import type { LoadParams } from "../sourceTypes";
import {
  fetch$,
  fetchHoldsportEvents,
  fetchKlubModul,
  parseClassesSchedulesLines,
} from "../sourceUtils";

export const iogkfSources = [
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
    sourceId: "sax-karatecenter",
    name: "Sax-Karatecenter",
    federation: "iogkf",
    calendarUrl: "https://saxkarate.dk/cms/Activity.aspx",
    loadEvents: (loadParams: LoadParams) =>
      fetchKlubModul("https://saxkarate.dk/cms/", loadParams),
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
] as const;
