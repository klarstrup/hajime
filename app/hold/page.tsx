import Link from "next/link";
import { getClasses } from "../sources";

function getWeekNumber(date: Date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

export const instant = false;
export default async function TræningPage() {
  const nextWeekOfClasses = await getClasses();

  const classesByWeekAndWeekday = nextWeekOfClasses.reduce(
    (acc, classItem) => {
      const weekNo = getWeekNumber(classItem.nextStart);
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
          Se kommende karate
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
                          .map((c) => (
                            <div
                              key={
                                c.source +
                                c.nextStart.toISOString() +
                                c.className
                              }
                              className="dark:bg-gray-900 bg-white p-2 pt-1 flex flex-col attribution-container leading-tight nafuda"
                            >
                              <div className="font-lighter text-xs flex flex-row gap-1">
                                {c.federation}, {c.source}
                                {"instructors" in c &&
                                  Array.isArray(c.instructors) &&
                                  c.instructors.length > 0 && (
                                    <>
                                      ,{" "}
                                      <div className="font-lighter italic">
                                        v.{" "}
                                        {new Intl.ListFormat("da-DK").format(
                                          c.instructors,
                                        )}
                                      </div>
                                    </>
                                  )}
                              </div>
                              <div className="flex flex-row gap-1 items-baseline">
                                <div className="font-bold text-xl">
                                  {c.className}
                                </div>
                              </div>
                              <div>
                                {new Intl.DateTimeFormat("da-DK", {
                                  dateStyle: "full",
                                  timeStyle: "short",
                                }).formatRange(c.nextStart, c.nextEnd)}
                              </div>
                            </div>
                          ))}
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
