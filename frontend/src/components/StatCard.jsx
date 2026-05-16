export default function StatCard({ label, value, tone = 'neutral' }) {
  return (
    <div className={`stat-card ${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}
