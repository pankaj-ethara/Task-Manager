import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', status: 'active' });
  const [error, setError] = useState('');
  const { isAdmin } = useAuth();

  async function loadProjects() {
    const { data } = await api.get('/projects');
    setProjects(data);
  }

  useEffect(() => {
    loadProjects().catch((err) => setError(err.response?.data?.message || 'Unable to load projects.'));
  }, []);

  async function createProject(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/projects', form);
      setForm({ name: '', description: '', status: 'active' });
      await loadProjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create project.');
    }
  }

  async function deleteProject(id) {
    if (!confirm('Delete this project and all related tasks?')) return;
    await api.delete(`/projects/${id}`);
    await loadProjects();
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p>Create projects, manage team members, and track work.</p>
        </div>
        <div className="header-metrics">
          <span>{projects.length} projects</span>
        </div>
      </div>
      {error && <div className="alert error">{error}</div>}
      {isAdmin && (
        <section className="card">
          <h2>Create Project</h2>
          <form className="form grid-form" onSubmit={createProject}>
            <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength="3" /></label>
            <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="completed">Completed</option><option value="on_hold">On Hold</option></select></label>
            <label className="span-2">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <button className="primary">Create Project</button>
          </form>
        </section>
      )}
      <section className="cards-grid">
        {projects.map((project) => (
          <article className="project-card" key={project.id}>
            <div className="project-top">
              <span className={`badge ${project.status}`}>{project.status}</span>
              {isAdmin && <button className="danger ghost" onClick={() => deleteProject(project.id)}>Delete</button>}
            </div>
            <h2>{project.name}</h2>
            <p>{project.description || 'No description added.'}</p>
            <div className="project-meta"><span>{project.member_count} members</span><span>{project.task_count} tasks</span></div>
            <Link className="button-link" to={`/projects/${project.id}`}>Open Project</Link>
          </article>
        ))}
      </section>
    </main>
  );
}
