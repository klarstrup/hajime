import type { Weekday } from "rrule";
import {
  getAgeAndRankFromClassName,
  getNextStartAndEnd,
  getRRuleWeekdaysByFullDanishName,
  safeParseTimeRange,
} from "./utils";

interface Data {
  weekdays?: [Weekday, ...Weekday[]];
  timeRange?: { start: Date; end: Date };
  className?: string;
}
type FullData = Required<Data>;

const allDataSet = (d: Data): d is FullData => Object.values(d).every((v) => v);
export function* parseClassesSchedulesLines(
  holdLines: string[],
  now: Date,
  processClassName?: (className: string) => string,
) {
  let lastSet: keyof Data | undefined = undefined;
  const data: Data = {
    weekdays: undefined,
    timeRange: undefined,
    className: undefined,
  };

  const setData = <T extends keyof Data>(key: T, value: Data[T]) => {
    if (!allDataSet(data)) lastSet = key;

    data[key] = value;
  };
  const resetLastSet = () => lastSet && (data[lastSet] = undefined);

  for (const line of holdLines) {
    const newWeekdays = getRRuleWeekdaysByFullDanishName(line);
    const newTimeRange = safeParseTimeRange(line, now);
    if (newWeekdays) setData("weekdays", newWeekdays);
    if (newTimeRange) setData("timeRange", newTimeRange);
    if (!newWeekdays && !newTimeRange)
      setData("className", processClassName?.(line) ?? line);

    if (!allDataSet(data)) continue;

    for (const weekday of data.weekdays) {
      yield {
        className: data.className,
        ...getNextStartAndEnd(data.timeRange, weekday, now),
        ...getAgeAndRankFromClassName(data.className),
      };
    }

    resetLastSet();
  }
}
