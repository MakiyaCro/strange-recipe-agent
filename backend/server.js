import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { config } from './config.js';
import recipeRouter from './routes/recipe.js';
import pdfRouter from './routes/pdf.js';
import fsRouter from './routes/fs.js';

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: config.allowedOrigins,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json({ limit: '16kb' }));

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please wait a moment before generating another recipe.' },
}));

app.use('/api/recipe', recipeRouter);
app.use('/api/pdf', pdfRouter);
app.use('/api/fs', fsRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, 'localhost', () => {
  console.log(`[SERVER] http://localhost:${config.port}`);
  console.log(`[MODEL]  ${config.ollamaModel}`);
  console.log(`[OLLAMA] ${config.ollamaBaseUrl}`);
});
