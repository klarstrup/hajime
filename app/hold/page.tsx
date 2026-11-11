import HoldList from "./HoldList";

export const instant = false;
export default async function TræningPage({ params }: PageProps<"/hold">) {
  return <HoldList />;
}
