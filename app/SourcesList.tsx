import { CSSProperties } from "react";

export function SourcesList({
  eventsSources,
  type,
}: {
  eventsSources: typeof import("./sources").eventsSources;
  type?: "events" | "classes";
}) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fit,60px)] gap-2 auto-rows-fr w-full justify-center px-2">
      {[...eventsSources]
        .filter((source) =>
          type === "classes"
            ? "loadClasses" in source
            : type === "events"
              ? "loadEvents" in source
              : false,
        )
        .filter((s, i, l) => l.findIndex((ss) => ss.name === s.name) === i)
        .map((source) => (
          <li
            key={source.sourceId}
            className="bg-white pt-4 pb-4 leading-tight inline-flex max-h-60 gap-4 flex-row items-center  "
            style={{
              writingMode: "vertical-lr",
              textOrientation: "mixed",
            }}
          >
            <div className="flex-0 bg-background h-1/5 w-1/5 aspect-square rounded-full">
              &nbsp;
            </div>
            <a
              href={
                type === "classes" &&
                "classesUrl" in source &&
                typeof source.classesUrl === "string"
                  ? source.classesUrl
                  : type === "events" &&
                      "calendarUrl" in source &&
                      typeof source.calendarUrl === "string"
                    ? source.calendarUrl
                    : "#"
              }
              className="text-red-500 text-(size:--md-font-size)"
              style={
                {
                  "--md-font-size": `${1000 / (source.name.replace(/\s+/g, "").length + 32)}px`,
                  "--lg-font-size": `${1500 / (source.name.replace(/\s+/g, "").length + 32)}px`,
                } as CSSProperties
              }
            >
              {/* avoid orphans by replacing the last space with a non-breaking space, if the are multiple spaces */}
              {(Array.from(source.name.matchAll(/\s+/g)).length > 1
                ? source.name.replace(/\s+([^\s]+)$/, "\u00A0$1")
                : source.name
              )
                .replace(/\s-\s/g, " ")
                .replace(/\s–\s/g, " ")}
            </a>
          </li>
        ))}
    </ul>
  );
}
