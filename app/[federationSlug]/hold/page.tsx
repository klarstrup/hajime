import { dkuRanks } from "@/app/utils";
import HoldList from "../../hold/HoldList";

export function generateStaticParams() {
  return dkuRanks.map((rank) => ({ rank: rank.slug }));
}

export const instant = false;
export default async function TræningPage({
  params,
}: PageProps<"/[federationSlug]/hold">) {
  const federationSlug = (await params).federationSlug;

  return <HoldList federationSlug={federationSlug} />;
}
