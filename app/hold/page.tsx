import { getClasses } from "../sources";

export const instant = false;
export default async function TræningPage() {
  const nextWeekOfClasses = await getClasses();

  return (
    <div className="max-w-full flex flex-col flex-wrap gap-2 p-2">
      {nextWeekOfClasses
        .sort(
          (a, b) =>
            new Date(a.nextStart).getTime() - new Date(b.nextStart).getTime(),
        )
        // get uniques
        .filter((c, i, l) => {
          for (let j = 0; j < i; j++) {
            if (
              c.source === l[j].source &&
              c.nextStart.getTime() === l[j].nextStart.getTime() &&
              c.className === l[j].className
            ) {
              return false;
            }
          }
          return true;
        })
        .map((c) => (
          <div
            key={c.source + c.nextStart.toISOString() + c.className}
            className="dark:bg-gray-900 bg-white p-2 pt-1 flex flex-col attribution-container leading-tight nafuda"
          >
            <div className="font-lighter text-xs flex flex-row gap-1">
              {c.federation}, {c.source}
              {"instructors" in c &&
                Array.isArray(c.instructors) &&
                c.instructors.length > 0 && (
                  <>
                    ,{" "}
                    <div className="font-lighter italic">
                      v. {new Intl.ListFormat("da-DK").format(c.instructors)}
                    </div>
                  </>
                )}
            </div>
            <div className="flex flex-row gap-1 items-baseline">
              <div className="font-bold text-xl">{c.className}</div>
            </div>
            <div>
              {new Intl.DateTimeFormat("da-DK", {
                dateStyle: "full",
                timeStyle: "short",
              }).formatRange(c.nextStart, c.nextEnd)}
            </div>
          </div>
        ))}
    </div>
  );
}
