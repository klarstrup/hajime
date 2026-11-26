import { eventsSources } from "@/sources/sources";
import { omit } from "next/dist/shared/lib/router/utils/omit";
import TreeGraphWrapper from "./TreeGraphWrapper";

const clubs = eventsSources.filter((source) => source.type === "club");
const federations = eventsSources
  .filter((source) => source.type === "club")
  .filter((source) => "federation" in source)
  .flatMap((source) => source.federation ?? [])
  .flatMap((f) => (f === "dkarf" ? ["dkarf", "dif"] : f))
  .filter((f, i, l) => l.indexOf(f) === i);

function treeFromSourcesFederations() {
  return {
    nodes: [
      ...clubs.map((club) => ({
        // @ts-expect-error TypeScript might complain about the club object structure
        ...omit(club, ["loadClasses", "loadEvents"]),
        id: club.sourceId,
        name: club.name,
        url:
          "classesUrl" in club
            ? club.classesUrl
            : "calendarUrl" in club
              ? club.calendarUrl
              : undefined,
      })),
      ...federations.map((federation) => ({
        id: federation,
        name: federation,
        federation,
        type: "federation",
      })),
    ],
    links: clubs.flatMap((club) =>
      ("federation" in club && club.federation ? club.federation : []).map(
        (federation) => ({
          source: club.sourceId,
          target: federation,
        }),
      ),
    ),
  };
}

export default function LandetPage() {
  return (
    <div>
      <TreeGraphWrapper graphData={treeFromSourcesFederations()} />
    </div>
  );
}
