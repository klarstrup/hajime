import { getWeek } from "date-fns";
import Link from "next/link";
import { getClasses } from "../sources";

const dkuRanks = [
  {
    index: -11,
    name: "11. kyu",
    color: "#fff",
  },
  {
    index: -10,
    name: "10. kyu",
    color: "#f60",
  },
  {
    index: -9,
    name: "9. kyu",
    color: "#f60",
  },
  {
    index: -8,
    name: "8. kyu",
    color: "#04a",
  },
  {
    index: -7,
    name: "7. kyu",
    color: "#04a",
  },
  {
    index: -6,
    name: "6. kyu",
    color: "#fc0",
  },
  {
    index: -5,
    name: "5. kyu",
    color: "#fc0",
  },
  {
    index: -4,
    name: "4. kyu",
    color: "#217821",
  },
  {
    index: -3,
    name: "3. kyu",
    color: "#217821",
  },
  {
    index: -2,
    name: "2. kyu",
    color: "#784421",
  },
  {
    index: -1,
    name: "1. kyu",
    color: "#784421",
  },
  {
    index: 0,
    name: "1. dan",
    color: "#000",
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
        <Link
          className="text-xs 2xs:text-sm text-red-400 text-right"
          href={"/"}
        >
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
                                  <div className="whitespace-nowrap self-start">
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
                                    className="flex flex-row gap-1 -mx-2 -mb-2"
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
                                            (rr) => rr.color === r.color,
                                          ) === i,
                                      )
                                      .map((r) => (
                                        <div
                                          key={r.index}
                                          style={{ background: r.color }}
                                          className="flex-1 h-2"
                                        />
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
