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
  weekdays?: (
    line: string,
    now: Date,
    data: { [key: string]: unknown },
  ) => Weekday[] | null;
  timeRange?: (
    line: string,
    now: Date,
    data: { [key: string]: unknown },
  ) => { start: Date; end: Date } | null;
  ageRange?: (
    line: string,
    now: Date,
    data: { [key: string]: unknown },
  ) => { min: number | null; max: number | null } | null;
  rankRange?: (
    line: string,
    now: Date,
    data: { [key: string]: unknown },
  ) => { min: number | null; max: number | null } | null;
  // Can be set to override the default className parsing behavior
  className?: (
    line: string,
    now: Date,
    data: { [key: string]: unknown },
  ) => string | null;
  instructors?: (
    line: string,
    now: Date,
    data: { [key: string]: unknown },
  ) => string[] | null;
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
  wipe?: (data: { [key: string]: unknown }) => void,
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
  type DataKey = keyof typeof keyParsers;
  let lastSet: DataKey | undefined = undefined;

  const resetLastSet = () => lastSet && (data[lastSet] = undefined);

  for (const line of holdLines) {
    let setValue = false;
    for (const key of Object.keys(keyParsers) as (keyof typeof keyParsers)[]) {
      const value = keyParsers[key]!(line, now, data);
      if (value) {
        if (!allDataSet(data)) lastSet = key;

        // @ts-expect-error: TypeScript may not be able to infer the type of data[key] correctly
        data[key] = value;
        setValue = true;
      }
    }

    if (!setValue && !keyParsers.className) {
      if (!allDataSet(data)) lastSet = "className";
      data.className = processClassName?.(line) ?? line;
    }

    if (!allDataSet(data)) continue;

    const { className, weekdays, timeRange, ...rest } = data;

    if (!Array.isArray(weekdays)) {
      throw new Error("Expected data.weekdays to be an array");
    }
    if (!isValidTimeRange(timeRange)) {
      throw new Error("Expected data.timeRange to be a valid TimeRange");
    }
    if (!className) {
      throw new Error("Expected data.className to be defined");
    }

    for (const weekday of weekdays) {
      yield {
        className,
        ...getNextStartAndEnd(timeRange, weekday, now),
        ...getAgeAndRankFromClassName(className),
        ...rest,
      };
    }

    if (wipe) wipe(data);
    else resetLastSet();
  }
}
