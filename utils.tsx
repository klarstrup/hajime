import type { CheerioAPI } from "cheerio";
import * as cheerio from "cheerio";
import { isValid } from "date-fns";
import type { AnyNode } from "domhandler";
import { readFileSync } from "fs";
import Fuse from "fuse.js";
import type { Weekday } from "rrule";
import { RRule } from "rrule";
export const normalizeString = (str: string) =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-z0-9]/gi, " ")
    .split(" ")
    .sort((a, b) => a.localeCompare(b))
    .join(" ");

export const stringsOverlap = (aRaw: string, bRaw: string) => {
  const a = normalizeString(aRaw);
  const b = normalizeString(bRaw);

  return a.includes(b) || b.includes(a);
};

export const fuseCompare = (aRaw: string, bRaw: string) => {
  const a = normalizeString(aRaw);
  const b = normalizeString(bRaw);
  return Math.min(
    new Fuse([a], {
      includeScore: true,
      isCaseSensitive: false,
      ignoreFieldNorm: true,
      ignoreLocation: true,
      findAllMatches: true,
    }).search(b)[0]?.score || 1,
    new Fuse([b], {
      includeScore: true,
      isCaseSensitive: false,
      ignoreFieldNorm: true,
      ignoreLocation: true,
      findAllMatches: true,
    }).search(a)[0]?.score || 1,
    a === b ? 0 : 1,
  );
};

export const fuzzyOverlap = (aRaw: string, bRaw: string, threshold = 0.25) =>
  stringsOverlap(aRaw, bRaw) || fuseCompare(aRaw, bRaw) <= threshold;

export const danishFullWeekdays = [
  "Mandag",
  "Tirsdag",
  "Onsdag",
  "Torsdag",
  "Fredag",
  "Lørdag",
  "Søndag",
] as const;

const rruleWeekdaysByFullDanishName: Record<string, Weekday> = {
  mandag: RRule.MO,
  tirsdag: RRule.TU,
  onsdag: RRule.WE,
  torsdag: RRule.TH,
  fredag: RRule.FR,
  lørdag: RRule.SA,
  søndag: RRule.SU,
};
export const danishWeekDayRE =
  /(mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag)/i;
const danishWeekDayREG = new RegExp(
  danishWeekDayRE.source,
  danishWeekDayRE.flags + "g",
);
export const getRRuleWeekdayByFullDanishName = (line: string): Weekday | null =>
  getRRuleWeekdaysByFullDanishName(line)?.[0] || null;
export const getRRuleWeekdaysByFullDanishName = (
  line: string,
): [Weekday, ...Weekday[]] | null => {
  const weekdays = Array.from(
    new Set<string>(line.match(danishWeekDayREG) || []),
  ).map((match) => rruleWeekdaysByFullDanishName[match.toLowerCase()]);
  if (weekdays.length === 0) return null;
  return weekdays as [Weekday, ...Weekday[]];
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

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
      expect(getRRuleWeekdaysByFullDanishName("Onsdag Torsdag Fredag")).toEqual(
        [RRule.WE, RRule.TH, RRule.FR],
      );
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
}

const inlineElements = new Set(
  `a,abbr,acronym,audio,b,bdi,bdo,big,br,button,canvas,cite,code,data,
  datalist,del,dfn,em,embed,i,iframe,img,input,ins,kbd,label,map,mark,
  meter,noscript,object,output,picture,progress,q,ruby,s,samp,script,
  select,slot,small,span,strong,sub,sup,svg,template,textarea,time,
  tt,u,var,video,wbr`
    .split(",")
    .map((s) => s.trim()),
);
const isBlockTag = (tagName: string) => !inlineElements.has(tagName);

