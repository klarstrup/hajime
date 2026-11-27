import { parseClassesSchedulesTree, renderToNestedLines } from "../../utils";
import type { LoadParams } from "../sourceTypes";
import { fetch$, fetchIcsEvents, fetchKlubModul } from "../sourceUtils";

export const wkbSources = [
  {
    sourceId: "bs-karate",
    name: "BS Karate",
    federation: ["wkb"],
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

      yield* parseClassesSchedulesTree(renderToNestedLines($res), now);
    },
  },
  {
    sourceId: "world-kyokushin-budokai-denmark",
    name: "World Kyokushin Budokai Denmark",
    type: "federation",
    federation: ["wkb"],
    calendarUrl: "https://kyokushin.org/begivenheder/",
  },
  {
    sourceId: "odense-kyokushin-karate",
    name: "Odense Kyokushin Karate",
    type: "club",
    federation: ["wkb"],
    classesUrl: "https://odensekarate.dk/traeningstider/",
  },
  {
    sourceId: "roskilde-karate-og-selvforsvar",
    name: "Roskilde Karate og Selvforsvar",
    type: "club",
    federation: ["wkb"],
    classesUrl: "https://rkos2020.wixsite.com/website/hold",
  },
  {
    sourceId: "niva-budoklub",
    name: "Nivå Budoklub",
    type: "club",
    federation: ["wkb", "dgi"],
    calendarUrl: "https://nbudo.klub-modul.dk/cms/Activity.aspx",
    loadEvents: (loadParams: LoadParams) =>
      fetchKlubModul("https://nbudo.klub-modul.dk/cms/", loadParams),
  },
  {
    sourceId: "aalborg-kyokushin-karate",
    name: "Aalborg Kyokushin Karate",
    type: "club",
    federation: ["wkb"],
    websiteUrl: "https://www.facebook.com/AalborgmixedKarate/",
    classesUrl:
      "https://www.facebook.com/AalborgmixedKarate/posts/pfbid02Twh2ARbcxFWPFm4jjAXvExk6ae51gcaJ1zu6G9KVUTXXWwiirVHDtAPdvvsU3JKvl",
  },
] as const;
