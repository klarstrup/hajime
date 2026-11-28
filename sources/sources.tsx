import { TZDate } from "@date-fns/tz";
import * as cheerio from "cheerio";
import { dkarfSources } from "./federations/dkarf";
import { dkuSources } from "./federations/dku";
import { iogkfSources } from "./federations/iogkf";
import { wkbSources } from "./federations/wkb";
import type {
  FightCollectiveEvent,
  KumiteTechnologyEventsResponse,
  LoadParams,
} from "./sourceTypes";
import {
  fetchClasses,
  fetchHoldsportEvents,
  fetchIcsEvents,
  fetchJson,
  fetchKlubModul,
} from "./sourceUtils";

export const eventsSources = (
  [
    {
      sourceId: "jundokan-danmark-ogkk-shibu",
      name: "Jundokan Danmark OGKK Shibu",
      type: "federation",
      federation: ["ogkk"],
      websiteUrl: "https://jundokan.dk/",
    },
    {
      sourceId: "jundokan-kobenhavn",
      name: "Jundokan København",
      type: "club",
      federation: ["ogkk", "dkarf"],
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
      federation: ["ogkk"],
      calendarUrl: "https://praestoekarate.dk/beg ivenheder/",
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
      federation: ["ogkk"],
      classesUrl: "https://skovbokarate.dk/#hold",
    },
    {
      sourceId: "stevns-karate-klub",
      name: "Stevns Karateklub",
      type: "club",
      federation: ["ogkk"],
      calendarUrl: "https://stevnskarateklub.dk/?page_id=92",
      classesUrl: "https://stevnskarateklub.dk/?page_id=54",
    },
    {
      sourceId: "faxe-karate-klub",
      name: "Faxe Karate Klub",
      type: "club",
      federation: ["ogkk"],
      calendarUrl: "http://faxekarate.dk/?page_id=138",
      classesUrl: "http://faxekarate.dk/?page_id=167",
    },
    {
      sourceId: "broderup-karate-klub",
      name: "Brøderup Karate Klub",
      type: "club",
      federation: ["ogkk"],
      calendarUrl: "https://broederupkarate.dk/index.php/arrangementer/",
      classesUrl: "https://broederupkarate.dk/index.php/programs/",
    },
    {
      sourceId: "vester-hjermitslev-karate-klub",
      name: "Vester Hjermitslev Karate Klub",
      type: "club",
      federation: ["ogkk"],
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
      federation: ["dao", "dif", "dai"],
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
      federation: ["dao"],
      classesUrl: "https://www.ashihara-sonderborg.dk/teams",
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
      sourceId: "jeff-speakman-kenpo-5-0-himmerland",
      name: "Jeff Speakman’s Kenpo 5.0 - Himmerland",
      type: "club",
      federation: ["jsmaf"],
      classesUrl: "https://www.jeffspeakman.dk/2021/05/09/traeningstider/",
    },
    {
      sourceId: "amager-karateskole",
      name: "Amager Karateskole",
      type: "club",
      federation: ["kwo-smo"],
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
      sourceId: "kyokushin-karate-nykobing-sjaelland",
      name: "Kyokushin Karate Nykøbing Sjælland",
      type: "club",
      federation: ["kwo-smo"],
      classesUrl: "https://kyokushin-karate.dk/cms/TeamOverviewAlt.aspx/",
    },
    {
      sourceId: "tst-karate-skole",
      name: "TST Karate Skole",
      type: "club",
      federation: ["dwk", "dkarf"],
      calendarUrl:
        "https://www.tstkarateskole.dk/klub/tst-karate-skole/sider/h1-style-text-align-center-kalender-h1",
      loadEvents: (loadParams: LoadParams) =>
        fetchHoldsportEvents(
          { clubId: 19717, contentId: 709571 },
          loadParams,
        ).then((events) => events.filter((e) => e.event_type !== 2)),
    },
    {
      sourceId: "hammel-karate-klub",
      name: "Hammel Karate Klub",
      zip: "8450",
      type: "club",
      federation: ["dwk"],
      websiteUrl: "https://hgfhammel.dk/karate/",
      calendarUrl: "https://hgfhammel.dk/karate/",
      loadEvents: () =>
        fetchIcsEvents(
          "https://calendar.google.com/calendar/ical/6a59a68fd34ed21d65dcd8e287f7ea0ac024dad0918733cc5a6a01a1d6b959d7%40group.calendar.google.com/public/basic.ics",
        ),
    },
    {
      sourceId: "rodovre-karateskole",
      name: "Rødovre Karateskole",
      zip: "2610",
      type: "club",
      federation: ["dwk"],
      websiteUrl: "https://www.roedovrekarateskole.dk/",
      classesUrl: "https://www.roedovrekarateskole.dk/tid-sted/",
      calendarUrl: "https://www.roedovrekarateskole.dk/aktiviteter/",
    },
    {
      sourceId: "arhus-karate-skole",
      name: "Århus Karate Skole",
      zip: "8200",
      type: "club",
      federation: ["dwk"],
      websiteUrl: "https://www.aarhus-karate-skole.dk/",
      classesUrl:
        "https://www.aarhus-karate-skole.dk/tr%C3%A6ning/hold%20og%20tider.html",
      calendarUrl: "https://www.aarhus-karate-skole.dk/Om%20os/kalender.html",
    },
    {
      sourceId: "silkeborg-karateklub",
      name: "Silkeborg Karateklub",
      zip: "8600",
      type: "club",
      federation: ["dwk"],
      websiteUrl: "https://www.silkeborgkarateklub.dk/silkeborg_karateklub/",
      classesUrl: "https://www.silkeborgkarateklub.dk/traeningstider/",
    },
    {
      sourceId: "keikokan-karate-kobudo-ryu",
      name: "Keikokan Karate Kobudo Ryu",
      federation: ["dgi"],
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
      sourceId: "jks-danmark",
      name: "Japan Karate Shoto Federation Danmark",
      type: "federation",
      federation: ["jks"],
      calendarUrl: "https://jkskarate.dk/index.php/kalender",
    },
    {
      sourceId: "shotokan-karate-akademi-jka",
      name: "Shotokan Karate Akademi JKA",
      zip: "2300",
      type: "club",
      federation: ["jka"],
      calendarUrl: "https://www.karate-akademi.dk/kalender/",
      classesUrl: "https://www.karate-akademi.dk/traeningstider/",
    },
    {
      sourceId: "helsingor-karate-do-kai",
      name: "Helsingør Karate-Do Kai",
      zip: "3000",
      type: "club",
      federation: ["jka", "dkarf"],
      websiteUrl: "https://www.helsingorkarate.dk/",
      calendarUrl: "https://www.helsingorkarate.dk/kalender",
    },
    {
      sourceId: "hokuto-kai",
      name: "Hokuto–Kai",
      zip: "2605",
      type: "club",
      federation: ["jka"],
      websiteUrl: "https://www.hokuto.dk/",
      calendarUrl: "https://www.hokuto-kai.dk/kalender",
      classesUrl: "https://www.hokuto.dk/#hold",
    },
    {
      sourceId: "nippon-karate-do-kai",
      name: "Nippon Karate-Do Kai",
      zip: "2720",
      type: "club",
      federation: ["jka"],
      websiteUrl: "https://www.nippon-karate.dk/",
      classesUrl: "https://www.nippon-karate.dk/index.php/traeningstider",
    },
    {
      sourceId: "ringsted-shotokan-karate-do-kai-jka",
      name: "Ringsted Shotokan Karate-Do Kai JKA",
      zip: "4100",
      type: "club",
      federation: ["jka"],
      websiteUrl: "https://www.ringstedshotokan-jka.dk/",
      classesUrl: "https://www.ringstedshotokan-jka.dk/traeningstider/",
    },
    {
      sourceId: "hillerod-karate-do-kai",
      name: "Hillerød Karate Do-Kai",
      zip: "3400",
      type: "club",
      federation: ["jka"],
      websiteUrl: "https://xn--hillerdkarate-gnb.dk/",
      // Klubmodul
      calendarUrl: "https://xn--hillerdkarate-gnb.dk/cms/activity.aspx",
      loadEvents: (loadParams: LoadParams) =>
        fetchKlubModul("https://xn--hillerdkarate-gnb.dk/cms", loadParams),
      classesUrl: "https://xn--hillerdkarate-gnb.dk/cms/TeamOverviewplan.aspx",
    },
    {
      sourceId: "odense-karate-do-ichiro-jka",
      name: "Odense Karate-Do Ichiro JKA",
      zip: "5000",
      type: "club",
      federation: ["jka"],
      websiteUrl: "https://www.odensesportscentrum.dk/klubber/karate",
      classesUrl:
        "https://www.odensesportscentrum.dk/klubber/karate#prov-gratis",
    },
    {
      sourceId: "mujin-kai-shotokan-karate-do-kai",
      name: "Mujin-kai Shotokan Karate-Do Kai",
      zip: "2000",
      type: "club",
      federation: ["jka"],
      websiteUrl: "https://www.mujin-kai.dk/",
      classesUrl: "https://mujin-kai.dk/traening/",
    },
    {
      sourceId: "shinken-karate-do-kai",
      name: "Shinken Karate-Do Kai",
      zip: "2400",
      type: "club",
      federation: ["jka"],
      websiteUrl: "https://www.shinken.dk/",
      calendarUrl: "https://www.shinken.dk/kalender/",
      classesUrl: "https://www.shinken.dk/shinken/traeningstider/",
    },
    {
      sourceId: "copenhagen-budo-academy",
      name: "Copenhagen Budo Academy",
      zip: "2400",
      type: "club",
      federation: ["jka"], //????
      websiteUrl: "https://budo-city.dk/",
      classesUrl: "https://budo-city.dk/",
    },
    {
      sourceId: "skanderborg-karate-akademi",
      name: "Skanderborg Karate Akademi",
      zip: "8660",
      type: "club",
      federation: ["jks", "dkarf"],
      websiteUrl: "https://www.skanderborgkarateakademi.dk/",
      calendarUrl: "https://www.skanderborgkarateakademi.dk/",
      loadEvents: (loadParams: LoadParams) =>
        fetchHoldsportEvents(
          { clubId: 51478, contentId: 5129561 },
          loadParams,
        ).then((events) => events.filter((e) => e.event_type === 4)),
    },
    {
      sourceId: "skanderborg-shotokan-karate",
      name: "Skanderborg Shotokan Karate",
      zip: "8660",
      type: "club",
      federation: ["skif", "dkarf"],
      websiteUrl: "https://skanderborgkarate.dk/",
    },
    {
      sourceId: "neko-ashi-dachi",
      name: "Neko Ashi Dachi",
      zip: "4340",
      type: "club",
      federation: ["jka"],
      websiteUrl: "https://undloesekickboxing.klub-modul.dk/default.aspx",
      calendarUrl: "https://undloese-sport.dk/cms/Activity.aspx",
      loadEvents: (loadParams: LoadParams) =>
        fetchKlubModul("https://undloese-sport.dk", loadParams),
      classesUrl:
        "https://undloesekickboxing.klub-modul.dk/cms/TeamEnrollmentalt.aspx?TeamNameID=41",
    },
    {
      sourceId: "karate-do-kyohan",
      name: "Karate-Do Kyohan",
      type: "club",
      federation: ["skif"],
      websiteUrl: "https://karatedokyohan.dk/",
      classesUrl: "https://karatedokyohan.dk/vores-hold",
    },
    {
      sourceId: "enso-shotokan-karate-dojo",
      name: "Enso Shotokan Karate Dojo",
      zip: "6261",
      type: "club",
      federation: ["jka"],
      websiteUrl: "https://www.facebook.com/profile.php?id=61571976262608",
      classesUrl:
        "https://www.facebook.com/permalink.php?story_fbid=pfbid0phd8Ed4AtedPhuiV8fsHFKywCC4i7cSgZaDvjQAxzNWM8GBPfF5WaH1qnCqkdBP1l&id=61571976262608",
    },
    {
      sourceId: "hoyo-karate-do-kai",
      name: "Hoyo Karate-Do Kai",
      zip: "8700",
      type: "club",
      federation: ["jka"],
      websiteUrl: "https://www.hoyokarate-horsens.dk/",
    },
    {
      sourceId: "gilleleje-karate",
      name: "Gilleleje Karate Klub",
      type: "club",
      federation: ["jks"],
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
      federation: ["dao", "dgi"],
      classesUrl:
        "https://www.ak-kbh.dk/klub/ashihara-karate-kobenhavn/sider/holdplan",
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
      sourceId: "ashihara-karate-aarhus",
      name: "Ashihara Karate Aarhus",
      zip: "8260",
      type: "club",
      federation: ["dao", "dif"],
      websiteUrl: "https://aarhus.ashihara.dk/",
      calendarUrl: "https://aarhus.ashihara.dk/kalender/",
      classesUrl: "https://aarhus.ashihara.dk/traening-og-hold/",
      loadClasses: async function* ({ now }: { now: Date }) {
        yield* await fetchClasses(
          "https://aarhus.ashihara.dk/traening-og-hold/",
          now,
        );
      },
    },
    {
      sourceId: "ashihara-karate-frederiksberg",
      name: "Ashihara Karate Frederiksberg",
      zip: "2000",
      type: "club",
      federation: ["dao"],
      websiteUrl: "https://www.ashihara-frederiksberg.dk/",
      // klubmodul
      calendarUrl:
        "https://ashiharafrederiksberg.klub-modul.dk/cms/Activity.aspx",
      classesUrl: "https://www.ashihara-frederiksberg.dk/tr%C3%A6ning",
    },
    {
      sourceId: "ashihara-karate-grenaa",
      name: "Ashihara Karate Grenaa",
      zip: "8500",
      type: "club",
      federation: ["dao"],
      websiteUrl: "https://www.ashiharakarategrenaa.dk/",
    },
    {
      sourceId: "randers-karate-skole",
      name: "Randers Karate Skole",
      zip: "8900",
      type: "club",
      federation: ["dao"],
      websiteUrl: "http://randerskarateskole.dk/",
      classesUrl: "http://randerskarateskole.dk/om-rks/traeningstider/",
    },
    {
      sourceId: "viborg-kampsport",
      name: "Viborg Kampsport - Ashihara Karate Viborg",
      zip: "8800",
      type: "club",
      federation: ["dao"],
      websiteUrl: "https://www.viborgkampsport.dk/",
      classesUrl: "https://www.viborgkampsport.dk/hold",
      calendarUrl: "https://www.viborgkampsport.dk/kalender",
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

          const extra: { federation?: string[] } = {};
          const info$ = node.info && cheerio.load(node.info);
          if (info$) {
            const infoText = info$.text();

            if (infoText.includes("alle er velkomne")) {
              extra.federation = ["*"];
            }
            if (infoText.includes("a tournament for everyone")) {
              extra.federation = ["*"];
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
      sourceId: "fight-collective",
      name: "Fight Collective",
      type: "organization",
      federation: ["*"],
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
    ...iogkfSources,
    ...wkbSources,
  ] as const
).toSorted((a, b) => a.name.localeCompare(b.name));
