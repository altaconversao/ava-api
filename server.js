import express from 'express';
import dotenv from 'dotenv';
import openaiRoutes from './routes/openai.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/openai', openaiRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
