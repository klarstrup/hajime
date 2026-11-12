import { eventsSources } from "@/app/sources";
import { dkuRanks } from "@/app/utils";
import HoldList from "../../../hold/HoldList";

export function generateStaticParams() {
  const federationSlugs = eventsSources
    .filter((source): source is typeof source & { federation: string } =>
      Boolean("federation" in source && source.federation),
    )
    .map((source) => source.federation)
    .filter((s, i, l) => i === l.findIndex((t) => t === s));

  const rankSlugs = dkuRanks.map((rank) => rank.slug);

  return federationSlugs.flatMap((federationSlug) =>
    rankSlugs.map((rankSlug) => ({ federationSlug, rankSlug })),
  );
}

export const instant = false;
export default async function TræningPage({
  params,
}: PageProps<"/[federationSlug]/hold/[rankSlug]">) {
  const queryRank = (await params).rankSlug;
  const myRank = dkuRanks.find((rank) => rank.slug === queryRank);
  const federationSlug = (await params).federationSlug;

  return <HoldList myRank={myRank} federationSlug={federationSlug} />;
}
