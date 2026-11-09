import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";
import { AnyNode } from "domhandler";
import Fuse from "fuse.js";
import { RRule, Weekday } from "rrule";
import model from "wink-eng-lite-web-model";
import winkNLP from "wink-nlp";

export const nlp = winkNLP(model);
// Obtain "its" helper to extract item properties.
export const its = nlp.its;
// Obtain "as" reducer helper to reduce a collection.
export const as = nlp.as;

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
