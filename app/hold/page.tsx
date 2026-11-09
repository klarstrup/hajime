import { getClasses } from "../sources";

export const instant = false;
export default async function TræningPage() {
  const nextWeekOfClasses = await getClasses();

  return (
    <div className="max-w-full flex flex-row flex-wrap gap-2 p-2">
      {nextWeekOfClasses
        .sort(
          (a, b) =>
            new Date(a.nextStart).getTime() - new Date(b.nextStart).getTime(),
        )
        .map((c) => (
          <pre
            key={c.nextStart.toISOString()}
            className="dark:bg-gray-900 bg-white p-2 pt-1 flex flex-col attribution-container leading-tight nafuda"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(c, null, 2),
            }}
          />
        ))}
    </div>
  );
}
