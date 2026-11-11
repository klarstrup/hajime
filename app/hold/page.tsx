import { getWeek } from "date-fns";
import Link from "next/link";
import { getClasses } from "../sources";

const dkuRanks = [
  {
    index: -20.5,
    name: "white belt",
    primaryColor: "#fff",
    secondaryColor: "#fff",
  },
  {
    index: -20,
    name: "10. mon",
    primaryColor: "#fff",
    secondaryColor: "#f60",
  },
  {
    index: -19,
    name: "9. mon",
    primaryColor: "#fff",
    secondaryColor: "#f60",
  },
  {
    index: -18,
    name: "8. mon",
    primaryColor: "#fff",
    secondaryColor: "#04a",
  },
  {
    index: -17,
    name: "7. mon",
    primaryColor: "#fff",
    secondaryColor: "#04a",
  },
  {
    index: -16,
    name: "6. mon",
    primaryColor: "#fff",
    secondaryColor: "#fc0",
  },
  {
    index: -15,
    name: "5. mon",
    primaryColor: "#fff",
    secondaryColor: "#fc0",
  },
  {
    index: -14,
    name: "4. mon",
    primaryColor: "#fff",
    secondaryColor: "#217821",
  },
  {
    index: -13,
    name: "3. mon",
    primaryColor: "#fff",
    secondaryColor: "#217821",
  },
  {
    index: -12,
    name: "2. kyu",
    primaryColor: "#fff",
    secondaryColor: "#784421",
  },
  {
    index: -11,
    name: "1. mon",
    primaryColor: "#fff",
    secondaryColor: "#784421",
  },
  {
    index: -10.5,
    name: "white belt",
    primaryColor: "#fff",
  },
  {
    index: -10,
    name: "10. kyu",
    primaryColor: "#f60",
  },
  {
    index: -9,
    name: "9. kyu",
    primaryColor: "#f60",
  },
  {
    index: -8,
    name: "8. kyu",
    primaryColor: "#04a",
  },
  {
    index: -7,
    name: "7. kyu",
    primaryColor: "#04a",
  },
  {
    index: -6,
    name: "6. kyu",
    primaryColor: "#fc0",
  },
  {
    index: -5,
    name: "5. kyu",
    primaryColor: "#fc0",
  },
  {
    index: -4,
    name: "4. kyu",
    primaryColor: "#217821",
  },
  {
    index: -3,
    name: "3. kyu",
    primaryColor: "#217821",
  },
  {
    index: -2,
    name: "2. kyu",
    primaryColor: "#784421",
  },
  {
    index: -1,
    name: "1. kyu",
    primaryColor: "#784421",
  },
  {
    index: 0,
    name: "1. dan",
    primaryColor: "#333",
    secondaryColor: "gold",
  },
] as const;

const getRanksFromRankRange = (rankRange: {
  min?: number | null;
  max?: number | null;
}) =>
  dkuRanks.filter(
    (rank) =>
      rank.index >= (rankRange.min ?? -Infinity) &&
      rank.index <= (rankRange.max ?? Infinity),
  );
