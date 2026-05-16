import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProjectDetails() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [users, setUsers] = useState([]);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assigned_to: '', status: 'todo', priority: 'medium', due_date: '' });
  const [memberUserId, setMemberUserId] = useState('');
  const [error, setError] = useState('');
  const { isAdmin } = useAuth();

  async function load() {
    const [{ data: projectData }, usersResult] = await Promise.all([
      api.get(`/projects/${id}`),
      isAdmin ? api.get('/users') : Promise.resolve({ data: [] })
    ]);
    setProject(projectData);
    setUsers(usersResult.data);
  }

  useEffect(() => { load().catch((err) => setError(err.response?.data?.message || 'Unable to load project.')); }, [id, isAdmin]);

  async function addMember(e) {
    e.preventDefault();
    if (!memberUserId) return;
    await api.post(`/projects/${id}/members`, { userId: Number(memberUserId) });
    setMemberUserId('');
    await load();
  }

  async function createTask(e) {
    e.preventDefault();
    const payload = { ...taskForm, project_id: Number(id), assigned_to: taskForm.assigned_to ? Number(taskForm.assigned_to) : null, due_date: taskForm.due_date || null };
    await api.post('/tasks', payload);
    setTaskForm({ title: '', description: '', assigned_to: '', status: 'todo', priority: 'medium', due_date: '' });
    await load();
  }

  async function updateTaskStatus(taskId, status) {
    await api.put(`/tasks/${taskId}`, { status });
    await load();
  }

  if (error) return <main className="page"><div className="alert error">{error}</div></main>;
  if (!project) return <main className="page"><div className="card">Loading project...</div></main>;

  return (
    <main className="page">
      <div className="page-header"><div><h1>{project.name}</h1><p>{project.description}</p></div><span className={`badge ${project.status}`}>{project.status}</span></div>
      <section className="two-column">
        <div className="card">
          <h2>Team Members</h2>
          <ul className="clean-list">
            {project.members.map((member) => <li key={member.id}><strong>{member.name}</strong><span>{member.email} • {member.role}</span></li>)}
          </ul>
          {isAdmin && (
            <form className="inline-form" onSubmit={addMember}>
              <select value={memberUserId} onChange={(e) => setMemberUserId(e.target.value)}>
                <option value="">Select user</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name} ({user.role})</option>)}
              </select>
              <button className="primary">Add Member</button>
            </form>
          )}
        </div>
        {isAdmin && (
          <div className="card">
            <h2>Create Task</h2>
            <form className="form" onSubmit={createTask}>
              <label>Title<input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required /></label>
              <label>Description<textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} /></label>
              <label>Assign To<select value={taskForm.assigned_to} onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}><option value="">Unassigned</option>{project.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
              <div className="three-fields">
                <label>Status<select value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="done">Done</option></select></label>
                <label>Priority<select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
                <label>Due Date<input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} /></label>
              </div>
              <button className="primary">Create Task</button>
            </form>
          </div>
        )}
      </section>
      <section className="card">
        <h2>Project Tasks</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Task</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Due Date</th><th>Action</th></tr></thead>
            <tbody>
              {project.tasks.map((task) => (
                <tr key={task.id}>
                  <td><strong>{task.title}</strong><br /><span className="muted-small">{task.description}</span></td>
                  <td>{task.assigned_to_name || 'Unassigned'}</td>
                  <td><span className={`badge ${task.priority}`}>{task.priority}</span></td>
                  <td><span className={`badge ${task.status}`}>{task.status}</span></td>
                  <td>{task.due_date || '-'}</td>
                  <td><select value={task.status} onChange={(e) => updateTaskStatus(task.id, e.target.value)}><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="done">Done</option></select></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
