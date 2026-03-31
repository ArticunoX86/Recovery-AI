export default function ScoreBadge({ score }) {
  const config = score >= 75
    ? { label: "Recovering well",     cls: "badge-green" }
    : score >= 50
    ? { label: "Stable — monitor",    cls: "badge-amber" }
    : { label: "At risk — alert doctor", cls: "badge-red" };

  return (
    <span className={`inline-block text-[11px] font-semibold px-3 py-1.5 rounded-xl ${config.cls}`}>
      {config.label}
    </span>
  );
}