export const instant = false;
export default async function TræningPage() {
  const nextWeekOfClasses = await getClasses();

  const classesByWeekAndWeekday = nextWeekOfClasses.reduce(
    (acc, classItem) => {
      const weekNo = getWeek(classItem.nextStart);
      const weekDay = classItem.nextStart.getDay();
      if (!acc[weekNo]) acc[weekNo] = {};
      if (!acc[weekNo][weekDay]) acc[weekNo][weekDay] = [];
      acc[weekNo][weekDay].push(classItem);
      return acc;
    },
    {} as Record<number, Record<number, typeof nextWeekOfClasses>>,
  );

  return (
    <div className="flex flex-col max-w-160">
      <div className="flex gap-2 items-end justify-between">
        <header className="text-xl font-extrabold flex gap-2 mt-2 items-end">
          <span className="text-[1.75rem] md:text-[2rem] lg:text-[2.5rem] xl:text-[3rem] leading-tight">
            🥋
          </span>
          <span className="text-sm 2xs:text-xl xs:text-4xl">Karatehold</span>
        </header>
        <Link className="text-xs 2xs:text-sm text-red-400 text-right" href="/">
          Se kommende karatetræf
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {Object.entries(classesByWeekAndWeekday).map(
          ([weekIndex, eventsByWeekDay]) => (
            <div key={weekIndex} className="flex gap-1">
              <div>
                <h2
                  className="text-xl font-bold sticky top-1 -mr-0.5 opacity-60 md:text-2xl lg:text-3xl xl:text-4xl"
                  style={{
                    writingMode: "vertical-rl",
                    textOrientation: "upright",
                    lineHeight: 0.5,
                    letterSpacing: "-0.3em",
                  }}
                >
                  <span
                    className="text-[20px]"
                    style={{ letterSpacing: "-0.25em" }}
                  >
                    UGE
                  </span>
                  {weekIndex}
                </h2>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                {Object.entries(eventsByWeekDay).map(
                  ([weekDayIndex, weekDayClasses]) => (
                    <div key={weekIndex + "-" + weekDayIndex} className="flex">
                      <div>
                        <h2
                          className="text-md font-bold sticky top-1 md:text-lg lg:text-xl xl:text-2xl"
                          style={{
                            writingMode: "vertical-rl",
                            textOrientation: "upright",
                            lineHeight: 1.25,
                            letterSpacing: "-0.25em",
                          }}
                        >
                          {[
                            "SØNDAG",
                            "MANDAG",
                            "TIRSDAG",
                            "ONSDAG",
                            "TORSDAG",
                            "FREDAG",
                            "LØRDAG",
                          ][Number(weekDayIndex)]
                            .toUpperCase()
                            .split("")
                            .map((char, index) =>
                              char === "J" ? (
                                <span
                                  key={index}
                                  style={{ letterSpacing: "-0.0125em" }}
                                >
                                  {char}
                                </span>
                              ) : (
                                <span key={index}>{char}</span>
                              ),
                            )}
                        </h2>
                      </div>
                      <div className="max-w-full w-full flex-1 flex flex-col flex-wrap gap-2">
                        {weekDayClasses
                          // sort alphabetically before sorting by start time
                          .sort((a, b) =>
                            a.className.localeCompare(b.className),
                          )
                          .sort(
                            (a, b) =>
                              new Date(a.nextStart).getTime() -
                              new Date(b.nextStart).getTime(),
                          )
                          // get uniques
                          .filter((c, i, l) => {
                            for (let j = 0; j < i; j++) {
                              if (
                                c.source === l[j].source &&
                                c.nextStart.getTime() ===
                                  l[j].nextStart.getTime() &&
                                c.className === l[j].className
                              ) {
                                return false;
                              }
                            }
                            return true;
                          })
                          .map((c) => {
                            let className = c.className
                              .replace("(alle aldre)", "")
                              .replace(", alle grader", "");

                            // if there are more than two words, prevent orphaned words by replacing the last space with a non-breaking space
                            if (className.split(" ").length > 2) {
                              className = className.replace(
                                / (\S+)$/,
                                "\u00A0$1",
                              );
                            }

                            return (
                              <div
                                key={
                                  c.source +
                                  c.nextStart.toISOString() +
                                  c.className
                                }
                                className="dark:bg-gray-900 bg-white p-2 pt-1 flex flex-col leading-tight"
                              >
                                <pre hidden>{JSON.stringify(c, null, 2)}</pre>
                                <div className="flex flex-row gap-2 items-baseline">
                                  <div className="whitespace-nowrap">
                                    {new Intl.DateTimeFormat("da-DK", {
                                      timeStyle: "short",
                                    }).formatRange(c.nextStart, c.nextEnd)}
                                  </div>
                                  <div>
                                    <span className="font-bold text-xl mr-1 leading-tight">
                                      {className}
                                    </span>
                                    <a
                                      href={c.classesUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-lighter text-xs leading-none text-red-400 hover:underline"
                                    >
                                      {c.source}
                                    </a>
                                    {"instructors" in c &&
                                      Array.isArray(c.instructors) &&
                                      c.instructors.length > 0 && (
                                        <>
                                          ,{" "}
                                          <span className="font-lighter text-xs leading-none font-lighter italic">
                                            v.&nbsp;
                                            {new Intl.ListFormat(
                                              "da-DK",
                                            ).format(c.instructors)}
                                          </span>
                                        </>
                                      )}
                                  </div>
                                </div>
                                {"rankRange" in c &&
                                c.rankRange &&
                                typeof c.rankRange === "object" &&
                                ("min" in c.rankRange ||
                                  "max" in c.rankRange) ? (
                                  <div
                                    className="flex flex-row gap-[1%] -mx-2 -mb-2 relative"
                                    style={{
                                      background: "var(--color-background)",
                                    }}
                                  >
                                    {getRanksFromRankRange(
                                      c.rankRange as {
                                        min?: number | null;
                                        max?: number | null;
                                      },
                                    )
                                      .filter(
                                        (r, i, l) =>
                                          l.findIndex(
                                            (rr) =>
                                              rr.primaryColor ===
                                                r.primaryColor &&
                                              ("secondaryColor" in rr
                                                ? "secondaryColor" in r &&
                                                  rr.secondaryColor ===
                                                    r.secondaryColor
                                                : true),
                                          ) === i,
                                      )
                                      .reverse()
                                      .map((r) => (
                                        <div
                                          key={r.index}
                                          className="w-[13.44%] relative"
                                        >
                                          <div
                                            style={{
                                              background: r.primaryColor,
                                            }}
                                            className="h-1"
                                          />
                                          <div
                                            style={{
                                              background:
                                                r.index >= 0
                                                  ? r.primaryColor
                                                  : "secondaryColor" in r
                                                    ? r.secondaryColor
                                                    : r.primaryColor,
                                            }}
                                            className="h-1"
                                          />
                                          <div
                                            style={{
                                              background: r.primaryColor,
                                            }}
                                            className="h-1"
                                          />
                                          {r.index >= 0 &&
                                          "secondaryColor" in r ? (
                                            <div
                                              style={{
                                                background: r.secondaryColor,
                                              }}
                                              className="h-full absolute left-3 w-1 top-0"
                                            />
                                          ) : null}
                                        </div>
                                      ))}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
