import dotenv from 'dotenv';
dotenv.config();

import { migrate } from './db/database.js';

await migrate();

console.log('Database initialized successfully.');
console.log('No demo users, projects, or tasks were inserted.');
console.log('Create your first Admin or Member account from the Signup page.');
process.exit(0);
