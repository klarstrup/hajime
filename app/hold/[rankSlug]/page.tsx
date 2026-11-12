import { dkuRanks } from "@/app/utils";
import HoldList from "../HoldList";

export function generateStaticParams() {
  return dkuRanks.map((rank) => ({ rankSlug: rank.slug }));
}

export const instant = false;
export default async function TræningPage({
  params,
}: PageProps<"/hold/[rankSlug]">) {
  const queryRank = (await params).rankSlug;
  const myRank = dkuRanks.find((rank) => rank.slug === queryRank);

  return <HoldList myRank={myRank} />;
}
