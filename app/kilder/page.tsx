import { eventsSources } from "../sources";

export default function KilderPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Karatekilder</h1>
      <table>
        <thead>
          <tr>
            <th align="center">Træf</th>
            <th align="center" className="px-1">
              Hold
            </th>
            <th>Navn</th>
          </tr>
        </thead>
        <tbody>
          {eventsSources.map((source) => (
            <tr key={source.sourceId} className="border-t border-gray-300">
              <td align="center">
                {"calendarUrl" in source &&
                source.calendarUrl &&
                typeof source.calendarUrl === "string" ? (
                  <a href={source.calendarUrl}>🗓️</a>
                ) : (
                  "-"
                )}{" "}
                {"loadEvents" in source ? "🌐" : "-"}
              </td>
              <td align="center">
                {"classesUrl" in source &&
                source.classesUrl &&
                typeof source.classesUrl === "string" ? (
                  <a href={source.classesUrl}>⏱️</a>
                ) : (
                  "-"
                )}{" "}
                {"loadClasses" in source ? "🌐" : "-"}
              </td>
              <td>
                {source.name}
                <div className="text-xs text-gray-500 font-[monospace]">
                  {source.sourceId}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
