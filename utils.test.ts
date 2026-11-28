import * as cheerio from "cheerio";
import { readFileSync } from "fs";
import { RRule } from "rrule";
import { describe, expect, it } from "vitest";
import {
  getAgeAndRankFromClassName,
  getRRuleWeekdaysByFullDanishName,
  parseClassesSchedulesTree,
  renderClasses,
  renderTextTree,
  safeParseTimeRange,
} from "./utils";

const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf-8");

describe("renderTextTree", () => {
  it("should render a simple HTML string to nested lines", () => {
    const html = "<div><p>Hello</p><p>World</p></div>";
    expect(renderTextTree(html)).toEqual(["Hello", "World"]);
  });
  it("should keep inline elements on the same line", () => {
    const html = "<div><p>Hello <span>World <em>!</em></span></p></div>";
    expect(renderTextTree(html)).toEqual(["Hello World !"]);
  });
  it("should not split words across inline elements", () => {
    const html =
      "<p><strong>Begyndere og ø</strong><span><strong>vede</strong></span></p>";
    expect(renderTextTree(html)).toEqual(["Begyndere og øvede"]);
  });
  it("should split lines on <br>", () => {
    const html =
      "<p><strong>Kamptræning</strong><br />\n<span>18:00-20:00</span></p>";
    expect(renderTextTree(html)).toEqual(["Kamptræning", "18:00-20:00"]);
  });
  it("should nest block elements", () => {
    const html =
      "<div><div>Mandag:&nbsp;</div><div><p>Børnehold<br>16:30</p><p>Øvede<br>17:45</p></div></div>";
    expect(renderTextTree(html)).toEqual([
      "Mandag:",
      [
        ["Børnehold", "16:30"],
        ["Øvede", "17:45"],
      ],
    ]);
  });
  it("should flatten single nested arrays", () => {
    expect(renderTextTree("<div><p>Hello</p></div>")).toEqual(["Hello"]);
  });
  it("should return an empty array for empty content", () => {
    expect(renderTextTree("<div><p> </p></div>")).toEqual([]);
  });
  it("should handle multiple cheerio selections", () => {
    const $ = cheerio.load("<div><p>Hello</p><p>World</p></div>");
    expect(renderTextTree($("p"))).toEqual(["Hello", "World"]);
  });
  it("should handle frederiksberg-karateskole HTML structure", async () => {
    const fk$ = cheerio.load(fixture("frederiksbergkarateskole.dk.html"))(
      "#main",
    );
    const result = renderTextTree(fk$);

    expect(result).toEqual([
      "Træningstider",
      [
        [
          "Mandag:",
          [
            ["Børnehold", "16:30–17:30"],
            ["Begynder og øvede", "17:45–19:45"],
          ],
        ],
        ["Tirsdag:", "Ingen træning"],
        ["Onsdag:", ["Begyndere og øvede", "17:30–19:30"]],
        ["Torsdag:", ["Kamptræning", "18:00-20:00"]],
        [
          "Fredag:",
          [
            ["Teknisk træning for alle", "17:00-18:15"],
            "(Selvtræning, instruktør ikke garanteret)",
          ],
        ],
        ["Lørdag:", "Lukket"],
      ],
    ]);
  });
});
describe("parseClassesSchedulesTree", async () => {
  it("should handle frederiksberg-karateskole HTML structure", async () => {
    const parsedSchedules = parseClassesSchedulesTree(
      renderTextTree(fixture("frederiksbergkarateskole.dk.html")),
      new Date("2026-11-30T00:30:00.000Z"),
    );
    expect(parsedSchedules).toEqual([
      {
        className: "Børnehold",
        weekday: "MO",
        nextStart: new Date("2026-11-30T15:30:00.000Z"),
        nextEnd: new Date("2026-11-30T16:30:00.000Z"),
        rankRange: { min: null, max: -11 },
        ageRange: { min: null, max: null },
      },
      {
        className: "Begynder og øvede",
        weekday: "MO",
        nextStart: new Date("2026-11-30T16:45:00.000Z"),
        nextEnd: new Date("2026-11-30T18:45:00.000Z"),
        rankRange: { min: -10, max: null },
        ageRange: { min: null, max: null },
      },
      {
        className: "Begyndere og øvede",
        weekday: "WE",
        nextStart: new Date("2026-12-02T16:30:00.000Z"),
        nextEnd: new Date("2026-12-02T18:30:00.000Z"),
        rankRange: { min: -10.5, max: null },
        ageRange: { min: null, max: null },
      },
      {
        className: "Kamptræning",
        weekday: "TH",
        nextStart: new Date("2026-12-03T17:00:00.000Z"),
        nextEnd: new Date("2026-12-03T19:00:00.000Z"),
        rankRange: { min: -10.5, max: null },
        ageRange: { min: null, max: null },
      },
      {
        className: "Teknisk træning for alle",
        weekday: "FR",
        nextStart: new Date("2026-12-04T16:00:00.000Z"),
        nextEnd: new Date("2026-12-04T17:15:00.000Z"),
        rankRange: { min: -10.5, max: null },
        ageRange: { min: null, max: null },
      },
    ]);
  });

  it("should handle kakushin.dk HTML structure", async () => {
    const parsedSchedules = parseClassesSchedulesTree(
      renderTextTree(fixture("kakushin.dk.html")),
      new Date("2026-11-30T00:30:00.000Z"),
    );
    expect(parsedSchedules).toEqual([
      {
        className: "Børn",
        weekday: "TU",
        nextStart: new Date("2026-12-01T16:00:00.000Z"),
        nextEnd: new Date("2026-12-01T17:00:00.000Z"),
        rankRange: { min: null, max: -11 },
        ageRange: { min: null, max: null },
      },
      {
        className: "Voksne",
        weekday: "TU",
        nextStart: new Date("2026-12-01T17:00:00.000Z"),
        nextEnd: new Date("2026-12-01T19:00:00.000Z"),
        rankRange: { min: -10.5, max: null },
        ageRange: { min: null, max: null },
      },
      {
        className: "Børn",
        weekday: "TH",
        nextStart: new Date("2026-12-03T16:00:00.000Z"),
        nextEnd: new Date("2026-12-03T17:00:00.000Z"),
        rankRange: { min: null, max: -11 },
        ageRange: { min: null, max: null },
      },
      {
        className: "Voksne",
        weekday: "TH",
        nextStart: new Date("2026-12-03T17:00:00.000Z"),
        nextEnd: new Date("2026-12-03T19:00:00.000Z"),
        rankRange: { min: -10.5, max: null },
        ageRange: { min: null, max: null },
      },
      {
        className: "Kamptræning",
        weekday: "SU",
        nextStart: new Date("2026-12-06T09:00:00.000Z"),
        nextEnd: new Date("2026-12-06T11:00:00.000Z"),
        rankRange: { min: -10.5, max: null },
        ageRange: { min: null, max: null },
      },
    ]);
  });

  it("should handle bskarate.dk HTML structure", async () => {
    const parsedSchedules = parseClassesSchedulesTree(
      renderTextTree(fixture("bskarate.dk.html")),
      new Date("2026-11-27T00:30:00.000Z"),
    );
    expect(parsedSchedules).toEqual([
      {
        className: "Børn 4 – 10 år",
        nextStart: new Date("2026-11-29T09:00:00.000Z"),
        nextEnd: new Date("2026-11-29T10:15:00.000Z"),
        rankRange: { min: null, max: -11 },
        ageRange: { min: 4, max: 10 },
        weekday: "SU",
      },
      {
        className: "Begynder – 9. kyu",
        nextStart: new Date("2026-11-30T17:00:00.000Z"),
        nextEnd: new Date("2026-11-30T18:00:00.000Z"),
        rankRange: { min: -10.5, max: -9 },
        ageRange: { min: null, max: null },
        weekday: "MO",
      },
      {
        className: "Begynder – 9. kyu",
        nextStart: new Date("2026-12-02T17:00:00.000Z"),
        nextEnd: new Date("2026-12-02T18:00:00.000Z"),
        rankRange: { min: -10.5, max: -9 },
        ageRange: { min: null, max: null },
        weekday: "WE",
      },
      {
        className: "Øvet (8. kyu og op)",
        nextStart: new Date("2026-11-30T18:00:00.000Z"),
        nextEnd: new Date("2026-11-30T19:30:00.000Z"),
        rankRange: { min: -8, max: null },
        ageRange: { min: null, max: null },
        weekday: "MO",
      },
      {
        className: "Øvet (8. kyu og op)",
        nextStart: new Date("2026-12-02T18:00:00.000Z"),
        nextEnd: new Date("2026-12-02T19:30:00.000Z"),
        rankRange: { min: -8, max: null },
        ageRange: { min: null, max: null },
        weekday: "WE",
      },
      {
        className: "Kamptræning for alle",
        nextStart: new Date("2026-11-27T16:30:00.000Z"),
        nextEnd: new Date("2026-11-27T18:00:00.000Z"),
        rankRange: { min: -10.5, max: null },
        ageRange: { min: null, max: null },
        weekday: "FR",
      },
    ]);
  });
  it("should handle farumkyokushin.dk HTML", async () => {
    const parsedSchedules = parseClassesSchedulesTree(
      renderTextTree(fixture("farumkyokushin.dk.html")),
      new Date("2026-11-27T00:30:00.000Z"),
    );
    expect(
      parsedSchedules.sort(
        (a, b) => a.nextStart.getTime() - b.nextStart.getTime(),
      ),
    ).toEqual([
      {
        className: "Karate Kids (øvede)",
        nextStart: new Date("2026-11-28T09:00:00.000Z"),
        nextEnd: new Date("2026-11-28T10:30:00.000Z"),
        rankRange: { min: null, max: -21 },
        ageRange: { min: 6, max: 8 },
        weekday: "SA",
      },
      {
        className: "Minimum 10. kyu (til og med 14 år og min. 10. kyu)",
        weekday: "SA",
        nextStart: new Date("2026-11-28T10:30:00.000Z"),
        nextEnd: new Date("2026-11-28T12:00:00.000Z"),
        rankRange: { min: -10, max: null },
        ageRange: { min: null, max: 14 },
      },
      {
        className: "Mini Bushi",
        weekday: "SU",
        nextStart: new Date("2026-11-29T08:00:00.000Z"),
        nextEnd: new Date("2026-11-29T09:00:00.000Z"),
        rankRange: { min: null, max: -21 },
        ageRange: { min: 3, max: 5 },
      },
      {
        className: "Åbent katahold (fra 15 år og op, alle grader)",
        weekday: "SU",
        nextStart: new Date("2026-11-29T09:00:00.000Z"),
        nextEnd: new Date("2026-11-29T10:00:00.000Z"),
        rankRange: { min: -10.5, max: null },
        ageRange: { min: 15, max: null },
      },
      {
        className: "Kamptræning (min. 10. kyu)",
        weekday: "SU",
        nextStart: new Date("2026-11-29T10:00:00.000Z"),
        nextEnd: new Date("2026-11-29T11:30:00.000Z"),
        rankRange: { min: -10, max: null },
        ageRange: { min: null, max: null },
      },
      {
        className: "SSS-træning (styrke, Stamina og Stræk)",
        weekday: "SU",
        nextStart: new Date("2026-11-29T11:30:00.000Z"),
        nextEnd: new Date("2026-11-29T12:00:00.000Z"),
        rankRange: { min: -10.5, max: null },
        ageRange: { min: null, max: null },
      },
      {
        className: "9. kyu (fra 15 år) samt 8. og 7. kyu (alle aldre)",
        weekday: "MO",
        nextStart: new Date("2026-11-30T16:00:00.000Z"),
        nextEnd: new Date("2026-11-30T17:30:00.000Z"),
        rankRange: { min: -9, max: -7 },
        ageRange: { min: null, max: null },
      },
      {
        className: "6., 5., 4. og 3. kyu (alle aldre)",
        weekday: "MO",
        nextStart: new Date("2026-11-30T17:30:00.000Z"),
        nextEnd: new Date("2026-11-30T19:00:00.000Z"),
        rankRange: { min: -6, max: -3 },
        ageRange: { min: null, max: null },
      },
      {
        className: "Begyndere og letøvede",
        weekday: "TU",
        nextStart: new Date("2026-12-01T16:00:00.000Z"),
        nextEnd: new Date("2026-12-01T17:15:00.000Z"),
        rankRange: { min: -10.5, max: null },
        ageRange: { min: null, max: null },
      },
      {
        className: "2. kyu og højere (fra 15 år og op)",
        weekday: "TU",
        nextStart: new Date("2026-12-01T17:15:00.000Z"),
        nextEnd: new Date("2026-12-01T18:45:00.000Z"),
        rankRange: { min: -2, max: null },
        ageRange: { min: 15, max: null },
      },
      {
        className: "Kobudo (minimum 15 år og 6. kyu)",
        weekday: "TU",
        nextStart: new Date("2026-12-01T19:00:00.000Z"),
        nextEnd: new Date("2026-12-01T20:15:00.000Z"),
        rankRange: { min: -6, max: null },
        ageRange: { min: 15, max: null },
      },
      {
        className: "Børn og unge (til og med 14 år og min. 10. kyu)",
        weekday: "WE",
        nextStart: new Date("2026-12-02T15:30:00.000Z"),
        nextEnd: new Date("2026-12-02T16:45:00.000Z"),
        rankRange: { min: -10, max: null },
        ageRange: { min: null, max: 14 },
      },
      {
        className: "Begyndere og letøvede",
        weekday: "TH",
        nextStart: new Date("2026-12-03T16:00:00.000Z"),
        nextEnd: new Date("2026-12-03T17:15:00.000Z"),
        rankRange: { min: -10.5, max: null },
        ageRange: { min: null, max: null },
      },
      {
        className: "Fællestræning (fra 15 år og op, alle grader)",
        weekday: "TH",
        nextStart: new Date("2026-12-03T17:15:00.000Z"),
        nextEnd: new Date("2026-12-03T18:45:00.000Z"),
        rankRange: { min: -10.5, max: null },
        ageRange: { min: 15, max: null },
      },
    ]);
  });
  it("should handle kenzoku-karate.dk HTML structure", async () => {
    const parsedSchedules = parseClassesSchedulesTree(
      renderTextTree(fixture("kenzoku-karate.dk.html")),
      new Date("2026-11-27T00:30:00.000Z"),
    );
    expect(
      parsedSchedules.sort(
        (a, b) => a.nextStart.getTime() - b.nextStart.getTime(),
      ),
    ).toEqual(
      [
        {
          className: "Børnehold",
          weekday: "MO",
          nextStart: new Date("2026-11-30T16:00:00.000Z"),
          nextEnd: new Date("2026-11-30T17:00:00.000Z"),
          rankRange: { min: null, max: -11 },
          ageRange: { min: 10, max: 13 },
        },
        {
          className: "For alle",
          weekday: "MO",
          nextStart: new Date("2026-11-30T17:30:00.000Z"),
          nextEnd: new Date("2026-11-30T19:00:00.000Z"),
          rankRange: { min: -10.5, max: null },
          ageRange: { min: 13, max: null },
        },
        {
          className: "For alle",
          weekday: "WE",
          nextStart: new Date("2026-12-02T17:30:00.000Z"),
          nextEnd: new Date("2026-12-02T19:00:00.000Z"),
          rankRange: { min: -10.5, max: null },
          ageRange: { min: 13, max: null },
        },
        {
          className: "Øvede",
          weekday: "SA",
          nextStart: new Date("2026-11-28T09:00:00.000Z"),
          nextEnd: new Date("2026-11-28T11:00:00.000Z"),
          rankRange: { min: -10, max: null },
          ageRange: { min: null, max: null },
        },
      ].sort((a, b) => a.nextStart.getTime() - b.nextStart.getTime()),
    );
  });
  it("should handle roskildekarateklub.dk HTML structure", async () => {
    const parsedSchedules = parseClassesSchedulesTree(
      renderTextTree(fixture("roskildekarateklub.dk.html")),
      new Date("2026-11-28T00:30:00.000Z"),
    );
    expect(
      parsedSchedules.sort(
        (a, b) => a.nextStart.getTime() - b.nextStart.getTime(),
      ),
    ).toEqual(
      [
        {
          className: "Kidzz, 3-5 år",
          weekday: "TH",
          nextStart: new Date("2026-12-03T15:30:00.000Z"),
          nextEnd: new Date("2026-12-03T16:30:00.000Z"),
          rankRange: { min: null, max: -21 },
          ageRange: { min: 3, max: 5 },
        },
        {
          className: "Kidzz, 5-7 år",
          weekday: "TH",
          nextStart: new Date("2026-12-03T16:30:00.000Z"),
          nextEnd: new Date("2026-12-03T17:30:00.000Z"),
          rankRange: { min: null, max: -21 },
          ageRange: { min: 5, max: 7 },
        },
        {
          className: "Børn, 8-14 år, Begyndere, 10.-9. mon",
          weekday: "MO",
          nextStart: new Date("2026-11-30T16:00:00.000Z"),
          nextEnd: new Date("2026-11-30T17:00:00.000Z"),
          rankRange: { min: -20.5, max: -19 },
          ageRange: { min: 8, max: 14 },
        },
        {
          className: "Børn, 8-14 år, Begyndere, 10.-9. mon",
          weekday: "TH",
          nextStart: new Date("2026-12-03T17:30:00.000Z"),
          nextEnd: new Date("2026-12-03T18:30:00.000Z"),
          rankRange: { min: -20.5, max: -19 },
          ageRange: { min: 8, max: 14 },
        },
        {
          className: "Børn, 8-14 år, Øvede, 8. mon +",
          weekday: "MO",
          nextStart: new Date("2026-11-30T17:00:00.000Z"),
          nextEnd: new Date("2026-11-30T18:15:00.000Z"),
          rankRange: { min: -18, max: -11 },
          ageRange: { min: 8, max: 14 },
        },
        {
          className: "Børn, 8-14 år, Øvede, 8. mon +",
          weekday: "TH",
          nextStart: new Date("2026-12-03T17:00:00.000Z"),
          nextEnd: new Date("2026-12-03T18:30:00.000Z"),
          rankRange: { min: -18, max: -11 },
          ageRange: { min: 8, max: 14 },
        },
        {
          className: "Voksne, +14 år, Begyndere, 10.-9. kyu",
          weekday: "MO",
          nextStart: new Date("2026-11-30T16:00:00.000Z"),
          nextEnd: new Date("2026-11-30T17:00:00.000Z"),
          rankRange: { min: -10.5, max: -9 },
          ageRange: { min: 14, max: null },
        },
        {
          className: "Voksne, +14 år, Begyndere, 10.-9. kyu",
          weekday: "WE",
          nextStart: new Date("2026-12-02T18:00:00.000Z"),
          nextEnd: new Date("2026-12-02T19:30:00.000Z"),
          rankRange: { min: -10.5, max: -9 },
          ageRange: { min: 14, max: null },
        },
        {
          className: "Voksne, +14 år, Let øvede, 8.-5. kyu",
          weekday: "MO",
          nextStart: new Date("2026-11-30T17:00:00.000Z"),
          nextEnd: new Date("2026-11-30T18:15:00.000Z"),
          rankRange: { min: -8, max: -5 },
          ageRange: { min: 14, max: null },
        },
        {
          className: "Voksne, +14 år, Let øvede, 8.-5. kyu",
          weekday: "WE",
          nextStart: new Date("2026-12-02T18:00:00.000Z"),
          nextEnd: new Date("2026-12-02T19:30:00.000Z"),
          rankRange: { min: -8, max: -5 },
          ageRange: { min: 14, max: null },
        },
        {
          className: "Voksne, +14 år, Øvede, 4. kyu +",
          weekday: "MO",
          nextStart: new Date("2026-11-30T18:15:00.000Z"),
          nextEnd: new Date("2026-11-30T19:30:00.000Z"),
          rankRange: { min: -4, max: null },
          ageRange: { min: 14, max: null },
        },
        {
          className: "Voksne, +14 år, Øvede, 4. kyu +",
          weekday: "WE",
          nextStart: new Date("2026-12-02T16:30:00.000Z"),
          nextEnd: new Date("2026-12-02T18:00:00.000Z"),
          rankRange: { min: -4, max: null },
          ageRange: { min: 14, max: null },
        },
        {
          className: "Kamphold, For Alle",
          weekday: "TH",
          nextStart: new Date("2026-12-03T18:30:00.000Z"),
          nextEnd: new Date("2026-12-03T20:00:00.000Z"),
          rankRange: { min: -10.5, max: null },
          ageRange: { min: null, max: null },
        },
        {
          className: "Katatræning, For øvede",
          weekday: "SU",
          nextStart: new Date("2026-11-29T08:30:00.000Z"),
          nextEnd: new Date("2026-11-29T10:30:00.000Z"),
          rankRange: { min: -10, max: null },
          ageRange: { min: null, max: null },
        },
        {
          className: "Kihontræning, For Alle",
          weekday: "SU",
          nextStart: new Date("2026-11-29T10:30:00.000Z"),
          nextEnd: new Date("2026-11-29T11:30:00.000Z"),
          rankRange: { min: -10.5, max: null },
          ageRange: { min: null, max: null },
        },
      ].sort((a, b) => a.nextStart.getTime() - b.nextStart.getTime()),
    );
  });
  it("should handle nansensgadekarate.dk HTML structure", async () => {
    const parsedSchedules = parseClassesSchedulesTree(
      renderTextTree(fixture("nansensgadekarate.dk.html")),
      new Date("2026-11-28T00:30:00.000Z"),
    );
    expect(
      parsedSchedules.sort(
        (a, b) => a.nextStart.getTime() - b.nextStart.getTime(),
      ),
    ).toEqual(
      [
        {
          className: "Børn - Fra blåt bælte (8. mon) og op",
          weekday: "MO",
          nextStart: new Date("2026-11-30T15:45:00.000Z"),
          nextEnd: new Date("2026-11-30T16:45:00.000Z"),
          rankRange: { min: -18, max: -11 },
          ageRange: { min: null, max: null },
          instructors: ["Senpai Jens Madsen"],
        },
        {
          className: "Voksenhold 10.-5. kyu og begyndere",
          weekday: "MO",
          nextStart: new Date("2026-11-30T16:55:00.000Z"),
          nextEnd: new Date("2026-11-30T18:05:00.000Z"),
          rankRange: { min: -10, max: -5 },
          ageRange: { min: null, max: null },
          instructors: ["Sensei Rasmus Rasmussen", "Senpai Mikkel Døcker"],
        },
        {
          className: "Voksenhold fra 4. kyu",
          weekday: "MO",
          nextStart: new Date("2026-11-30T18:05:00.000Z"),
          nextEnd: new Date("2026-11-30T19:30:00.000Z"),
          rankRange: { min: -4, max: null },
          ageRange: { min: null, max: null },
          instructors: ["Shihan Allan Døcker", "senpai Per Ole Lind"],
        },
        {
          className: "Kamphold",
          weekday: "TU",
          nextStart: new Date("2026-12-01T16:00:00.000Z"),
          nextEnd: new Date("2026-12-01T17:30:00.000Z"),
          rankRange: { min: -10.5, max: null },
          ageRange: { min: null, max: null },
          instructors: ["Sensei Benno Rasmussen"],
        },
        {
          className: "Gradueringstræning 10.-5. kyu",
          weekday: "TU",
          nextStart: new Date("2026-12-01T17:30:00.000Z"),
          nextEnd: new Date("2026-12-01T19:00:00.000Z"),
          rankRange: { min: -10, max: -5 },
          ageRange: { min: null, max: null },
          instructors: ["Senpai Emil André", "senpai Omer Badreldin"],
        },
        {
          className: "Børn - Fra blåt bælte (8. mon) og op",
          weekday: "WE",
          nextStart: new Date("2026-12-02T15:00:00.000Z"),
          nextEnd: new Date("2026-12-02T15:55:00.000Z"),
          rankRange: { min: -18, max: -11 },
          ageRange: { min: null, max: null },
          instructors: [
            "Senpai Hanni Hanberg",
            "Senpai Martin Rejnholt Frederiksen",
          ],
        },
        {
          className: "Børn - Begynder til orange med streg (9. mon)",
          weekday: "WE",
          nextStart: new Date("2026-12-02T16:00:00.000Z"),
          nextEnd: new Date("2026-12-02T17:00:00.000Z"),
          rankRange: { min: null, max: -19 },
          ageRange: { min: null, max: null },
          instructors: ["Senpai Olivia Niebuhr", "senpai Anders Pedersen"],
        },
        {
          className: "Træning voksne - Begyndere + øvede",
          weekday: "WE",
          nextStart: new Date("2026-12-02T17:15:00.000Z"),
          nextEnd: new Date("2026-12-02T19:00:00.000Z"),
          rankRange: { min: -10.5, max: null },
          ageRange: { min: null, max: null },
          instructors: ["Senpai Hanni Hanberg", "senpai Ida Nicole"],
        },
        {
          className: "Forældre/børn",
          weekday: "TH",
          nextStart: new Date("2026-12-03T15:00:00.000Z"),
          nextEnd: new Date("2026-12-03T15:45:00.000Z"),
          rankRange: { min: null, max: -21 },
          ageRange: { min: 5, max: 9 },
          instructors: ["Senpai Hanni Hanberg"],
        },
        {
          className: "Kamphold",
          weekday: "TH",
          nextStart: new Date("2026-12-03T16:00:00.000Z"),
          nextEnd: new Date("2026-12-03T17:15:00.000Z"),
          rankRange: { min: -10.5, max: null },
          ageRange: { min: null, max: null },
          instructors: ["Sensei Benno Rasmussen", "sensei Brian Jacobsen"],
        },
        {
          className: "Gradueringstræning 10.-5. kyu",
          weekday: "TH",
          nextStart: new Date("2026-12-03T17:30:00.000Z"),
          nextEnd: new Date("2026-12-03T19:00:00.000Z"),
          rankRange: { min: -10, max: -5 },
          ageRange: { min: null, max: null },
          instructors: [
            "Senpai Omer Badreldin",
            "Senpai Nicolaj Mugenast-Petersen",
            "Senpai Liv Steensen",
          ],
        },
        {
          className: "Åben dojo",
          weekday: "FR",
          nextStart: new Date("2026-12-04T07:00:00.000Z"),
          nextEnd: new Date("2026-12-04T08:00:00.000Z"),
          rankRange: { min: -10.5, max: null },
          ageRange: { min: null, max: null },
          instructors: ["Senpei Tim Borelli Mikkelsen"],
        },
        {
          className: "Fællestræning",
          weekday: "SA",
          nextStart: new Date("2026-11-28T09:00:00.000Z"),
          nextEnd: new Date("2026-11-28T10:30:00.000Z"),
          rankRange: { min: -10.5, max: null },
          ageRange: { min: null, max: null },
          instructors: ["Forskellige instruktører"],
        },
        {
          className: "Kata",
          weekday: "SU",
          nextStart: new Date("2026-11-29T09:00:00.000Z"),
          nextEnd: new Date("2026-11-29T10:30:00.000Z"),
          rankRange: { min: -10.5, max: null },
          ageRange: { min: null, max: null },
          instructors: [
            "Sensei Rasmus Rasmussen",
            "Senpai Hanni Hanberg",
            "Senpai Sunniva Sandbukt",
          ],
        },
      ].sort((a, b) => a.nextStart.getTime() - b.nextStart.getTime()),
    );
  });
  it("should handle risskovkarateskole.dk HTML structure", async () => {
    const parsedSchedules = parseClassesSchedulesTree(
      renderTextTree(fixture("risskovkarateskole.dk.html")),
      new Date("2026-11-28T00:30:00.000Z"),
    );
    expect(
      parsedSchedules.sort(
        (a, b) => a.nextStart.getTime() - b.nextStart.getTime(),
      ),
    ).toEqual([
      {
        className: "Børn og juniorer (til og med 16 år)",
        weekday: "MO",
        nextStart: new Date("2026-11-30T16:00:00.000Z"),
        nextEnd: new Date("2026-11-30T17:00:00.000Z"),
        rankRange: { min: null, max: -11 },
        ageRange: { min: null, max: 16 },
      },
      {
        className: "Voksne (fra 17 år)",
        weekday: "MO",
        nextStart: new Date("2026-11-30T17:00:00.000Z"),
        nextEnd: new Date("2026-11-30T18:30:00.000Z"),
        rankRange: { min: -10.5, max: null },
        ageRange: { min: 17, max: null },
      },
      {
        className: "Børn og juniorer (til og med 16 år)",
        weekday: "TH",
        nextStart: new Date("2026-12-03T16:00:00.000Z"),
        nextEnd: new Date("2026-12-03T17:00:00.000Z"),
        rankRange: { min: null, max: -11 },
        ageRange: { min: null, max: 16 },
      },
      {
        className: "Voksne (fra 17 år)",
        weekday: "TH",
        nextStart: new Date("2026-12-03T17:00:00.000Z"),
        nextEnd: new Date("2026-12-03T18:30:00.000Z"),
        rankRange: { min: -10.5, max: null },
        ageRange: { min: 17, max: null },
      },
    ]);
  });
  it("should handle aarhus.ashihara.dk HTML structure", async () => {
    const parsedSchedules = renderClasses(
      fixture("aarhus.ashihara.dk.html"),
      new Date("2026-11-28T00:30:00.000Z"),
    );
    expect(
      parsedSchedules.sort(
        (a, b) => a.nextStart.getTime() - b.nextStart.getTime(),
      ),
    ).toEqual([
      {
        className: "Kamptræning",
        weekday: "SA",
        nextStart: new Date("2026-11-28T09:00:00.000Z"),
        nextEnd: new Date("2026-11-28T10:30:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Børnehold",
        weekday: "MO",
        nextStart: new Date("2026-11-30T16:00:00.000Z"),
        nextEnd: new Date("2026-11-30T17:15:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: null, max: -11 },
      },
      {
        className: "Viderekommende",
        weekday: "MO",
        nextStart: new Date("2026-11-30T17:30:00.000Z"),
        nextEnd: new Date("2026-11-30T19:00:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Begynderhold",
        weekday: "TU",
        nextStart: new Date("2026-12-01T16:00:00.000Z"),
        nextEnd: new Date("2026-12-01T17:30:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Øvede",
        weekday: "TU",
        nextStart: new Date("2026-12-01T16:00:00.000Z"),
        nextEnd: new Date("2026-12-01T17:30:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10, max: null },
      },
      {
        className: "Juniorhold",
        weekday: "WE",
        nextStart: new Date("2026-12-02T16:00:00.000Z"),
        nextEnd: new Date("2026-12-02T17:30:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Onsdagstræning",
        weekday: "WE",
        nextStart: new Date("2026-12-02T17:30:00.000Z"),
        nextEnd: new Date("2026-12-02T19:00:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Begynderhold",
        weekday: "TH",
        nextStart: new Date("2026-12-03T16:00:00.000Z"),
        nextEnd: new Date("2026-12-03T17:30:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Øvede",
        weekday: "TH",
        nextStart: new Date("2026-12-03T16:00:00.000Z"),
        nextEnd: new Date("2026-12-03T17:30:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10, max: null },
      },
      {
        className: "Viderekommende",
        weekday: "TH",
        nextStart: new Date("2026-12-03T16:00:00.000Z"),
        nextEnd: new Date("2026-12-03T17:30:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
      },
    ]);
  });
  it("should handle svendborg-karateskole.dk HTML structure", async () => {
    const parsedSchedules = renderClasses(
      fixture("svendborg-karateskole.dk.html"),
      new Date("2026-11-28T00:30:00.000Z"),
    );
    expect(
      parsedSchedules.sort(
        (a, b) => a.nextStart.getTime() - b.nextStart.getTime(),
      ),
    ).toEqual([
      {
        className: "VOKSNE - Begyndere til og med 7. kyu",
        weekday: "MO",
        nextStart: new Date("2026-11-30T17:30:00.000Z"),
        nextEnd: new Date("2026-11-30T19:00:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: -7 },
        instructors: ["Senpai Leif", "Ulrik"],
      },
      {
        className: "BØRN (inkl. begyndere)",
        weekday: "TU",
        nextStart: new Date("2026-12-01T16:15:00.000Z"),
        nextEnd: new Date("2026-12-01T17:15:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -20.5, max: -11 },
        instructors: ["Senpai Bo", "Tariq"],
      },
      {
        className: "VOKSNE - Øvede 6. kyu etc",
        weekday: "TU",
        nextStart: new Date("2026-12-01T17:30:00.000Z"),
        nextEnd: new Date("2026-12-01T19:00:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -6, max: null },
        instructors: ["Sensei Kim", "Senpai Charlotte"],
      },
      {
        className: "KAMPTRÆNING",
        weekday: "WE",
        nextStart: new Date("2026-12-02T16:30:00.000Z"),
        nextEnd: new Date("2026-12-02T18:00:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
        instructors: ["Sensei Kim"],
      },
      {
        className: "BØRN (inkl. begyndere)",
        weekday: "TH",
        nextStart: new Date("2026-12-03T16:15:00.000Z"),
        nextEnd: new Date("2026-12-03T17:15:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -20.5, max: -11 },
        instructors: ["Senpai Bo", "Tariq"],
      },
      {
        className: "VOKSNE - Fælleshold (inkl. begyndere)",
        weekday: "TH",
        nextStart: new Date("2026-12-03T17:30:00.000Z"),
        nextEnd: new Date("2026-12-03T19:00:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
        instructors: ["Nikolaj"],
      },
    ]);
  });
  it("should handle ensopeople.org HTML structure", async () => {
    const parsedSchedules = renderClasses(
      fixture("ensopeople.org.html"),
      new Date("2026-11-28T00:30:00.000Z"),
    );
    expect(
      parsedSchedules.sort(
        (a, b) => a.nextStart.getTime() - b.nextStart.getTime(),
      ),
    ).toEqual([
      {
        className: "Sunday Fight",
        weekday: "SU",
        nextStart: new Date("2026-11-29T12:30:00.000Z"),
        nextEnd: new Date("2026-11-29T13:30:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
        instructors: ["Senpai Henrik"],
      },
      {
        className: "All round karate",
        weekday: "TU",
        nextStart: new Date("2026-12-01T18:30:00.000Z"),
        nextEnd: new Date("2026-12-01T20:00:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
        instructors: ["Senpai Tina", "Senpai Tobias"],
      },
      {
        className: "Fight class",
        weekday: "TH",
        nextStart: new Date("2026-12-03T18:30:00.000Z"),
        nextEnd: new Date("2026-12-03T20:00:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
        instructors: ["Senpai Kristoffer"],
      },
      {
        className: "Friday Fight",
        weekday: "FR",
        nextStart: new Date("2026-12-04T15:15:00.000Z"),
        nextEnd: new Date("2026-12-04T17:45:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
        instructors: ["Senpai Tobias"],
      },
    ]);
  });
  it("should handle middelfartkarate.dk HTML structure", async () => {
    const parsedSchedules = renderClasses(
      fixture("middelfartkarate.dk.html"),
      new Date("2026-11-28T00:30:00.000Z"),
    );
    expect(
      parsedSchedules.sort(
        (a, b) => a.nextStart.getTime() - b.nextStart.getTime(),
      ),
    ).toEqual([
      {
        className: "Kidzz",
        weekday: "MO",
        nextStart: new Date("2026-11-30T16:00:00.000Z"),
        nextEnd: new Date("2026-11-30T17:00:00.000Z"),
        ageRange: { min: 5, max: 9 },
        rankRange: { min: null, max: -21 },
      },
      {
        className: "Nybegynder Kidzz 6-10 år",
        weekday: "MO",
        nextStart: new Date("2026-11-30T16:00:00.000Z"),
        nextEnd: new Date("2026-11-30T17:00:00.000Z"),
        ageRange: { min: 6, max: 10.5 },
        rankRange: { min: null, max: -21 },
      },
      {
        className: "Juniormix",
        weekday: "MO",
        nextStart: new Date("2026-11-30T17:00:00.000Z"),
        nextEnd: new Date("2026-11-30T18:00:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Nybegynder børn og voksen",
        weekday: "MO",
        nextStart: new Date("2026-11-30T17:00:00.000Z"),
        nextEnd: new Date("2026-11-30T18:00:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: null, max: -11 },
      },
      {
        className: "Øvede voksenhold",
        weekday: "MO",
        nextStart: new Date("2026-11-30T18:15:00.000Z"),
        nextEnd: new Date("2026-11-30T19:30:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10, max: null },
      },
      {
        className: "Juniormix",
        weekday: "TH",
        nextStart: new Date("2026-12-03T17:00:00.000Z"),
        nextEnd: new Date("2026-12-03T18:00:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Nybegynder børn og voksen",
        weekday: "TH",
        nextStart: new Date("2026-12-03T17:00:00.000Z"),
        nextEnd: new Date("2026-12-03T18:00:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: null, max: -11 },
      },
      {
        className: "Øvede voksenhold",
        weekday: "TH",
        nextStart: new Date("2026-12-03T18:15:00.000Z"),
        nextEnd: new Date("2026-12-03T19:30:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10, max: null },
      },
    ]);
  });
  it("should handle aabenraakarateklub.dk HTML structure", async () => {
    const parsedSchedules = renderClasses(
      fixture("aabenraakarateklub.dk.html"),
      new Date("2026-11-28T00:30:00.000Z"),
    );
    expect(
      parsedSchedules.sort(
        (a, b) => a.nextStart.getTime() - b.nextStart.getTime(),
      ),
    ).toEqual([
      {
        className: "Diverse træning (annonceres på Facebook)",
        weekday: "SA",
        nextStart: new Date("2026-11-28T07:00:00.000Z"),
        nextEnd: new Date("2026-11-28T09:00:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Mon hold",
        weekday: "MO",
        nextStart: new Date("2026-11-30T17:00:00.000Z"),
        nextEnd: new Date("2026-11-30T18:00:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: null, max: -11 },
      },
      {
        className: "Kyu-grader",
        weekday: "MO",
        nextStart: new Date("2026-11-30T18:00:00.000Z"),
        nextEnd: new Date("2026-11-30T19:30:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10, max: null },
      },
      {
        className: "Kids Hold 1",
        weekday: "WE",
        nextStart: new Date("2026-12-02T16:00:00.000Z"),
        nextEnd: new Date("2026-12-02T17:00:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: null, max: -21 },
      },
      {
        className: "Mon hold",
        weekday: "WE",
        nextStart: new Date("2026-12-02T17:00:00.000Z"),
        nextEnd: new Date("2026-12-02T18:00:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: null, max: -11 },
      },
      {
        className: "Kyu-grader",
        weekday: "WE",
        nextStart: new Date("2026-12-02T18:00:00.000Z"),
        nextEnd: new Date("2026-12-02T19:30:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10, max: null },
      },
      {
        className: "Kids Hold 2",
        weekday: "TH",
        nextStart: new Date("2026-12-03T16:00:00.000Z"),
        nextEnd: new Date("2026-12-03T17:00:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: null, max: -21 },
      },
      {
        className: "Nybegynder hold",
        weekday: "TH",
        nextStart: new Date("2026-12-03T17:00:00.000Z"),
        nextEnd: new Date("2026-12-03T18:00:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Senpai hold",
        weekday: "TH",
        nextStart: new Date("2026-12-03T18:00:00.000Z"),
        nextEnd: new Date("2026-12-03T19:30:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
      },
    ]);
  });
  it("should handle graastenkarateklub.dk HTML structure", async () => {
    const parsedSchedules = renderClasses(
      fixture("graastenkarateklub.dk.html"),
      new Date("2026-11-28T00:30:00.000Z"),
    );
    expect(
      parsedSchedules.sort(
        (a, b) => a.nextStart.getTime() - b.nextStart.getTime(),
      ),
    ).toEqual([
      {
        className: "Kidz 5-10 år",
        weekday: "MO",
        nextStart: new Date("2026-11-30T16:00:00.000Z"),
        nextEnd: new Date("2026-11-30T17:00:00.000Z"),
        ageRange: { min: 5, max: 10 },
        rankRange: { min: null, max: -21 },
      },
      {
        className: "Børn (10-15 år)",
        weekday: "MO",
        nextStart: new Date("2026-11-30T17:00:00.000Z"),
        nextEnd: new Date("2026-11-30T18:30:00.000Z"),
        ageRange: { min: 10, max: 15 },
        rankRange: { min: null, max: -11 },
      },
      {
        className: "Voksne (15 år og op efter)",
        weekday: "MO",
        nextStart: new Date("2026-11-30T17:00:00.000Z"),
        nextEnd: new Date("2026-11-30T18:30:00.000Z"),
        ageRange: { min: 15, max: null },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Børn (10-15 år)",
        weekday: "WE",
        nextStart: new Date("2026-12-02T17:00:00.000Z"),
        nextEnd: new Date("2026-12-02T18:30:00.000Z"),
        ageRange: { min: 10, max: 15 },
        rankRange: { min: null, max: -11 },
      },
      {
        className: "Voksne (15 år og op efter)",
        weekday: "WE",
        nextStart: new Date("2026-12-02T17:00:00.000Z"),
        nextEnd: new Date("2026-12-02T18:30:00.000Z"),
        ageRange: { min: 15, max: null },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Børn (10-15 år)",
        weekday: "FR",
        nextStart: new Date("2026-12-04T17:00:00.000Z"),
        nextEnd: new Date("2026-12-04T18:30:00.000Z"),
        ageRange: { min: 10, max: 15 },
        rankRange: { min: null, max: -11 },
      },
      {
        className: "Voksne (15 år og op efter)",
        weekday: "FR",
        nextStart: new Date("2026-12-04T17:00:00.000Z"),
        nextEnd: new Date("2026-12-04T18:30:00.000Z"),
        ageRange: { min: 15, max: null },
        rankRange: { min: -10.5, max: null },
      },
    ]);
  });
  it("should handle ballerupkyokushin.dk HTML structure", async () => {
    const parsedSchedules = renderClasses(
      fixture("ballerupkyokushin.dk.html"),
      new Date("2026-11-28T00:30:00.000Z"),
    );
    expect(
      parsedSchedules.sort(
        (a, b) => a.nextStart.getTime() - b.nextStart.getTime(),
      ),
    ).toEqual([
      {
        className: "Begyndere",
        weekday: "TU",
        nextStart: new Date("2026-12-01T16:30:00.000Z"),
        nextEnd: new Date("2026-12-01T17:30:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Øvede",
        weekday: "TU",
        nextStart: new Date("2026-12-01T16:30:00.000Z"),
        nextEnd: new Date("2026-12-01T18:00:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10, max: null },
      },
      {
        className: "Begyndere",
        weekday: "TH",
        nextStart: new Date("2026-12-03T16:30:00.000Z"),
        nextEnd: new Date("2026-12-03T17:30:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Øvede",
        weekday: "TH",
        nextStart: new Date("2026-12-03T16:30:00.000Z"),
        nextEnd: new Date("2026-12-03T18:00:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10, max: null },
      },
    ]);
  });
  it("should handle billund-if.dk HTML structure", async () => {
    const parsedSchedules = renderClasses(
      fixture("billund-if.dk.html"),
      new Date("2026-11-28T00:30:00.000Z"),
    );
    expect(
      parsedSchedules.sort(
        (a, b) => a.nextStart.getTime() - b.nextStart.getTime(),
      ),
    ).toEqual([
      {
        className: "Children (6-16 year old)",
        weekday: "TU",
        nextStart: new Date("2026-12-01T16:30:00.000Z"),
        nextEnd: new Date("2026-12-01T18:00:00.000Z"),
        ageRange: { min: 6, max: 16 },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Adults (16+ years old)",
        weekday: "TU",
        nextStart: new Date("2026-12-01T16:30:00.000Z"),
        nextEnd: new Date("2026-12-01T18:00:00.000Z"),
        ageRange: { min: 16, max: null },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Children (6-16 year old)",
        weekday: "TH",
        nextStart: new Date("2026-12-03T16:00:00.000Z"),
        nextEnd: new Date("2026-12-03T17:30:00.000Z"),
        ageRange: { min: 6, max: 16 },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Adults (16+ years old)",
        weekday: "TH",
        nextStart: new Date("2026-12-03T16:00:00.000Z"),
        nextEnd: new Date("2026-12-03T17:30:00.000Z"),
        ageRange: { min: 16, max: null },
        rankRange: { min: -10.5, max: null },
      },
    ]);
  });
  it("should handle aarhusshinkyokushinkarate.dk HTML structure", async () => {
    const parsedSchedules = renderClasses(
      fixture("aarhusshinkyokushinkarate.dk.html"),
      new Date("2026-11-28T00:30:00.000Z"),
      { className: "Træning" },
    );
    expect(
      parsedSchedules.sort(
        (a, b) => a.nextStart.getTime() - b.nextStart.getTime(),
      ),
    ).toEqual([
      {
        className: "Træning",
        weekday: "MO",
        nextStart: new Date("2026-11-30T17:00:00.000Z"),
        nextEnd: new Date("2026-11-30T18:30:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Træning",
        weekday: "TU",
        nextStart: new Date("2026-12-01T19:00:00.000Z"),
        nextEnd: new Date("2026-12-01T20:00:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Træning",
        weekday: "TH",
        nextStart: new Date("2026-12-03T17:30:00.000Z"),
        nextEnd: new Date("2026-12-03T19:00:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
      },
    ]);
  });
  it("should handle karateklub.com-teamoverviewplan HTML structure", async () => {
    const parsedSchedules = renderClasses(
      fixture("karateklub.com-teamoverviewplan.html"),
      new Date("2026-11-28T00:30:00.000Z"),
    );
    expect(
      parsedSchedules.sort(
        (a, b) => a.nextStart.getTime() - b.nextStart.getTime(),
      ),
    ).toEqual([
      {
        className: "Karate Kids I (6-7år)",
        weekday: "MO",
        nextStart: new Date("2026-11-30T16:00:00.000Z"),
        nextEnd: new Date("2026-11-30T17:00:00.000Z"),
        ageRange: { min: 6, max: 7 },
        rankRange: { min: null, max: -21 },
      },
      {
        className: "Karate Kids II (8-10år)",
        weekday: "MO",
        nextStart: new Date("2026-11-30T16:00:00.000Z"),
        nextEnd: new Date("2026-11-30T17:00:00.000Z"),
        ageRange: { min: 8, max: 10 },
        rankRange: { min: null, max: -21 },
      },
      {
        className: "Juniorer I (11-14år)",
        weekday: "MO",
        nextStart: new Date("2026-11-30T17:00:00.000Z"),
        nextEnd: new Date("2026-11-30T18:30:00.000Z"),
        ageRange: { min: 11, max: 14 },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Juniorer II (15-17år)",
        weekday: "MO",
        nextStart: new Date("2026-11-30T17:00:00.000Z"),
        nextEnd: new Date("2026-11-30T18:30:00.000Z"),
        ageRange: { min: 15, max: 17 },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Voksne begyndere (18+ år)",
        weekday: "MO",
        nextStart: new Date("2026-11-30T17:00:00.000Z"),
        nextEnd: new Date("2026-11-30T18:30:00.000Z"),
        ageRange: { min: 10.5, max: 18 },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Voksne øvede (18+ år)",
        weekday: "MO",
        nextStart: new Date("2026-11-30T17:00:00.000Z"),
        nextEnd: new Date("2026-11-30T18:30:00.000Z"),
        ageRange: { min: 18, max: null },
        rankRange: { min: -10, max: null },
      },
      {
        className: "Kamphold",
        weekday: "TU",
        nextStart: new Date("2026-12-01T17:00:00.000Z"),
        nextEnd: new Date("2026-12-01T18:30:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Juniorer I (11-14år)",
        weekday: "TU",
        nextStart: new Date("2026-12-01T17:00:00.000Z"),
        nextEnd: new Date("2026-12-01T18:30:00.000Z"),
        ageRange: { min: 11, max: 14 },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Juniorer II (15-17år)",
        weekday: "TU",
        nextStart: new Date("2026-12-01T17:00:00.000Z"),
        nextEnd: new Date("2026-12-01T18:30:00.000Z"),
        ageRange: { min: 15, max: 17 },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Voksne øvede (18+ år)",
        weekday: "TU",
        nextStart: new Date("2026-12-01T17:00:00.000Z"),
        nextEnd: new Date("2026-12-01T18:30:00.000Z"),
        ageRange: { min: 18, max: null },
        rankRange: { min: -10, max: null },
      },
      {
        className: "Karate Kids I (6-7år)",
        weekday: "TH",
        nextStart: new Date("2026-12-03T16:00:00.000Z"),
        nextEnd: new Date("2026-12-03T17:00:00.000Z"),
        ageRange: { min: 6, max: 7 },
        rankRange: { min: null, max: -21 },
      },
      {
        className: "Karate Kids II (8-10år)",
        weekday: "TH",
        nextStart: new Date("2026-12-03T16:00:00.000Z"),
        nextEnd: new Date("2026-12-03T17:00:00.000Z"),
        ageRange: { min: 8, max: 10 },
        rankRange: { min: null, max: -21 },
      },
      {
        className: "Juniorer I (11-14år)",
        weekday: "TH",
        nextStart: new Date("2026-12-03T17:00:00.000Z"),
        nextEnd: new Date("2026-12-03T18:30:00.000Z"),
        ageRange: { min: 11, max: 14 },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Juniorer II (15-17år)",
        weekday: "TH",
        nextStart: new Date("2026-12-03T17:00:00.000Z"),
        nextEnd: new Date("2026-12-03T18:30:00.000Z"),
        ageRange: { min: 15, max: 17 },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Voksne begyndere (18+ år)",
        weekday: "TH",
        nextStart: new Date("2026-12-03T17:00:00.000Z"),
        nextEnd: new Date("2026-12-03T18:30:00.000Z"),
        ageRange: { min: 10.5, max: 18 },
        rankRange: { min: -10.5, max: null },
      },
      {
        className: "Voksne øvede (18+ år)",
        weekday: "TH",
        nextStart: new Date("2026-12-03T17:00:00.000Z"),
        nextEnd: new Date("2026-12-03T18:30:00.000Z"),
        ageRange: { min: 18, max: null },
        rankRange: { min: -10, max: null },
      },
      {
        className: "Kamphold",
        weekday: "FR",
        nextStart: new Date("2026-12-04T17:00:00.000Z"),
        nextEnd: new Date("2026-12-04T18:30:00.000Z"),
        ageRange: { min: null, max: null },
        rankRange: { min: -10.5, max: null },
      },
    ]);
  });
});

describe("getRRuleWeekdaysByFullDanishName", () => {
  it("should return correct weekdays for single Danish full names", () => {
    expect(getRRuleWeekdaysByFullDanishName("Mandag")).toEqual([RRule.MO]);
    expect(getRRuleWeekdaysByFullDanishName("Tirsdag")).toEqual([RRule.TU]);
    expect(getRRuleWeekdaysByFullDanishName("Onsdag")).toEqual([RRule.WE]);
    expect(getRRuleWeekdaysByFullDanishName("Torsdag")).toEqual([RRule.TH]);
    expect(getRRuleWeekdaysByFullDanishName("Fredag")).toEqual([RRule.FR]);
    expect(getRRuleWeekdaysByFullDanishName("Lørdag")).toEqual([RRule.SA]);
    expect(getRRuleWeekdaysByFullDanishName("Søndag")).toEqual([RRule.SU]);
  });

  it("should return correct weekdays for multiple Danish full names", () => {
    expect(getRRuleWeekdaysByFullDanishName("Mandag Tirsdag")).toEqual([
      RRule.MO,
      RRule.TU,
    ]);
    expect(getRRuleWeekdaysByFullDanishName("Onsdag Torsdag Fredag")).toEqual([
      RRule.WE,
      RRule.TH,
      RRule.FR,
    ]);
    expect(getRRuleWeekdaysByFullDanishName("Lørdag Søndag")).toEqual([
      RRule.SA,
      RRule.SU,
    ]);
    expect(getRRuleWeekdaysByFullDanishName("Torsdag Søndag")).toEqual([
      RRule.TH,
      RRule.SU,
    ]);
    expect(getRRuleWeekdaysByFullDanishName("Mandag Søndag")).toEqual([
      RRule.MO,
      RRule.SU,
    ]);
    expect(getRRuleWeekdaysByFullDanishName("asdfasdf")).toBeNull();
    expect(getRRuleWeekdaysByFullDanishName("")).toBeNull();
    expect(
      getRRuleWeekdaysByFullDanishName(
        "Mandag Tirsdag Onsdag Torsdag Fredag Lørdag Søndag",
      ),
    ).toEqual([
      RRule.MO,
      RRule.TU,
      RRule.WE,
      RRule.TH,
      RRule.FR,
      RRule.SA,
      RRule.SU,
    ]);
    expect(getRRuleWeekdaysByFullDanishName("Mandag Mandag")).toEqual([
      RRule.MO,
    ]);
  });
});

describe("getAgeAndRankFromClassName", () => {
  const cases = {
    "minimum 3. kyu": {
      rankRange: { min: -3, max: null },
      ageRange: { min: null, max: null },
    },
    "minimum 3. Kyu": {
      rankRange: { min: -3, max: null },
      ageRange: { min: null, max: null },
    },
    "Minimum 1. Kyu": {
      rankRange: { min: -1, max: null },
      ageRange: { min: null, max: null },
    },
    "2. kyu og højere (fra 15 år og op)": {
      rankRange: { min: -2, max: null },
      ageRange: { min: 15, max: null },
    },
    "til og med 7. kyu": {
      rankRange: { min: -10.5, max: -7 },
      ageRange: { min: null, max: null },
    },
    "Kobudo (minimum 15 år og 6. kyu)": {
      rankRange: { min: -6, max: null },
      ageRange: { min: 15, max: null },
    },
    "Gradueringstræning 10.-5. kyu": {
      rankRange: { min: -10, max: -5 },
      ageRange: { min: null, max: null },
    },
    "Børn - Begynder til orange med streg (9. mon)": {
      rankRange: { min: null, max: -19 },
      // TODO: Let the caller say what a børn is
      ageRange: { min: null, max: null },
    },
    "Børn - Fra blåt bælte (8. mon) og op": {
      rankRange: { min: -18, max: -11 },
      // TODO: Let the caller say what a børn is
      ageRange: { min: null, max: null },
    },
    "Voksne, +14 år, Begyndere, 10.-9. kyu": {
      rankRange: { min: -10.5, max: -9 },
      ageRange: { min: 14, max: null },
    },
    "6., 5., 4. og 3. kyu": {
      rankRange: { min: -6, max: -3 },
      ageRange: { min: null, max: null },
    },
    "Voksenhold fra 4. kyu": {
      rankRange: { min: -4, max: null },
      ageRange: { min: null, max: null },
    },
    "Åbent katahold (fra 15 år og op)": {
      rankRange: { min: -10.5, max: null },
      ageRange: { min: 15, max: null },
    },
    "5-9-årige - Forældre- og børnehold": {
      rankRange: { min: null, max: -21 },
      ageRange: { min: 5, max: 9 },
    },
    "8-13-årige - Børnehold": {
      rankRange: { min: null, max: -11 },
      ageRange: { min: 8, max: 13 },
    },
    "13-18-årige - Juniorhold": {
      rankRange: { min: -10.5, max: null },
      ageRange: { min: 13, max: 18 },
    },
    "Børn, 8-14 år, Begyndere, 10.-9. mon": {
      rankRange: { min: -20.5, max: -19 },
      ageRange: { min: 8, max: 14 },
    },
    "6-3. kyu": {
      rankRange: { min: -6, max: -3 },
      ageRange: { min: null, max: null },
    },
    "10-7. kyu": {
      rankRange: { min: -10, max: -7 },
      ageRange: { min: null, max: null },
    },
    "2. kyu/sort": {
      rankRange: { min: -2, max: null },
      ageRange: { min: null, max: null },
    },
    "Kumite (alle grader)": {
      rankRange: { min: -10.5, max: null },
      ageRange: { min: null, max: null },
    },
    "Tiger 7-9 år 10-6 kyu junior(nye+let øvede)": {
      rankRange: { min: null, max: -16 },
      ageRange: { min: 7, max: 9 },
    },
    "Drager 10-13 år 10-6 kyu junior(nye+let øvede)": {
      rankRange: { min: -20, max: -16 },
      ageRange: { min: 10, max: 13 },
    },
    "Cobra 9-13 år 6-4 kyu": {
      rankRange: { min: -6, max: -4 },
      ageRange: { min: 9, max: 13 },
    },
    "KIREI +13 år 10-6 kyu(nye+let øvede)": {
      rankRange: { min: -10, max: -6 },
      ageRange: { min: 13, max: null },
    },
    "Hattasu 13-99 år 5-4 kyu": {
      rankRange: { min: -5, max: -4 },
      ageRange: { min: 13, max: 99 },
    },
    "Panter 4-6 år(nye+let øvede)": {
      rankRange: { min: null, max: null },
      ageRange: { min: 4, max: 6 },
    },
    "NINTAI +13 år 1 kyu-Dan": {
      rankRange: { min: -1, max: null },
      ageRange: { min: 13, max: null },
    },
    "RIKAI +13 år 3-2-1kyu": {
      rankRange: { min: -3, max: -1 },
      ageRange: { min: 13, max: null },
    },
    "SIHRU holdet er for 40+....": {
      rankRange: { min: -10.5, max: null },
      ageRange: { min: 40, max: null },
    },
    "9. kyu (fra 15 år) samt 8. og 7. kyu (alle aldre)": {
      rankRange: { min: -9, max: -7 },
      ageRange: { min: null, max: null },
    },
    "Voksne, +14 år, Øvede, 4. kyu +": {
      rankRange: { min: -4, max: null },
      ageRange: { min: 14, max: null },
    },
    "Minimum 10. kyu (til og med 14 år og min. 10. kyu)": {
      rankRange: { min: -10, max: null },
      ageRange: { min: null, max: 14 },
    },
    "Kiddz, 3-5 år": {
      rankRange: { min: null, max: null },
      ageRange: { min: 3, max: 5 },
    },
    "Børn og unge (til og med 14 år og min. 10. kyu)": {
      rankRange: { min: -10, max: null },
      ageRange: { min: null, max: 14 },
    },
    Øvede: {
      rankRange: { min: -10, max: null },
      ageRange: { min: null, max: null },
    },
    "Begyndere og letøvede": {
      rankRange: { min: -10.5, max: null },
      ageRange: { min: null, max: null },
    },
    "Begyndere og øvede": {
      rankRange: { min: -10.5, max: null },
      ageRange: { min: null, max: null },
    },
    "Begynder – 9. kyu": {
      rankRange: { min: -10.5, max: -9 },
      ageRange: { min: null, max: null },
    },
    "Øvet (8. kyu og op)": {
      rankRange: { min: -8, max: null },
      ageRange: { min: null, max: null },
    },
  };
  for (const [input, expected] of Object.entries(cases)) {
    it(input, () =>
      expect(getAgeAndRankFromClassName(input)).toEqual(expected),
    );
  }
});

const timeToParts = (d: Date) => [d.getHours(), d.getMinutes(), d.getSeconds()];
describe("safeParseTimeRange should parse correctly", () => {
  const now = new Date();
  const cases = {
    "10:00 - 12:00": { start: [10, 0], end: [12, 0] },
    "10:30 - 12:15": { start: [10, 30], end: [12, 15] },
    "10:00 - 12:25": { start: [10, 0], end: [12, 25] },
    "10:35 - 12:00": { start: [10, 35], end: [12, 0] },
    "10:30-12:15": { start: [10, 30], end: [12, 15] },
    "10.30 - 12.15": { start: [10, 30], end: [12, 15] },
    "10:00-12:00": { start: [10, 0], end: [12, 0] },
    "10.00 - 12.00": { start: [10, 0], end: [12, 0] },
    "10.00-12.00": { start: [10, 0], end: [12, 0] },
    "10 - 12": { start: [10, 0], end: [12, 0] },
    "10-12": { start: [10, 0], end: [12, 0] },
    "10:00-12": { start: [10, 0], end: [12, 0] },
    "10.30-12.15": { start: [10, 30], end: [12, 15] },
  };
  for (const [input, expected] of Object.entries(cases)) {
    it(`"${input}"`, () => {
      const result = safeParseTimeRange(input, now);
      expect(result).not.toBeNull();
      expect(timeToParts(result!.start)).toEqual([...expected.start, 0]);
      expect(timeToParts(result!.end)).toEqual([...expected.end, 0]);
    });
  }
});
