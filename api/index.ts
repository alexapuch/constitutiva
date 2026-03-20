import express from 'express';
import apiRoutes from './routes.js';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use('/api', apiRoutes);

export default app;
