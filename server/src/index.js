import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import apiRouter from './routes/api.js';

const app = express();

app.use(cors({
  origin: config.clientOrigin,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount API router
app.use('/api', apiRouter);

// Start server only when executed directly as entrypoint
const currentFilePath = fileURLToPath(import.meta.url);
const entryFilePath = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (currentFilePath === entryFilePath && process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`[EventMind Backend] Server active at http://localhost:${config.port}`);
    console.log(`[EventMind Backend] Allowed Client Origin: ${config.clientOrigin}`);
    console.log(`[EventMind Backend] Configured Model: ${config.geminiModel}`);
    if (config.warnings.length > 0) {
      config.warnings.forEach(w => console.warn(`[Config Warning] ${w}`));
    }
  });
}

export default app;
