# Team Task Manager - Full Stack

A complete assignment-ready full-stack app where users can create projects, manage teams, assign tasks, and track task progress with role-based access control.

## Included Features

- Signup/Login authentication with JWT
- Admin and Member roles
- Project creation and project status management
- Team/member management for each project
- Task creation, assignment, priority, due date, and status tracking
- Dashboard for task totals, pending tasks, in-progress tasks, completed tasks, overdue tasks, and projects. Admin sees all tasks; Members see only tasks assigned to them
- REST APIs with validation
- SQLite database with proper table relationships
- Role-based access control
- Railway deployment files

## Tech Stack

Frontend: React, Vite, React Router, Axios, CSS

Backend: Node.js, Express.js, SQLite, JWT, bcrypt, express-validator

## Run in VS Code

Open this folder in VS Code, then run:

```bash
npm run install-all
```

Create a local environment file:

```bash
cp backend/.env.example backend/.env
```

Initialize the empty database schema:

```bash
npm run seed
```

Start frontend and backend together:

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:5000
```

## First Login

No demo accounts are pre-filled or inserted. After starting the app, open the Signup page and create your first account. Choose `Admin` when you want full project, team, and task management access. Choose `Member` when you only need access to assigned work.


## Main API Routes

Auth:
- POST `/api/auth/signup`
- POST `/api/auth/login`
- GET `/api/auth/me`

Projects:
- GET `/api/projects`
- POST `/api/projects` Admin only
- GET `/api/projects/:id`
- PUT `/api/projects/:id` Admin only
- DELETE `/api/projects/:id` Admin only
- POST `/api/projects/:id/members` Admin only
- DELETE `/api/projects/:id/members/:userId` Admin only

Tasks:
- GET `/api/tasks`
- POST `/api/tasks` Admin only
- GET `/api/tasks/:id`
- PUT `/api/tasks/:id`
- DELETE `/api/tasks/:id` Admin only

Users:
- GET `/api/users` Admin only

Dashboard:
- GET `/api/dashboard/summary`

## Railway Deployment

1. Push this folder to GitHub.
2. Create a Railway project.
3. Connect the GitHub repo.
4. Add the environment variables from `backend/.env.example`.
5. Deploy the project.
6. Railway will use `npm start` and serve the built React frontend from the Express backend.

For production, set a strong `JWT_SECRET`.
