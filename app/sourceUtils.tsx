import type { Weekday } from "rrule";
import {
  getAgeAndRankFromClassName,
  getNextStartAndEnd,
  getRRuleWeekdaysByFullDanishName,
  safeParseTimeRange,
} from "./utils";

export function* parseClassesSchedulesLines(holdLines: string[], now: Date) {
  let weekdays: Weekday[] = [];
  let timeRange: { start: Date; end: Date } | undefined = undefined;
  let className: string | undefined = undefined;
  let lastSet: "weekday" | "timeRange" | "className" | undefined = undefined;
  for (const line of holdLines) {
    const newWeekdays = getRRuleWeekdaysByFullDanishName(line);
    const newTimeRange = safeParseTimeRange(line, now);
    if (newWeekdays.length) {
      if (!weekdays?.length || !timeRange || !className) lastSet = "weekday";
      weekdays = newWeekdays;
    }
    if (newTimeRange) {
      if (!weekdays?.length || !timeRange || !className) lastSet = "timeRange";
      timeRange = newTimeRange;
    }
    if (!newWeekdays.length && !newTimeRange) {
      if (!weekdays?.length || !timeRange || !className) lastSet = "className";
      className = line;
    }

    if (weekdays && timeRange && className) {
      for (const weekday of weekdays) {
        yield {
          className,
          ...getNextStartAndEnd(timeRange, weekday, now),
          ...getAgeAndRankFromClassName(className),
        };
      }

      switch (lastSet) {
        case "weekday":
          weekdays = [];
          break;
        case "timeRange":
          timeRange = undefined;
          break;
        case "className":
          className = undefined;
          break;
      }
    }
  }
}
