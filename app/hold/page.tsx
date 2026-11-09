import { getClasses } from "../sources";

export const instant = false;
export default async function TræningPage() {
  const nextWeekOfClasses = await getClasses();

  return (
    <div className="max-w-full flex flex-row flex-wrap">
      {nextWeekOfClasses
        .sort(
          (a, b) =>
            new Date(a.nextStart).getTime() - new Date(b.nextStart).getTime(),
        )
        .map((c) => (
          <pre
            key={c.nextStart.toISOString()}
            className="flex-1 m-2 p-2 border border-gray-300"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(c, null, 2),
            }}
          />
        ))}
    </div>
  );
}
