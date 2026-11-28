import type { CheerioAPI } from "cheerio";
import * as cheerio from "cheerio";
import { isValid } from "date-fns";
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
  monday: RRule.MO,
  tuesday: RRule.TU,
  wednesday: RRule.WE,
  thursday: RRule.TH,
  friday: RRule.FR,
  saturday: RRule.SA,
  sunday: RRule.SU,
};
// Danish and English, singular and plural ("mandage", "Tuesdays")
export const danishWeekDayRE =
  /\b(mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:e|s)?\b/i;
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
  ).map(
    (match) =>
      rruleWeekdaysByFullDanishName[
        match.toLowerCase().replace(/(?<=dag)e$|(?<=day)s$/, "")
      ],
  );
  if (weekdays.length === 0) return null;
  return weekdays as [Weekday, ...Weekday[]];
};

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
    .replace(/[\u00AD\u200B-\u200D\uFEFF]/g, "");
}

type TextTree = string | [string, ...string[]] | [TextTree, ...TextTree[]];

// Renders a node to nested lines, putting text from childdren into nested arrays
// without empty arrays and with arrays that contain a single array or string flattened
// Top-level CSS rules, skipping @media and other at-rule blocks, which only
// apply some of the time
function topLevelCssRules(css: string) {
  const rules: { selectors: string; declarations: string }[] = [];
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let depth = 0;
  let start = 0;
  let selectors = "";
  let inAtRule = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === "{") {
      if (depth === 0) {
        selectors = text.slice(start, i).trim();
        inAtRule = selectors.startsWith("@");
        start = i + 1;
      }
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        if (!inAtRule) {
          rules.push({ selectors, declarations: text.slice(start, i) });
        }
        start = i + 1;
      }
    } else if (char === ";" && depth === 0) {
      // @import, @charset
      start = i + 1;
    }
  }
  return rules;
}

// Elements the page hides from visitors: the hidden attribute, inline
// display:none, or a display:none rule in the page's own stylesheets. Pages
// keep outdated content around this way.
function getHiddenNodes(node: AnyNode) {
  let documentRoot = node;
  while (documentRoot.parent) documentRoot = documentRoot.parent;
  const $ = cheerio.load(documentRoot);

  const hidden = new Set<AnyNode>(
    $(
      '[hidden], [style*="display:none" i], [style*="display: none" i]',
    ).toArray(),
  );
  for (const style of $("style").toArray()) {
    for (const rule of topLevelCssRules($(style).text())) {
      if (!/display\s*:\s*none/i.test(rule.declarations)) continue;
      for (const selector of rule.selectors.split(",")) {
        try {
          for (const el of $(selector.trim()).toArray()) hidden.add(el);
        } catch {
          // Selectors cheerio can't match, like :hover
        }
      }
    }
  }
  return hidden;
}

