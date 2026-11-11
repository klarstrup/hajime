import { dkuRanks } from "@/app/utils";
import HoldList from "../HoldList";

export function generateStaticParams() {
  return dkuRanks.map((rank) => ({ rank: rank.slug }));
}

export const instant = false;
export default async function TræningPage({
  params,
}: PageProps<"/hold/[rank]">) {
  const queryRank = (await params).rank;
  const myRank = dkuRanks.find((rank) => rank.slug === queryRank);

  return <HoldList myRank={myRank} />;
}
