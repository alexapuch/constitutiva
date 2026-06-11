import 'dotenv/config';
import express from 'express';
import apiRoutes from './routes.js';

const app = express();

app.use(express.json({ limit: '10mb' }));

app.get('/v/:folio', (req, res) => {
    res.redirect(`/api/verificar/${req.params.folio}`);
});

app.use('/api', apiRoutes);

export default app;
