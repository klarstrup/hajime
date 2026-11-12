import { dkuRanks } from "@/app/utils";
import HoldList from "../../../hold/HoldList";

export function generateStaticParams() {
  return dkuRanks.map((rank) => ({ rank: rank.slug }));
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
