import { useEffect, useState } from 'react';
import api from '../api.js';
import StatCard from '../components/StatCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    api.get('/dashboard/summary')
      .then(({ data }) => setSummary(data))
      .catch((err) => setError(err.response?.data?.message || 'Unable to load dashboard.'));
  }, []);

  if (error) return <main className="page"><div className="alert error">{error}</div></main>;
  if (!summary) return <main className="page"><div className="card">Loading dashboard...</div></main>;

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview for {user.name}. Role: <strong>{user.role}</strong></p>
        </div>
      </div>
      <section className="stats-grid">
        <StatCard label="Projects" value={summary.total_projects} />
        <StatCard label="Total Tasks" value={summary.total_tasks} />
        <StatCard label="To Do" value={summary.todo_tasks} />
        <StatCard label="In Progress" value={summary.in_progress_tasks} />
        <StatCard label="Completed" value={summary.done_tasks} />
        <StatCard label="Overdue" value={summary.overdue_tasks} />
      </section>
      <section className="card">
        <h2>Recent Tasks</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Task</th><th>Project</th><th>Assignee</th><th>Status</th><th>Due</th></tr></thead>
            <tbody>
              {summary.recent_tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.title}</td><td>{task.project_name}</td><td>{task.assigned_to_name || 'Unassigned'}</td><td><span className={`badge ${task.status}`}>{task.status}</span></td><td>{task.due_date || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