export function render(
  node:
    | CheerioAPI
    | Document
    | string
    | Element
    | AnyNode
    | cheerio.Cheerio<AnyNode>,
): string {
  let root:
    | AnyNode
    | Document
    | Element
    | null
    | ReturnType<ReturnType<typeof cheerio.load>>[number] = null;
  if (typeof node === "string") {
    root = cheerio.load(node)("body")[0];
  } else if (typeof node === "object" && "0" in node) {
    root = node[0] as AnyNode;
  } else if (typeof node === "object" && "children" in node && "type" in node) {
    root = node;
  }

  if (!root) {
    throw new Error(
      "node was not a string, cheerio loaded document, or a cheerio node",
    );
  }

  let text = "";

  function enter(element: AnyNode) {
    if (element.type === "text") {
      text += element.data;
    }
  }

  function leave(element: AnyNode) {
    if (element.type === "tag") if (isBlockTag(element.tagName)) text += "\n";
  }

  walk(root, enter, leave);

  return text
    .trim()
    .split(/\n+/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .replace(/\u00AD/g, "");
}

type TextTree = string | [string, ...string[]] | [TextTree, ...TextTree[]];

// Renders a node to nested lines, putting text from childdren into nested arrays
// without empty arrays and with arrays that contain a single array or string flattened
export function renderToNestedLines(
  node:
    | CheerioAPI
    | Document
    | string
    | Element
    | AnyNode
    | cheerio.Cheerio<AnyNode>,
): TextTree[] {
  let root:
    | AnyNode
    | Document
    | Element
    | null
    | ReturnType<ReturnType<typeof cheerio.load>>[number] = null;
  let roots: AnyNode[] | null = null;
  if (typeof node === "string") {
    root = cheerio.load(node)("body")[0];
  } else if (typeof node === "object" && "0" in node) {
    root = node[0] as AnyNode;
    roots = Array.from(node as ArrayLike<AnyNode>);
  } else if (typeof node === "object" && "children" in node && "type" in node) {
    root = node;
    // might be a cheerio.load returned callable CheerioAPI instance
  } else if (node instanceof cheerio.load("").constructor) {
    // @ts-expect-error - TypeScript cannot infer the type of node as a callable Cheerio instance
    root = node("body")[0];
  }

  if (!root) {
    throw new Error(
      "node was not a string, cheerio loaded document, or a cheerio node",
    );
  }

  // Inline content is joined into lines (split on <br>); block elements nest.
  function toTree(block: AnyNode): TextTree | null {
    const items: TextTree[] = [];
    let line = "";

    const flush = () => {
      const text = line
        .replace(/\u00AD/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (text) items.push(text);
      line = "";
    };

    const visit = (node: AnyNode) => {
      if (node.type === "text") {
        line += node.data;
      } else if (node.type === "tag") {
        if (node.tagName === "br") {
          flush();
        } else if (isBlockTag(node.tagName)) {
          flush();
          const child = toTree(node);
          if (child !== null) items.push(child);
        } else {
          for (const c of node.children) visit(c);
        }
      }
    };

    if (block.type === "text") visit(block);
    else if ("children" in block) for (const c of block.children) visit(c);
    flush();

    if (items.length === 0) return null;
    if (items.length === 1) return items[0];
    return items as TextTree;
  }

  let tree: TextTree | null;
  if (roots && roots.length > 1) {
    const trees = roots.map(toTree).filter((t): t is TextTree => t !== null);
    tree =
      trees.length === 0
        ? null
        : trees.length === 1
          ? trees[0]
          : (trees as TextTree);
  } else {
    tree = toTree(root as AnyNode);
  }
  if (tree === null) return [];
  return typeof tree === "string" ? [tree] : tree;
}

interface ParsedClass {
  ageRange: { min: number | null; max: number | null };
  rankRange: { min: number | null; max: number | null };
  nextStart: Date;
  nextEnd: Date;
  weekday: string;
  className: string;
  instructors?: string[];
}

export function parseClassesSchedulesTree(
  tree: TextTree[],
  now: Date,
): ParsedClass[] {
  const classes: ParsedClass[] = [];

  interface Context {
    weekdays?: Weekday[];
    timeRange?: TimeRange;
    className?: string;
    ageRange?: { min: number | null; max: number | null };
    // The weekdays in effect when className was set, to tell whether a
    // weekday came between a heading and a nested name
    classNameWeekdays?: Weekday[];
  }

  // Headings that introduce a schedule rather than name a class
  const genericHeadings = new Set([
    "træningstider",
    "træningstid",
    "træningsskema",
    "tider",
    "tider og priser",
    "hold",
    "vores hold",
    "holdoversigt",
    "holdplan",
    "skema",
  ]);

  // "Sensei A og Senpai B", "Instruktør: A, B", "Forskellige instruktører"
  const parseInstructors = (line: string): string[] | null => {
    const labeled = /^instruktø(?:r|rer)\s*:\s*(.+)$/i.exec(line)?.[1];
    if (
      !labeled &&
      !/^(sensei|senpai|senpei|sempai|shihan|hanshi|kyoshi|renshi)\b/i.test(
        line,
      ) &&
      !/\binstruktører$/i.test(line)
    ) {
      return null;
    }
    return (labeled ?? line)
      .replace(/\.$/, "")
      .split(/\s*,\s*|\s+og\s+/)
      .map((name) => name.trim())
      .filter(Boolean);
  };

  // Context flows from a node down into its nested arrays; within a node,
  // items are read in order, and a class is added as soon as an item
  // completes weekdays + timeRange + className.
  function visit(node: TextTree[], inherited: Context) {
    const data: Context = { ...inherited };
    // Classes added by the previous line, for instructors listed right after
    let justAdded: ParsedClass[] = [];

    for (const item of node) {
      const previous = justAdded;
      justAdded = [];

      if (Array.isArray(item)) {
        visit(item, data);
        continue;
      }

      const instructors = parseInstructors(item);
      if (instructors) {
        for (const parsed of previous) parsed.instructors = instructors;
        continue;
      }

      // Prose (several sentences, or very long) is a note, not schedule data
      if (item.length > 120 || /[.!?]\s+[A-ZÆØÅ]/.test(item)) continue;

      const weekdays = getRRuleWeekdaysByFullDanishName(item);
      // First time range in the line that isn't an age range ("4 – 10 år")
      const timeMatch = Array.from(
        item.matchAll(new RegExp(timeRangeRE, "g")),
      ).find((m) => !/^\s*år/i.test(item.slice(m.index + m[0].length)));
      const timeRange = timeMatch && safeParseTimeRange(timeMatch[0], now);
      let lastSet: "timeRange" | "className" | "both" | undefined;

      // "Alder: 10-13 år", "Tid: Mandag kl. 17-18", "Pris: …" - the label
      // itself is never a class name
      const label = /^([a-zæøå][^\s:]*):/i.exec(item)?.[1];
      const isLabeled = !!label && !danishWeekDayRE.test(label);
      // A single descriptive sentence, e.g. "Vi fokuserer særligt på kata."
      const isSentence = /[a-zæøå]\.$/i.test(item) && item.includes(" ");

      if (weekdays) data.weekdays = weekdays;
      if (timeRange) {
        data.timeRange = timeRange;
        lastSet = "timeRange";
      }
      // Whatever is left after removing weekdays and times names the class,
      // e.g. "Børn kl. 17–18" -> "Børn"
      const rest = item
        .replace(danishWeekDayREG, "")
        .replace(timeRange && timeMatch ? timeMatch[0] : "", "")
        .replace(/\bkl\.?(?=\s|$)/gi, "")
        .replace(/^[\s:,.–-]+|[\s:,.–-]+$/g, "")
        .trim();
      if (genericHeadings.has(rest.toLowerCase())) {
        data.className = undefined;
        continue;
      }

      // A leftover that's only a parenthetical is a note: "(opvarming fra 19:00)"
      const isNote = /^\(.*\)$/.test(rest);
      if (
        rest &&
        !isLabeled &&
        !isSentence &&
        !isNote &&
        (!weekdays || timeRange)
      ) {
        // Nested names qualify the heading above them: "Kidzz" > "3-5 år",
        // unless a weekday came in between: "Træningstider" > "Tirsdag" > "Børn"
        data.className =
          inherited.className && inherited.classNameWeekdays === data.weekdays
            ? `${inherited.className}, ${rest}`
            : rest;
        data.classNameWeekdays = data.weekdays;
        lastSet = lastSet ? "both" : "className";
      } else if (!timeRange) {
        // A standalone age line ("Alder: Fra 13 år") applies to its class
        const lineAge = getAgeAndRankFromClassName(item).ageRange;
        if (lineAge.min !== null || lineAge.max !== null) {
          data.ageRange = lineAge;
        }
      }

      const { weekdays: days, timeRange: range, className } = data;
      if (!lastSet || !days || !range || !className) continue;

      const { ageRange, rankRange } = getAgeAndRankFromClassName(className);
      const nameHasAge = ageRange.min !== null || ageRange.max !== null;

      for (const weekday of days) {
        justAdded.push({
          className,
          weekday: weekday.toString(),
          ...getNextStartAndEnd(range, weekday, now),
          ageRange: nameHasAge ? ageRange : (data.ageRange ?? ageRange),
          rankRange,
        });
      }

      if (lastSet !== "className") data.timeRange = undefined;
      if (lastSet !== "timeRange") data.className = undefined;
      classes.push(...justAdded);
    }
  }

  visit(tree, {});
  return classes;
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("renderToNestedLines", () => {
    it("should render a simple HTML string to nested lines", () => {
      const html = "<div><p>Hello</p><p>World</p></div>";
      expect(renderToNestedLines(html)).toEqual(["Hello", "World"]);
    });
    it("should keep inline elements on the same line", () => {
      const html = "<div><p>Hello <span>World <em>!</em></span></p></div>";
      expect(renderToNestedLines(html)).toEqual(["Hello World !"]);
    });
    it("should not split words across inline elements", () => {
      const html =
        "<p><strong>Begyndere og ø</strong><span><strong>vede</strong></span></p>";
      expect(renderToNestedLines(html)).toEqual(["Begyndere og øvede"]);
    });
    it("should split lines on <br>", () => {
      const html =
        "<p><strong>Kamptræning</strong><br />\n<span>18:00-20:00</span></p>";
      expect(renderToNestedLines(html)).toEqual(["Kamptræning", "18:00-20:00"]);
    });
    it("should nest block elements", () => {
      const html =
        "<div><div>Mandag:&nbsp;</div><div><p>Børnehold<br>16:30</p><p>Øvede<br>17:45</p></div></div>";
      expect(renderToNestedLines(html)).toEqual([
        "Mandag:",
        [
          ["Børnehold", "16:30"],
          ["Øvede", "17:45"],
        ],
      ]);
    });
    it("should flatten single nested arrays", () => {
      expect(renderToNestedLines("<div><p>Hello</p></div>")).toEqual(["Hello"]);
    });
    it("should return an empty array for empty content", () => {
      expect(renderToNestedLines("<div><p> </p></div>")).toEqual([]);
    });
    it("should handle multiple cheerio selections", () => {
      const $ = cheerio.load("<div><p>Hello</p><p>World</p></div>");
      expect(renderToNestedLines($("p"))).toEqual(["Hello", "World"]);
    });
    it("should handle frederiksberg-karateskole HTML structure", async () => {
      const fk$ = cheerio.load(
        readFileSync("./frederiksbergkarateskole.dk.html", "utf-8"),
      )("#main");
      const result = renderToNestedLines(fk$);

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
        renderToNestedLines(
          readFileSync("./frederiksbergkarateskole.dk.html", "utf-8"),
        ),
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
        renderToNestedLines(readFileSync("./kakushin.dk.html", "utf-8")),
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
        renderToNestedLines(readFileSync("./bskarate.dk.html", "utf-8")),
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
        renderToNestedLines(readFileSync("./farumkyokushin.dk.html", "utf-8")),
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
        renderToNestedLines(readFileSync("./kenzoku-karate.dk.html", "utf-8")),
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
        renderToNestedLines(
          readFileSync("./roskildekarateklub.dk.html", "utf-8"),
        ),
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
            ageRange: { min: 5, max: 9 },
          },
          {
            className: "Kidzz, 5-7 år",
            weekday: "TH",
            nextStart: new Date("2026-12-03T16:30:00.000Z"),
            nextEnd: new Date("2026-12-03T17:30:00.000Z"),
            rankRange: { min: null, max: -21 },
            ageRange: { min: 5, max: 9 },
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
        renderToNestedLines(
          readFileSync("./nansensgadekarate.dk.html", "utf-8"),
        ),
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
  });
}

function walk(
  root: AnyNode,
  enter: (element: AnyNode) => void,
  leave: (element: AnyNode) => void,
) {
  enter(root);
  if (root.type === "tag") for (const c of root.children) walk(c, enter, leave);

  leave(root);
}

export function getAgeAndRankFromClassName(className: string): {
  ageRange: { min: number | null; max: number | null };
  rankRange: { min: number | null; max: number | null };
} {
  className = className.trim().replace("kyu junior", "mon");
  const lClassName = className.toLowerCase();

  const ageIndices: number[] = [];
  const rankIndices: number[] = [];
  let ageResult;
  const ageRegex = /år/gi;
  while ((ageResult = ageRegex.exec(lClassName)))
    ageIndices.push(ageResult.index);
  let rankResult;
  const tierRegex = /kyu|mon|dan/gi;
  while ((rankResult = tierRegex.exec(lClassName)))
    rankIndices.push(rankResult.index);

  const ageMentions: string[] = [];
  const rankMentions: string[] = [];

  let lastIndex = -1;
  for (const m of [...ageIndices, ...rankIndices].sort((a, b) => a - b)) {
    if (rankIndices.includes(m)) {
      rankMentions.push(
        lClassName.slice(lastIndex === -1 ? 0 : lastIndex + 2, m),
      );
    }
    if (ageIndices.includes(m)) {
      ageMentions.push(
        lClassName.slice(lastIndex === -1 ? 0 : lastIndex + 3, m),
      );
    }
    lastIndex = m;
  }

  const cleanRankTier = lClassName.match(tierRegex)?.[0]?.toLowerCase();
  const cleanAgeMentions = ageMentions
    .flatMap((m) => [
      m.match(/\d+/g)?.map(Number) || [],
      m.match(/begyndere?/gi)?.map(() => 10.5) || [],
    ])
    .flat();
  const cleanRankMentions = rankMentions
    .flatMap((m) => m.match(/\d+/g)?.map(Number) || [])
    .filter((n, i, arr) => arr.indexOf(n) === i)
    .map((n) =>
      cleanRankTier === "mon" ? -n - 10 : cleanRankTier === "dan" ? -n - 1 : -n,
    );

  const ageRange: { min: number | null; max: number | null } = {
    min: null,
    max: null,
  };

  if (lClassName.includes("mini bushi")) {
    ageRange.min = 3;
    ageRange.max = 5;
  }
  if (lClassName.includes("forældre/børn")) {
    ageRange.min = 5;
    ageRange.max = 9;
  }

  const minSuffixAge = /([1-9][0-9])\+/i.exec(lClassName)?.[1];
  if (minSuffixAge) ageRange.min = parseInt(minSuffixAge, 10);
  const minPrefixAge = /(\+|minimum|fra) ?([1-9][0-9]) år/i.exec(
    lClassName,
  )?.[2];
  if (minPrefixAge) ageRange.min = parseInt(minPrefixAge, 10);
  const maxAgeMatch = /til og med ([1-9][0-9]) år/i.exec(lClassName)?.[1];
  if (maxAgeMatch) ageRange.max = parseInt(maxAgeMatch, 10);

  if (cleanAgeMentions.length > 1) {
    ageRange.min = Math.min(...cleanAgeMentions);
    ageRange.max = Math.max(...cleanAgeMentions);
  }

  if (lClassName.includes("alle aldre")) {
    ageRange.min = null;
    ageRange.max = null;
  }

  if (lClassName.includes("kidzz")) {
    ageRange.min = 5;
    ageRange.max = 9;
  }
  if (lClassName.includes("karate kids")) {
    ageRange.min = 6;
    ageRange.max = 8;
  }

  const rankRange: { min: number | null; max: number | null } = {
    min: -10.5,
    max: null,
  };

  if (lClassName.includes("børn") && !lClassName.includes("unge")) {
    rankRange.min = null;
    rankRange.max = -11;
  }
  if (
    lClassName.includes("mini bushi") ||
    lClassName.includes("kidzz") ||
    lClassName.includes("karate kids")
  ) {
    rankRange.min = null;
    rankRange.max = -21;
  }

  if (lClassName.includes("forældre")) {
    rankRange.max = -21;
  }

  const minKyuMatch = /^(\d+)\. kyu/i.exec(lClassName)?.[1];
  if (minKyuMatch) rankRange.min = -parseInt(minKyuMatch, 10);

  const minPrefixedKyuMatch = /(minimum|min\.|fra).*(10|[1-9])\. kyu/i.exec(
    lClassName,
  )?.[2];
  if (minPrefixedKyuMatch) rankRange.min = -parseInt(minPrefixedKyuMatch, 10);
  const minSuffixedKyuMatch = /(\d+)\.? kyu ?[-+|og op]/i.exec(lClassName)?.[1];
  if (minSuffixedKyuMatch) rankRange.min = -parseInt(minSuffixedKyuMatch, 10);
  const maxKyuMatch = /til og med (\d+)\. kyu/i.exec(lClassName)?.[1];
  if (maxKyuMatch) rankRange.max = -parseInt(maxKyuMatch, 10);
  const maxKyuMatch2 = /[-–] (\d+)\. kyu/i.exec(lClassName)?.[1];
  if (maxKyuMatch2) rankRange.max = -parseInt(maxKyuMatch2, 10);
  if (cleanRankMentions.length > 1) {
    rankRange.min = Math.min(...cleanRankMentions);
    rankRange.max = Math.max(...cleanRankMentions);
  }

  const monMax = /til.*(10|[1-9])\. mon/i.exec(lClassName)?.[1];
  if (monMax) rankRange.max = -parseInt(monMax, 10) - 10;
  const monMin = /(10|[1-9])\. mon(.+)(og op|\+)/i.exec(lClassName)?.[1];
  if (monMin) rankRange.min = -parseInt(monMin, 10) - 10;

  if (lClassName.includes("voksne") && lClassName.includes("begyndere")) {
    rankRange.min = -10.5;
  }
  if (lClassName.includes("børn") && lClassName.includes("begyndere")) {
    rankRange.min = -20.5;
  }

  if (ageRange.max !== null && ageRange.max < 13) {
    rankRange.min = null;
  }

  if (
    lClassName.includes("øvede") &&
    !lClassName.includes("begyndere") &&
    (!rankRange.min || rankRange.min === -10.5) &&
    (!ageRange.max || ageRange.max > 13)
  ) {
    rankRange.min = -10;
  }
  return { rankRange, ageRange };
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
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
}

export const timeRangeRE =
  /(\d{1,2})([:\.]\d{2})? ?[–-] ?(\d{1,2})([:\.]\d{2})?/;
export const timeRangeRE2 =
  /(\d{1,2}(?:[:\.]\d{2})? ?[–-] ?\d{1,2}(?:[:\.]\d{2})?)/;
export const timeSeparatorRE = / ?[–-] ?/;
export const hoursMinutesSeparatorRE = /[:\.]/;

export interface TimeRange {
  start: Date;
  end: Date;
}
export const isValidTimeRange = (timeRange: unknown): timeRange is TimeRange =>
  typeof timeRange === "object" &&
  timeRange !== null &&
  "start" in timeRange &&
  "end" in timeRange &&
  isValid((timeRange as TimeRange).start) &&
  isValid((timeRange as TimeRange).end);
export const safeParseTimeRange = (timeRangeStr: string, now: Date) => {
  if (!timeRangeStr.match(/\d/gi)) return null;
  if (timeRangeStr.match(/år/gi)) return null;
  const matches = timeRangeStr.match(timeRangeRE)?.slice(1) || [];
  const [startHourStr, startMinuteStr, endHourStr, endMinuteStr] = matches;

  const startHour = parseInt(startHourStr, 10);
  const startMinute = isNaN(startHour)
    ? NaN
    : parseInt(startMinuteStr?.replace(/^[:\.]/, "") ?? "0", 10);
  const endHour = parseInt(endHourStr, 10);
  const endMinute = isNaN(endHour)
    ? NaN
    : parseInt(endMinuteStr?.replace(/^[:\.]/, "") ?? "0", 10);

  if ([startHour, startMinute, endHour, endMinute].some((v) => isNaN(v)))
    return null;

  const start = new Date(now);
  start.setHours(startHour, startMinute, 0, 0);

  const end = new Date(now);
  end.setHours(endHour, endMinute, 0, 0);

  return { start, end };
};
if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  const timeToParts = (d: Date) => [
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
  ];
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
}

export function getNextStartAndEnd(
  timeRange: { start: Date; end: Date },
  weekday: Weekday,
  now: Date,
) {
  const nextStart = new RRule({
    byweekday: weekday,
    freq: RRule.WEEKLY,
    dtstart: timeRange.start,
  }).after(now);

  if (!nextStart) throw new Error("Could not determine next start date");

  const duration = timeRange.end.getTime() - timeRange.start.getTime();
  const nextEnd = new Date(nextStart.getTime() + duration);

  return { nextStart, nextEnd };
}

export const dkuRanks = [
  {
    index: -20.5,
    name: "white belt",
    slug: "white-belt-mon",
    colors: ["#fff"],
  },
  {
    index: -20,
    name: "10. mon",
    slug: "10-mon",
    colors: ["#fff", "#f60", "#fff"],
  },
  {
    index: -19,
    name: "9. mon",
    slug: "9-mon",
    colors: ["#fff", "#f60", "#fff"],
  },
  {
    index: -18,
    name: "8. mon",
    slug: "8-mon",
    colors: ["#fff", "#04a", "#fff"],
  },
  {
    index: -17,
    name: "7. mon",
    slug: "7-mon",
    colors: ["#fff", "#04a", "#fff"],
  },
  {
    index: -16,
    name: "6. mon",
    slug: "6-mon",
    colors: ["#fff", "#fc0", "#fff"],
  },
  {
    index: -15,
    name: "5. mon",
    slug: "5-mon",
    colors: ["#fff", "#fc0", "#fff"],
  },
  {
    index: -14,
    name: "4. mon",
    slug: "4-mon",
    colors: ["#fff", "#217821", "#fff"],
  },
  {
    index: -13,
    name: "3. mon",
    slug: "3-mon",
    colors: ["#fff", "#217821", "#fff"],
  },
  {
    index: -12,
    name: "2. mon",
    slug: "2-mon",
    colors: ["#fff", "#784421", "#fff"],
  },
  {
    index: -11,
    name: "1. mon",
    slug: "1-mon",
    colors: ["#fff", "#784421", "#fff"],
  },
  {
    index: -10.5,
    name: "white belt",
    slug: "white-belt-kyu",
    colors: ["#fff"],
  },
  {
    index: -10,
    name: "10. kyu",
    slug: "10-kyu",
    colors: ["#f60"],
  },
  {
    index: -9,
    name: "9. kyu",
    slug: "9-kyu",
    colors: ["#f60"],
  },
  {
    index: -8,
    name: "8. kyu",
    slug: "8-kyu",
    colors: ["#04a"],
  },
  {
    index: -7,
    name: "7. kyu",
    slug: "7-kyu",
    colors: ["#04a"],
  },
  {
    index: -6,
    name: "6. kyu",
    slug: "6-kyu",
    colors: ["#fc0"],
  },
  {
    index: -5,
    name: "5. kyu",
    slug: "5-kyu",
    colors: ["#fc0"],
  },
  {
    index: -4,
    name: "4. kyu",
    slug: "4-kyu",
    colors: ["#217821"],
  },
  {
    index: -3,
    name: "3. kyu",
    slug: "3-kyu",
    colors: ["#217821"],
  },
  {
    index: -2,
    name: "2. kyu",
    slug: "2-kyu",
    colors: ["#784421"],
  },
  {
    index: -1,
    name: "1. kyu",
    slug: "1-kyu",
    colors: ["#784421"],
  },
  {
    index: 0,
    name: "dan",
    slug: "dan",
    colors: ["#333"],
    stripes: ["gold"],
  },
] as const;
