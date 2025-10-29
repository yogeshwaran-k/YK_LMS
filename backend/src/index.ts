import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './env';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import coursesRoutes from './routes/courses.routes';
import assessmentsRoutes from './routes/assessments.routes';
import mcqRoutes from './routes/mcq.routes';
import codingRoutes from './routes/coding.routes';
import assignmentsRoutes from './routes/assignments.routes';
import meRoutes from './routes/me.routes';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/courses', coursesRoutes);
app.use('/assessments', assessmentsRoutes);
app.use('/assessments', mcqRoutes);
app.use('/assessments', codingRoutes);
app.use('/assessments', assignmentsRoutes);
app.use('/me', meRoutes);
import runnerRoutes from './routes/runner.routes';
app.use('/runner', runnerRoutes);
import assignmentsMgmtRoutes from './routes/assignments_mgmt.routes';
app.use('/', assignmentsMgmtRoutes);
import progressRoutes from './routes/progress.routes';
app.use('/progress', progressRoutes);
import reportsRoutes from './routes/reports.routes';
app.use('/reports', reportsRoutes);
import notificationsRoutes from './routes/notifications.routes';
app.use('/notifications', notificationsRoutes);
import mcqBulkRoutes from './routes/mcq_bulk.routes';
app.use('/assessments', mcqBulkRoutes);
import submissionsRoutes from './routes/submissions.routes';
app.use('/submissions', submissionsRoutes);
import mcqBankRoutes from './routes/mcq_bank.routes';
app.use('/', mcqBankRoutes);
import groupsRoutes from './routes/groups.routes';
app.use('/groups', groupsRoutes);

// Generic error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(env.port, () => {
  console.log(`API listening on :${env.port}`);
});
