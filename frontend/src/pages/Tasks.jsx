import { useEffect, useState } from 'react';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const { user } = useAuth();

  async function loadTasks() {
    const query = filter ? `?status=${filter}` : '';
    const { data } = await api.get(`/tasks${query}`);
    setTasks(data);
  }

  useEffect(() => { loadTasks().catch((err) => setError(err.response?.data?.message || 'Unable to load tasks.')); }, [filter]);

  async function updateStatus(id, status) {
    await api.put(`/tasks/${id}`, { status });
    await loadTasks();
  }

  return (
    <main className="page">
      <div className="page-header"><div><h1>Tasks</h1><p>{user.role === 'admin' ? 'All tasks across projects.' : 'Only tasks assigned to you.'}</p></div><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">All Status</option><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="done">Done</option></select></div>
      {error && <div className="alert error">{error}</div>}
      <section className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Task</th><th>Project</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Due</th><th>Update</th></tr></thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td><strong>{task.title}</strong><br /><span className="muted-small">{task.description}</span></td>
                  <td>{task.project_name}</td>
                  <td>{task.assigned_to_name || 'Unassigned'}</td>
                  <td><span className={`badge ${task.priority}`}>{task.priority}</span></td>
                  <td><span className={`badge ${task.status}`}>{task.status}</span></td>
                  <td>{task.due_date || '-'}</td>
                  <td><select value={task.status} onChange={(e) => updateStatus(task.id, e.target.value)}><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="done">Done</option></select></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
