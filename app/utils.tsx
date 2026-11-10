import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";
import { AnyNode } from "domhandler";
import Fuse from "fuse.js";
import { RRule, Weekday } from "rrule";
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
export const getRRuleWeekdayByFullDanishName = (line: string): Weekday | null =>
  rruleWeekdaysByFullDanishName[line.toLowerCase().trim()] || null;

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
    .join("\n");
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
  const lClassName = className.toLowerCase();

  const ageRange: { min: number | null; max: number | null } = {
    min: null,
    max: null,
  };
  const rankRange: { min: number | null; max: number | null } = {
    min: -10.5,
    max: null,
  };

  if (lClassName.includes("voksne") || lClassName.includes("kamphold")) {
    rankRange.min = -10.5;
    rankRange.max = null;
  }

  if (lClassName.includes("børn")) {
    rankRange.min = null;
    rankRange.max = -11;
  }

  if (lClassName.includes("børn")) {
    rankRange.min = null;
    rankRange.max = -11;
  }

  if (lClassName.includes("voksne") || lClassName.includes("kamphold")) {
    rankRange.min = -10.5;
    rankRange.max = null;
  }
  if (lClassName.includes("forældre/børn")) {
    ageRange.min = 5;
    ageRange.max = 9;
    rankRange.max = -21;
  }

  if (lClassName.includes("kids")) {
    rankRange.min = null;
    rankRange.max = -11;
  }
  if (lClassName.includes("mini bushi")) {
    ageRange.min = 3;
    ageRange.max = 5;
    rankRange.max = -21;
  }

  const minKyuMatch = /(minimum|min\.)(.*) (10|[1-9])\. kyu/i.exec(lClassName);
  if (minKyuMatch) rankRange.min = -parseInt(minKyuMatch[3], 10);
  const minKyuMatch2 = /(\d+)\. kyu og højere/i.exec(lClassName);
  if (minKyuMatch2) rankRange.min = -parseInt(minKyuMatch2[1], 10);
  const minKyuMatch3 = /(\d+)\. kyu \+/i.exec(lClassName);
  if (minKyuMatch3) rankRange.min = -parseInt(minKyuMatch3[1], 10);
  const minAgeMatch = /minimum (\d+) år/i.exec(lClassName);
  if (minAgeMatch) ageRange.min = parseInt(minAgeMatch[1], 10);
  const minAgeMatch2 = /fra ([0-9]+) år/i.exec(lClassName);
  if (minAgeMatch2) ageRange.min = parseInt(minAgeMatch2[1], 10);
  const maxAgeMatch = /maksimum (\d+) år/i.exec(lClassName);
  if (maxAgeMatch) ageRange.max = parseInt(maxAgeMatch[1], 10);
  const maxAgeMatch2 = /til og med (\d+) år/i.exec(lClassName);
  if (maxAgeMatch2) ageRange.max = parseInt(maxAgeMatch2[1], 10);
  //f.x.   "className": "9. kyu (fra 15 år) samt 8. og 7. kyu (alle aldre)",
  // if it lists multiple grades, e.g., "9. kyu (fra 15 år) samt 8. og 7. kyu (alle aldre)",
  // we will need to get at least the highest and lowest rank mentioned in the className

  const kyuGrades = /(10|[1-9])\.-(10|[1-9]). kyu/gi
    .exec(className)
    ?.slice(1, 3)
    .map((m) => parseInt(m, 10));
  if (kyuGrades && kyuGrades?.length > 1) {
    rankRange.min = -Math.max(...kyuGrades);
    rankRange.max = -Math.min(...kyuGrades);
  }
  const monGrades = /(10|[1-9])\.-(10|[1-9]). mon/gi
    .exec(className)
    ?.slice(1, 3)
    .map((m) => parseInt(m, 10));
  if (monGrades && monGrades?.length > 1) {
    rankRange.min = -Math.max(...monGrades) - 10;
    rankRange.max = -Math.min(...monGrades) - 10;
  }

  const minKyuMatch1 = /(minimum|min\.)(.*) (10|[0-9])\. kyu/i.exec(lClassName);
  if (minKyuMatch1) rankRange.min = -parseInt(minKyuMatch1[3], 10);
  const minKyuMatch12 = /(\d+)\. kyu og højere/i.exec(lClassName);
  if (minKyuMatch12) rankRange.min = -parseInt(minKyuMatch12[1], 10);
  const minAgeMatch1 = /minimum (\d+) år/i.exec(lClassName);
  if (minAgeMatch1) ageRange.min = parseInt(minAgeMatch1[1], 10);
  const minAgeMatch12 = /fra ([0-9]+) år/i.exec(lClassName);
  if (minAgeMatch12) ageRange.min = parseInt(minAgeMatch12[1], 10);
  const maxAgeMatch1 = /maksimum (\d+) år/i.exec(lClassName);
  if (maxAgeMatch1) ageRange.max = parseInt(maxAgeMatch1[1], 10);
  const maxAgeMatch12 = /til og med (\d+) år/i.exec(lClassName);
  if (maxAgeMatch12) ageRange.max = parseInt(maxAgeMatch12[1], 10);
  //f.x.   "className": "9. kyu (fra 15 år) samt 8. og 7. kyu (alle aldre)",
  // if it lists multiple grades, e.g., "9. kyu (fra 15 år) samt 8. og 7. kyu (alle aldre)",
  // we will need to get at least the highest and lowest rank mentioned in the className

  const grades = [
    ...className.matchAll(
      /(?<!\d)(\d+)\.(?=(?:[\s,.-]+(?:og\s+)?\d+\.)*[\s,.-]*(?:og\s+)?kyu\b)/gi,
    ),
  ]
    .map((match) => Number(match[1]))
    .filter((n, i, arr) => arr.indexOf(n) === i);
  if (grades.length > 1) {
    rankRange.min = -Math.max(...grades);
    rankRange.max = -Math.min(...grades);
  }

  const minKyuMatch33 = /(minimum|min\.)(.*) (10|[1-9])\. kyu/i.exec(
    lClassName,
  );
  if (minKyuMatch33) rankRange.min = -parseInt(minKyuMatch33[3], 10);
  const minKyuMatch32 = /(\d+)\. kyu og højere/i.exec(lClassName);
  if (minKyuMatch32) rankRange.min = -parseInt(minKyuMatch32[1], 10);
  const minAgeMatch3 = /minimum (\d+) år/i.exec(lClassName);
  if (minAgeMatch3) ageRange.min = parseInt(minAgeMatch3[1], 10);
  const minAgeMatch32 = /fra ([0-9]+) år/i.exec(lClassName);
  if (minAgeMatch32) ageRange.min = parseInt(minAgeMatch32[1], 10);
  const maxAgeMatch3 = /maksimum (\d+) år/i.exec(lClassName);
  if (maxAgeMatch3) ageRange.max = parseInt(maxAgeMatch3[1], 10);
  const maxAgeMatch32 = /til og med (\d+) år/i.exec(lClassName);
  if (maxAgeMatch32) ageRange.max = parseInt(maxAgeMatch32[1], 10);

  const gradesAndTier = /(10|[1-9])\.-(10|[1-9]). (kyu|mon)/gi.exec(className);

  const gradez = gradesAndTier?.slice(1, 3).map((m) => parseInt(m, 10));
  const tier = gradesAndTier?.[3] === "kyu" ? "kyu" : "mon";

  if (gradez && gradez?.length > 1) {
    rankRange.min = -Math.max(...gradez) - (tier === "mon" ? 10 : 0);
    rankRange.max = -Math.min(...gradez) - (tier === "mon" ? 10 : 0);
  }

  const monMaxMatch = /til.*(10|[1-9])\. mon/i.exec(lClassName);
  if (monMaxMatch) rankRange.max = -parseInt(monMaxMatch[1], 10) - 10;
  const monMinMatch =
    /(10|[1-9])\. mon(.+)og op/i.exec(lClassName) ||
    /(10|[1-9])\. mon \+/i.exec(lClassName);
  if (monMinMatch) rankRange.min = -parseInt(monMinMatch[1], 10) - 10;

  if (lClassName.includes("voksne") && lClassName.includes("begyndere")) {
    rankRange.min = -10.5;
  }
  if (lClassName.includes("børn") && lClassName.includes("begyndere")) {
    rankRange.min = -20.5;
  }
  if (lClassName.includes("kidzz")) {
    ageRange.min = 5;
    ageRange.max = 9;
    rankRange.max = -21.5;
  }

  return { rankRange, ageRange };
}
