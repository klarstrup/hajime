import type { CheerioAPI } from "cheerio";
import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
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
  getRRuleWeekdaysByFullDanishName(line)[0] || null;
export const getRRuleWeekdaysByFullDanishName = (line: string): Weekday[] =>
  Array.from(new Set<string>(line.match(danishWeekDayREG) || [])).map(
    (match) => rruleWeekdaysByFullDanishName[match.toLowerCase()],
  );

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
      expect(getRRuleWeekdaysByFullDanishName("")).toEqual([]);
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
    if (element.type === "tag") {
      // console.log({ LEAVING: element.type, tagName: element.tagName })
      if (isBlockTag(element.tagName)) {
        text += "\n";
      }
    }
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
