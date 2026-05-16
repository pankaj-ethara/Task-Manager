import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  if (!user) return null;

  return (
    <nav className="navbar">
      <Link className="brand" to="/"><span>TT</span>Team Task Manager</Link>
      <div className="navlinks">
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/projects">Projects</NavLink>
        <NavLink to="/tasks">Tasks</NavLink>
      </div>
      <div className="profile">
        <span>{user.name}</span>
        <span className="role">{user.role}</span>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
