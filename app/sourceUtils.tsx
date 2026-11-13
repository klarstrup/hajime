import { Weekday } from "rrule";
import {
  getAgeAndRankFromClassName,
  getNextStartAndEnd,
  getRRuleWeekdaysByFullDanishName,
  isValidTimeRange,
  safeParseTimeRange,
} from "./utils";

const allDataSet = <D extends object>(d: D): d is Required<D> =>
  Object.values(d).every((v) => v);

export const defaultKeyParsers = {
  weekdays: (line: string) => getRRuleWeekdaysByFullDanishName(line),
  timeRange: (line: string, now: Date) => safeParseTimeRange(line, now),
};

interface KeyParsers {
  weekdays?: (line: string) => Weekday[] | null;
  timeRange?: (line: string, now: Date) => { start: Date; end: Date } | null;
  ageRange?: (
    line: string,
  ) => { min: number | null; max: number | null } | null;
  rankRange?: (
    line: string,
  ) => { min: number | null; max: number | null } | null;
  // Can be set to override the default className parsing behavior
  className?: (line: string) => string | undefined;
}

export function* parseClassesSchedulesLines(
  holdLines: string[],
  now: Date,
  additionalKeyParsers?: Partial<KeyParsers>,
  initialData?: {
    className?: string;
    [key: string]: unknown;
  },
  processClassName?: (line: string) => string | undefined,
) {
  const keyParsers = { ...defaultKeyParsers, ...additionalKeyParsers };
  const data: {
    className?: string;
    [key: string]: unknown;
  } = {
    className: undefined,
    ...Object.fromEntries(
      Object.keys(keyParsers).map((key) => [key, undefined]),
    ),
    ...initialData,
  };
  type DataKey = keyof typeof keyParsers | "className";
  let lastSet: DataKey | undefined = undefined;

  const setData = <T extends DataKey>(key: T, value: (typeof data)[T]) => {
    if (!allDataSet(data)) lastSet = key;

    data[key] = value;
  };
  const resetLastSet = () => lastSet && (data[lastSet] = undefined);

  for (const line of holdLines) {
    let setValue = false;
    for (const key of Object.keys(keyParsers) as (keyof typeof keyParsers)[]) {
      const value = keyParsers[key]!(line, now);

      if (value) {
        setData(key, value);
        setValue = true;
      }
    }
    if (!setValue) setData("className", processClassName?.(line) ?? line);

    if (!allDataSet(data)) continue;

    const { className, weekdays, timeRange, ...rest } = data;

    if (!Array.isArray(weekdays)) {
      throw new Error("Expected data.weekdays to be an array");
    }
    if (!isValidTimeRange(timeRange)) {
      throw new Error("Expected data.timeRange to be a valid TimeRange");
    }

    for (const weekday of weekdays) {
      yield {
        className,
        ...getNextStartAndEnd(timeRange, weekday, now),
        ...getAgeAndRankFromClassName(className),
        ...rest,
      };
    }

    resetLastSet();
  }
}
