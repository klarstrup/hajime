import { getWeek } from "date-fns";
import Link from "next/link";
import type { ComponentProps } from "react";
import { getClasses } from "../sources";
import { dkuRanks } from "../utils";

const getDkuRanksFromRankRange = (rankRange: {
  min?: number | null;
  max?: number | null;
}) =>
  dkuRanks.filter(
    (rank) =>
      rank.index >= (rankRange.min ?? -Infinity) &&
      rank.index <= (rankRange.max ?? Infinity),
  );

export default async function HoldList({
  myRank,
  federationSlug,
}: {
  myRank?: (typeof dkuRanks)[number];
  federationSlug?: string;
}) {
  let nextWeekOfClasses = await getClasses();
  const myAge = myRank?.index && myRank.index < -10.5 ? 12 : 24;
  nextWeekOfClasses = nextWeekOfClasses
    .filter((classItem) =>
      myRank
        ? myRank.index >= (classItem.rankRange?.min ?? -Infinity) &&
          myRank.index <= (classItem.rankRange?.max ?? Infinity)
        : true,
    )
    .filter(
      (classItem) =>
        myAge >= (classItem.ageRange?.min ?? -Infinity) &&
        myAge <= (classItem.ageRange?.max ?? Infinity),
    )
    .filter((classItem) =>
      federationSlug ? classItem.federation === federationSlug : true,
    );

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
    <div className="flex flex-col max-w-120 w-full">
      <div className="flex gap-2 items-end justify-between">
        <header className="text-xl flex gap-2 mt-2 items-baseline">
          <span className="text-[1.75rem] md:text-[2rem] lg:text-[2.5rem] xl:text-[3rem] leading-tight">
            🥋
          </span>
          <span className="text-2xl xs:text-4xl font-extrabold">
            Karatehold
          </span>
          {myRank !== undefined && (
            <span className="text-sm min-w-15 flex flex-col relative">
              <Belt
                rank={myRank}
                href={`/hold`}
                className="w-full absolute bottom-full"
              />
              <Link href={`/hold`} className="text-red-400 font-semibold">
                {myRank.name}
                {federationSlug && `, ${federationSlug}`}
              </Link>
            </span>
          )}
          {federationSlug && !myRank && (
            <Link
              className="text-sm leading-none text-red-400 font-semibold"
              href={"/hold"}
            >
              {federationSlug}
            </Link>
          )}
        </header>
        <div className="text-right flex flex-col font-semibold">
          {(myRank !== undefined || federationSlug) && (
            <Link className="text-xs 2xs:text-sm text-red-400 " href="/hold">
              Se alle karatehold
            </Link>
          )}
          <Link className="text-xs 2xs:text-sm text-red-400 " href="/">
            Se karatetræf
          </Link>
        </div>
      </div>
      {nextWeekOfClasses.length === 0 && (
        <center className=" font-semibold text-2xl mt-4">
          Ingen {federationSlug ? federationSlug : ""} karatehold fundet 👊
        </center>
      )}
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
                                className="dark:bg-gray-800 bg-white p-2 flex flex-col leading-0"
                              >
                                <div>
                                  <div className="flex flex-row justify-between items-baseline">
                                    <div>
                                      <span className="whitespace-nowrap font-semibold">
                                        {new Intl.DateTimeFormat("da-DK", {
                                          timeStyle: "short",
                                        }).formatRange(c.nextStart, c.nextEnd)}
                                      </span>{" "}
                                      <span className="font-lighter text-xs">
                                        {c.source.toLowerCase()}
                                      </span>
                                    </div>
                                    <Link
                                      className="font-lighter text-xs text-red-400"
                                      href={
                                        federationSlug === c.federation
                                          ? (`/${c.federation}` as "/")
                                          : (`/${c.federation}/hold` as "/")
                                      }
                                    >
                                      {c.federation}
                                    </Link>
                                  </div>
                                  <a
                                    href={c.classesUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className=" text-red-500 leading-none hover:underline font-bold text-xl"
                                  >
                                    {className}
                                  </a>{" "}
                                  {"instructors" in c &&
                                    Array.isArray(c.instructors) &&
                                    c.instructors.length > 0 && (
                                      <div className="font-lighter text-xs leading-tight italic">
                                        v.&nbsp;
                                        {new Intl.ListFormat("da-DK").format(
                                          c.instructors,
                                        )}
                                      </div>
                                    )}
                                </div>
                                {"rankRange" in c &&
                                c.rankRange &&
                                typeof c.rankRange === "object" &&
                                ("min" in c.rankRange ||
                                  "max" in c.rankRange) ? (
                                  <div
                                    className="flex flex-row gap-[1%] mt-1 -mx-2 -mb-2 relative"
                                    style={{
                                      background: "var(--color-background)",
                                    }}
                                  >
                                    {getDkuRanksFromRankRange(c.rankRange)
                                      .filter(
                                        (r, i, l) =>
                                          l.findIndex(
                                            (rr) =>
                                              rr.colors.join() ===
                                                r.colors.join() &&
                                              ("stripes" in rr
                                                ? "stripes" in r &&
                                                  rr.stripes?.join() ===
                                                    r.stripes?.join()
                                                : true),
                                          ) === i,
                                      )
                                      .reverse()
                                      .map((r) => (
                                        <Belt
                                          key={r.index}
                                          rank={r}
                                          className="w-[13.44%] relative"
                                          href={
                                            myRank === r
                                              ? `/hold`
                                              : (`/${c.federation}/hold/${r.slug}` as `/hold`)
                                          }
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

function Belt({
  rank,
  ...htmlProps
}: { rank: (typeof dkuRanks)[number] } & ComponentProps<typeof Link>) {
  return (
    <Link
      {...htmlProps}
      className={(htmlProps.className || "") + " inline-block h-3"}
    >
      {rank.colors.map((background, i) => (
        <div
          key={i}
          style={{ background, height: 100 / rank.colors.length + "%" }}
        />
      ))}
      {"stripes" in rank && rank.stripes?.length ? (
        <div className="absolute inset-0 flex flex-row">
          {rank.stripes?.map((background, i) => (
            <div style={{ background }} key={i} className="h-full w-1 ml-3" />
          ))}
        </div>
      ) : null}
    </Link>
  );
}
