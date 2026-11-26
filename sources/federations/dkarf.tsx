import { tz } from "@date-fns/tz";
import { addMonths, addYears, endOfDay } from "date-fns";
import type { LoadParams, Mentoclub } from "../../sources/sourceTypes";
import {
  fetch$,
  fetchHoldsportEvents,
  fetchIcsEvents,
  fetchJson,
  fetchKlubModul,
} from "../../sources/sourceUtils";

export const dkarfSources = [
  {
    sourceId: "tokon-hjorring-karate",
    name: "TOKON Hjørring Karate",
    type: "club",
    federation: ["dkarf"],
    classesUrl: "https://tokon.mento.club/traening/traeningstider", // http://tokon.dk/
    // loadClasses: () => // should be possible its an html table
  },
  {
    sourceId: "ishoj-karate-klub",
    name: "Ishøj Karate Klub",
    type: "club",
    federation: ["dkarf"],
    classesUrl: "https://www.ishojkarateklub.dk/side.asp?ID=29822",
    calendarUrl: "https://www.ishojkarateklub.dk/calendar.asp", // klubnet
  },
  {
    sourceId: "struer-karate-klub",
    name: "Struer Karate Klub",
    type: "club",
    federation: ["dkarf"],
    classesUrl:
      "https://www.struerkarate.dk/index.php/klub-info/traeningstider",
    calendarUrl: "https://www.struerkarate.dk/index.php/kalender",
  },
  {
    sourceId: "bushi-karate-kalender",
    name: "Bushi Karate",
    type: "club",
    federation: ["dkarf"],
    calendarUrl: "https://www.bushi.dk/kalender--events/kalender",
    loadEvents: () =>
      fetchIcsEvents(
        "https://calendar.google.com/calendar/ical/890f871f68c1185a2c3eb0c2f7ce3c52fd4724be39afae0c1f2f5f598e051548%40group.calendar.google.com/public/basic.ics",
      ).then((events) =>
        events.filter((e) => !e.summary.includes("X-Mas Cup")),
      ),
  },
  {
    sourceId: "bushi-karate-events",
    name: "Bushi Karate",
    type: "club",
    federation: ["dkarf"],
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
    sourceId: "shobu-ippon-denmark",
    name: "Shobu Ippon Denmark",
    type: "club",
    federation: ["dkarf"],
    calendarUrl: "https://shobuippondanmark.dk/?post_type=tribe_events",
    loadEvents: ({ cotemporality }: LoadParams) =>
      fetchIcsEvents(
        `https://shobuippondanmark.dk/?post_type=tribe_events&eventDisplay=list${cotemporality === "past" ? "&tribe_event_display=past" : ""}&ical=1`,
      ),
  },
  {
    sourceId: "budokan-solrod",
    name: "Budokan Karate Solrød",
    federation: ["dkarf"],
    calendarUrl: "https://www.budokan-solrod.dk/events/",
    loadEvents: ({ cotemporality }: LoadParams) =>
      fetchIcsEvents(
        `https://www.budokan-solrod.dk/events/?post_type=tribe_events&eventDisplay=list${cotemporality === "past" ? "&tribe_event_display=past" : ""}&ical=1`,
      ),
  },
  {
    sourceId: "sportskarate-dk",
    name: "Sportskarate.dk",
    type: "club",
    federation: ["dkarf"],
    calendarUrl: "https://sportskarate.dk/cms/Activity.aspx",
    loadEvents: (loadParams: LoadParams) =>
      fetchKlubModul("https://sportskarate.dk/cms/", loadParams).then(
        (events) => events.filter((e) => !e?.title.includes("Bestilling")),
      ),
  },
  {
    sourceId: "karate-do-gentofte",
    name: "Karate-Do Gentofte",
    type: "club",
    federation: ["dkarf"],
    calendarUrl: "https://karate-do-gentofte.dk/cms/Activity.aspx",
    loadEvents: (loadParams: LoadParams) =>
      fetchKlubModul("https://karate-do-gentofte.dk/cms/", loadParams),
  },
  {
    sourceId: "gentofte-shotokan-karate-do-kai",
    name: "Gentofte Shotokan Karate-Do Kai",
    type: "club",
    federation: ["dkarf"],
    calendarUrl: "https://gentoftekarate.dk/cms/Activity.aspx",
    /* // They don't do public events, no reason to fetch them
    loadEvents: (loadParams: LoadParams) =>
      fetchKlubModul("https://gentoftekarate.dk/cms/", loadParams),
    */
  },
  {
    sourceId: "osterbro-shotokan-karate",
    name: "Østerbro Shotokan Karate",
    type: "club",
    federation: ["dkarf"],
    calendarUrl: "https://www.2100-shotokan.dk/calendar",
    classesUrl: "https://www.2100-shotokan.dk/information/traeningstider",
    // TODO: implement loadEvents for mentoclub getactivities pagination
  },
  {
    sourceId: "alleroed-karate-dojo",
    name: "Allerød Karate Dojo",
    type: "club",
    federation: ["dkarf"],
    calendarUrl: "https://www.akd.dk/traening/calendar",
    classesUrl: "https://www.akd.dk/traening/traeningstider-og-holdoversigt",
    // TODO: implement loadEvents for mentoclub getactivities pagination
  },
  {
    sourceId: "itosu-kai-karate-do-slagelse",
    name: "Itosu-Kai Karate-do Slagelse",
    type: "club",
    federation: ["dkarf"],
    calendarUrl: "https://slagelsekarate.dk/calendar",
    // TODO: implement loadEvents for mentoclub getactivities pagination
  },
  {
    sourceId: "bosatsu",
    name: "Bosatsu",
    type: "club",
    only: true,
    federation: ["dkarf"],
    calendarUrl: "https://www.bosatsu.dk/calendar",
    classesUrl: "https://www.bosatsu.dk/traeningstider",
    // TODO: implement loadEvents for mentoclub getactivities pagination
    loadEvents: async ({ cotemporality, now }: LoadParams) => {
      const baseUrl = "https://www.bosatsu.dk";

      const from = cotemporality === "future" ? now : new Date(2019, 0);
      const to = cotemporality === "past" ? now : addYears(now, 1);

      // mentoclub gettraining API only allows fetching ~2 months at a time, so
      // we need to split the request into multiple 2-month intervals if the range is larger than that.
      const intervals = [];
      let currentStart = from;
      while (currentStart < to) {
        const currentEnd = addMonths(currentStart, 2);
        intervals.push({ start: currentStart, end: currentEnd });
        currentStart = currentEnd;
      }

      const responses = (
        await Promise.all(
          intervals.map(({ start, end }) => {
            const gettrainingsUrl = new URL("/cms/gettrainings", baseUrl);
            gettrainingsUrl.searchParams.set("start", start.toISOString());
            gettrainingsUrl.searchParams.set("end", end.toISOString());

            return fetchJson<Mentoclub.GettrainingsTraining[]>(gettrainingsUrl);
          }),
        )
      )
        .flat()
        .map((training) => ({
          ...training,
          id: training.id + "-" + training.ident,
          start: new Date(training.start),
          end: new Date(training.end),
          url: training.ident
            ? new URL(`/event/${training.ident}`, baseUrl).toString()
            : undefined,
        }))
        .filter((training) => training.teamid === -1);

      return responses;
    },
  },
  {
    sourceId: "amager-karate-klub",
    name: "Amager Karate Klub",
    type: "club",
    federation: ["dkarf"],
    classesUrl: "https://www.amagerkarate.dk/memberportal/frontpage/page/10439",
    // ForeningLet website without a calendar
  },
  {
    sourceId: "gladsaxe-karate-klub",
    name: "Gladsaxe Karate Klub",
    type: "club",
    federation: ["dkarf"],
    calendarUrl: "https://gladsaxekarateklub.dk/cms/Activity.aspx",
    loadEvents: (loadParams: LoadParams) =>
      fetchKlubModul("https://gladsaxekarateklub.dk/cms/", loadParams).then(
        (events) =>
          events
            .map((e) => ({
              ...e,
              title: e.title.replace("GKC", "Gladsaxe Karate Cup"),
              location:
                [e.location, e.address].filter(Boolean).join(", ") ||
                (e.title.includes("Kalundborg")
                  ? "Kalundborg Gymnasium og HF, J. Hagemann-Petersens Allé 4, 4400 Kalundborg"
                  : "") ||
                null,
            }))
            .filter(
              (e) =>
                !e.title.includes("Weekendlejr") &&
                !e.title.includes("Team GKK"),
            ),
      ),
  },
  {
    sourceId: "taifu-karate-dojo",
    name: "Taifu Karate Dojo",
    type: "club",
    calendarUrl:
      "https://www.taifu.dk/klub/taifu-karate-dojo/sider/aktiviteter",
    federation: ["dkarf"],
    loadEvents: (loadParams: LoadParams) =>
      fetchHoldsportEvents(
        { clubId: 26219, contentId: 3697598 },
        loadParams,
      ).then((events) => events.filter((e) => e.event_type !== 2)),
  },
  {
    sourceId: "set-online-karate",
    name: "SET Online Karate",
    type: "platform",
    federation: ["dkarf"], // wkf really
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
    sourceId: "egedal-karate",
    name: "Egedal Karate",
    type: "club",
    federation: ["dkarf"],
    calendarUrl: "https://www.egedalkarate.dk/calendar.asp",
    // TODO: loadEvents: build KlubNet support  https://www.intra-kom.dk/klubnet/klubnetinfo.asp
  },
] as const;