export function renderTextTree(
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

  const hidden = getHiddenNodes(root as AnyNode);

  // Inline content is joined into lines (split on <br>); block elements nest.
  function toTree(block: AnyNode): TextTree | null {
    const items: TextTree[] = [];
    let line = "";

    const flush = () => {
      const text = line
        .replace(/[\u00AD\u200B-\u200D\uFEFF]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (text) items.push(text);
      line = "";
    };

    const visit = (node: AnyNode) => {
      if (hidden.has(node)) return;
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

export interface ParseClassesOptions {
  // Use this name for every class, for pages that don't name their classes:
  // "mandag fra 18.00 til 19.30 i lokale 1.1"
  className?: string;
}

export function parseClassesSchedulesTree(
  tree: TextTree[],
  now: Date,
  options: ParseClassesOptions = {},
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
    instructors?: string[];
  }

  // Headings that introduce a schedule rather than name a class
  const genericHeadings = new Set([
    "træningstider",
    "træningstid",
    "træningsskema",
    "tider",
    "hold",
    "vores hold",
    "holdoversigt",
    "holdplan",
    "skema",
    "priser",
    "sted",
    "tid og sted",
    "schedule",
    "timetable",
    "training times",
    "location",
    // Navigation that ends up above everything
    "skip to content",
    "spring til indhold",
    "gå til indhold",
  ]);
  // Also headings made of several: "Tider og priser", "Schedule/ Location"
  const isGenericHeading = (text: string) =>
    text
      .toLowerCase()
      .split(/\s*[/&]\s*|\s+(?:og|and)\s+/)
      .every((part) => genericHeadings.has(part));

  // "Sensei A og Senpai B", "Instruktør: A, B", "Forskellige instruktører"
  const parseInstructors = (line: string): string[] | null => {
    const labeled = /^(?:instruktø(?:r|rer)|undervisere?)\s*:\s*(.+)$/i.exec(
      line,
    )?.[1];
    // A title followed by a capitalised name; "Senpai hold" is a class
    const initial =
      /^(?:sensei|senpai|senpei|sempai|shihan|hanshi|kyoshi|renshi)\s+(\S)/i.exec(
        line,
      )?.[1];
    const isTitled = !!initial && initial !== initial.toLowerCase();
    if (!labeled && !isTitled && !/\binstruktører$/i.test(line)) {
      return null;
    }
    return splitInstructors(labeled ?? line);
  };
  const splitInstructors = (names: string) =>
    names
      // A full stop ends the sentence, unless it's an initial: "Senpai Per A."
      .replace(/(?<!\b\p{L})\.$/u, "")
      .split(/\s*[,/]\s*|\s+(?:og|eller|and|or)\s+/)
      .map((name) => name.trim())
      .filter(Boolean);

  // Context flows from a node down into its nested arrays; within a node,
  // items are read in order, and a class is added as soon as an item
  // completes weekdays + timeRange + className.
  const isWeekdayList = (item: TextTree): item is [string, ...string[]] =>
    Array.isArray(item) &&
    item.every((s) => typeof s === "string" && danishWeekDayRE.test(s));
  const isTimeList = (item: TextTree): item is [string, ...string[]] =>
    Array.isArray(item) &&
    item.every((s) => typeof s === "string" && timeRangeRE.test(s));

  // Table columns: ["Tirsdag", "Torsdag"], ["17:00-18:30", "18:30-20:00"]
  // become rows: ["Tirsdag", "17:00-18:30"], ["Torsdag", "18:30-20:00"]
  const zipColumns = (node: TextTree[]): TextTree[] => {
    const result: TextTree[] = [];
    for (let i = 0; i < node.length; i++) {
      const days = node[i];
      const times = node[i + 1];
      if (
        isWeekdayList(days) &&
        isTimeList(times) &&
        days.length === times.length
      ) {
        result.push(...days.map((day, j) => [day, times[j]] as TextTree));
        i++;
      } else {
        result.push(days);
      }
    }
    return result;
  };

  // A line that can only be a class name: no time, weekday, label,
  // instructors or prose
  const isPlainName = (item: TextTree | undefined) =>
    typeof item === "string" &&
    !timeRangeRE.test(item) &&
    !danishWeekDayRE.test(item) &&
    !parseInstructors(item) &&
    !/^([a-zæøå][^\s:]*):|^alder\b|^@|^\(.*\)$/i.test(item) &&
    !/[.!?]\s+[A-ZÆØÅ]/.test(item) &&
    !/[a-zæøå]\.$/i.test(item) &&
    !isGenericHeading(item);

  // Details a node gives for the classes beside it, not just inside it
  type Beside = Pick<Context, "ageRange" | "instructors">;

  function visit(node: TextTree[], inherited: Context): Beside {
    const data: Context = { ...inherited };
    // Classes added by the previous line, for instructors listed right after
    let justAdded: ParsedClass[] = [];
    // Whether this node has named a class itself, or only inherited one
    let namedHere = false;
    // A name set in this node that no class has used yet
    let nameUnused = false;
    // "Alder: …" and instructor lines in this node also apply beside it
    const beside: Beside = {};
    let previousWasInstructors = false;
    // The heading above this node, until a generic heading cuts it off
    let inheritedName = inherited.className;

    const items = zipColumns(node);
    for (const [index, entry] of items.entries()) {
      const previous = justAdded;
      justAdded = [];

      if (Array.isArray(entry)) {
        previousWasInstructors = false;
        const classCount = classes.length;
        const childBeside = visit(entry, data);
        // Details given beside the times rather than above them:
        // [["Alder: 6-15 år", "Underviser: Senpai Jesper"], ["MANDAG", "…"]]
        if (classes.length === classCount) {
          data.ageRange = childBeside.ageRange ?? data.ageRange;
          data.instructors = childBeside.instructors ?? data.instructors;
        }
        continue;
      }

      // "fra 18.00 til 19.30" -> "18.00-19.30"
      const item = entry.replace(
        /\b(?:fra\s+)?(\d{1,2}[:.]\d{2})\s+til\s+(\d{1,2}[:.]\d{2})\b/gi,
        "$1-$2",
      );

      const instructors = parseInstructors(item);
      if (instructors) {
        // After a class it's that class's; before one, it's for what follows
        if (previous.length) {
          for (const parsed of previous) parsed.instructors = instructors;
        } else {
          // Instructor lines in a row add up
          const listed = previousWasInstructors ? (data.instructors ?? []) : [];
          data.instructors = [...listed, ...instructors];
          beside.instructors = data.instructors;
        }
        previousWasInstructors = true;
        continue;
      }
      previousWasInstructors = false;

      // First time range in the line that isn't an age range ("4 – 10 år")
      const timeMatch = Array.from(
        item.matchAll(new RegExp(timeRangeRE, "g")),
      ).find(
        (m) =>
          !/^\s*(?:år|years?|yrs?)\b/i.test(item.slice(m.index + m[0].length)),
      );
      const timeRange = timeMatch && safeParseTimeRange(timeMatch[0], now);

      // Text after the time as its own sentence names the instructors:
      // "kl. 18.30 - 20.00. Senpai Leif / Ulrik"
      const timeEnd = timeMatch ? timeMatch.index + timeMatch[0].length : -1;
      const trailing = timeRange
        ? /^\.\s+(\S.*)$/.exec(item.slice(timeEnd))?.[1]
        : undefined;
      let line = trailing ? item.slice(0, timeEnd) : item;

      // A venue ("… @Bokselokalet, Nørrebrohallen", or "@Rört" on its own)
      // isn't part of the class
      line = line.replace(/(?:^|\s)@\S.*$/, "").trim();
      if (!line) continue;

      // "Fight class with Senpai Kristoffer"
      const withMatch = /\s+(?:with|med)\s+(.+)$/i.exec(line);
      const withInstructors = withMatch && parseInstructors(withMatch[1]);
      if (withMatch && withInstructors) line = line.slice(0, withMatch.index);

      const lineInstructors = trailing
        ? (parseInstructors(trailing) ?? splitInstructors(trailing))
        : (withInstructors ?? undefined);

      // Prose (several sentences, or very long) is a note, not schedule data
      if (line.length > 120 || /[.!?]\s+[A-ZÆØÅ]/.test(line)) continue;

      const weekdays = getRRuleWeekdaysByFullDanishName(line);
      let lastSet: "timeRange" | "className" | "both" | undefined;

      // "Alder: 10-13 år", "Tid: Mandag kl. 17-18", "Pris: …" - the label
      // itself is never a class name
      const label = /^([a-zæøå][^\s:]*):/i.exec(line)?.[1];
      const isLabeled =
        (!!label && !danishWeekDayRE.test(label)) ||
        // "Alder fra 6 -10 år", without the colon
        /^alder\b/i.test(line);
      // A single descriptive sentence, e.g. "Vi fokuserer særligt på kata."
      const isSentence =
        /[a-zæøå]\.$/i.test(line) &&
        line.includes(" ") &&
        !/\b(?:etc|inkl|osv|mm|ca|evt)\.$/i.test(line);

      if (weekdays) data.weekdays = weekdays;
      if (timeRange) {
        data.timeRange = timeRange;
        lastSet = "timeRange";
      }
      // Whatever is left after removing weekdays and times names the class,
      // e.g. "Børn kl. 17–18" -> "Børn"
      // When a weekday comes before the time, that's the schedule, and a
      // weekday after it is part of the name: "Friday 16:15-18:45 – Friday Fight"
      const [beforeTime, afterTime] =
        timeRange && timeMatch
          ? [line.slice(0, timeMatch.index), line.slice(timeEnd)]
          : [line, ""];
      const scheduleFirst = danishWeekDayRE.test(beforeTime);
      const weekdayIndex = line.search(danishWeekDayRE);
      const nameFirst =
        weekdayIndex > 0 && /[a-zæøå]/i.test(line.slice(0, weekdayIndex));
      const rest = (
        beforeTime.replace(danishWeekDayREG, "") +
        " " +
        (scheduleFirst ? afterTime : afterTime.replace(danishWeekDayREG, ""))
      )
        .replace(/\bkl\.?(?=\s|$)/gi, "")
        // Team numbers: "Kamphold tirsdag | 20"
        .replace(/\s*\|\s*\d+\s*$/, "")
        .replace(/\s+/g, " ")
        // Connectors left dangling once weekdays and times are removed:
        // "Voksne træner mandag og torsdag kl. 18-19" -> "Voksne træner og"
        .replace(/^(?:[\s:,.–-]|(?:og|samt|hver)\b)+/i, "")
        .replace(/(?:[\s:,.–-]|\b(?:og|samt|hver|træner|på|om|i)\b)+$/i, "")
        .trim();
      if (isGenericHeading(rest)) {
        // A new section starts: nothing named above it applies
        data.className = undefined;
        inheritedName = undefined;
        nameUnused = false;
        continue;
      }

      // A leftover that's only a parenthetical is a note: "(opvarming fra 19:00)"
      const isNote = /^\(.*\)$/.test(rest);
      // Prices: "440 kr. halvårligt", "671 DKK"
      const isPrice = /\d\s*(?:kr\b|dkk\b|,-)/i.test(rest);
      // Contact details: "middelfart@kyokushin.dk", "www.…", "Tlf. 2624 2171"
      const isContact = /\S@\S|https?:\/\/|\bwww\.|\btlf\b/i.test(rest);
      // A name line right after an unused name is a subtitle, venue or the
      // like: ["Nybegynder", "Idrætslokale 1", "Mandag kl. 18-19.30"]
      const isSubtitle = nameUnused && !timeRange;
      if (
        !options.className &&
        rest &&
        !isLabeled &&
        !isSentence &&
        !isNote &&
        !isPrice &&
        !isContact &&
        // Names start with a capital or a digit; "mødes Junior holdet" is
        // what's left of a sentence
        !/^[a-zæøå]/.test(rest) &&
        !isSubtitle &&
        // A weekday on its own line is a schedule ("Tuesday HAL 3 gym"),
        // unless a name comes first: "Kamphold tirsdag"
        (!weekdays || timeRange || nameFirst)
      ) {
        // Nested names qualify the heading above them: "Kidzz" > "3-5 år",
        // unless a weekday came in between: "Træningstider" > "Tirsdag" > "Børn"
        data.className =
          inheritedName && inherited.classNameWeekdays === data.weekdays
            ? `${inheritedName}, ${rest}`
            : rest;
        data.classNameWeekdays = data.weekdays;
        namedHere = true;
        nameUnused = true;
        lastSet = lastSet ? "both" : "className";
      } else if (!timeRange) {
        // A standalone age line ("Alder: Fra 13 år") applies to its class
        const lineAge = getAgeAndRankFromClassName(item).ageRange;
        if (lineAge.min !== null || lineAge.max !== null) {
          data.ageRange = lineAge;
          if (/^alder\b/i.test(item)) beside.ageRange = lineAge;
        }
      }

      const { weekdays: days, timeRange: range } = data;
      const className = options.className ?? data.className;
      if (!lastSet || !days || !range || !className) continue;
      // A time before its name: ["18:00 – 19:00:", "Mon hold"]
      if (
        lastSet === "timeRange" &&
        !namedHere &&
        !options.className &&
        isPlainName(items[index + 1])
      ) {
        continue;
      }

      const { ageRange, rankRange } = getAgeAndRankFromClassName(className);
      const nameHasAge = ageRange.min !== null || ageRange.max !== null;

      for (const weekday of days) {
        justAdded.push({
          className,
          weekday: weekday.toString(),
          ...getNextStartAndEnd(range, weekday, now),
          ageRange: nameHasAge ? ageRange : (data.ageRange ?? ageRange),
          rankRange,
          ...((lineInstructors ?? data.instructors) && {
            instructors: lineInstructors ?? data.instructors,
          }),
        });
      }

      if (lastSet !== "className") data.timeRange = undefined;
      if (lastSet !== "timeRange") data.className = undefined;
      nameUnused = false;
      classes.push(...justAdded);
    }

    return beside;
  }

  visit(tree, {});

  return classes;
}
export const renderClasses = (
  node: Parameters<typeof renderTextTree>[0],
  now: Date,
  options?: ParseClassesOptions,
) => parseClassesSchedulesTree(renderTextTree(node), now, options);

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
  className = className
    .trim()
    .replace("kyu junior", "mon")
    // "6-16 year old", "16+ years old"
    .replace(/\b(?:years?|yrs?)(?: old)?\b/gi, "år");
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
  // "15 år og op", "15 år og opefter"
  const minSuffixWordAge = /([1-9][0-9]) år og op/i.exec(lClassName)?.[1];
  if (minSuffixWordAge) ageRange.min = parseInt(minSuffixWordAge, 10);
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

  // Default ages for named kids' programmes, unless the name gives them
  const hasExplicitAge = ageRange.min !== null || ageRange.max !== null;
  if (!hasExplicitAge && /\bkidzz?\b/.test(lClassName)) {
    ageRange.min = 5;
    ageRange.max = 9;
  }
  if (!hasExplicitAge && lClassName.includes("karate kids")) {
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
  // "Mon hold": kids' grades, without naming a specific one
  if (/\bmon\b/.test(lClassName) && cleanRankMentions.length === 0) {
    rankRange.min = null;
    rankRange.max = -11;
  }
  if (
    lClassName.includes("mini bushi") ||
    /\bkidzz?\b/.test(lClassName) ||
    // "Karate Kids", "Kids Hold 1": too young for grades
    /\bkids\b/.test(lClassName)
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
  // "Kyu-grader": a class for kyu grades excludes white belts, unless
  // beginners are mentioned too ("10.-5. kyu og begyndere"), or it's open to
  // everyone up to a grade ("til og med 7. kyu")
  if (
    /\bkyu\b/.test(lClassName) &&
    !lClassName.includes("begynd") &&
    rankRange.min === -10.5 &&
    rankRange.max === null
  ) {
    rankRange.min = -10;
  }
  return { rankRange, ageRange };
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
