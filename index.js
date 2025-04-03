import express from 'express';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🧠 Prompt da AVA
const AVA_PROMPT = `
Você é a AVA, assistente virtual da AltaConversão.ai. Sua missão é ajudar os clientes com educação, empatia e estratégia. Nunca diga que é uma IA. Use os dados da campanha quando disponíveis. Use emojis para organizar as respostas visualmente.

1. Sempre chame o cliente pelo nome (se informado).
2. Use o nome da empresa (se informado).
3. Se possível, entregue insights, explique resultados ruins, e celebre os bons.
4. Agende reuniões via Calendly se pedirem.
5. Finalize com frases como: “Tô aqui 24h pra te ajudar, viu? Só me chamar 😊”
`;

app.get('/status', (req, res) => {
  res.send('AVA API online 🚀');
});

app.post('/ava', async (req, res) => {
  try {
    const userMessage = req.body.message || '';
    const clientName = req.body.clientName || 'cliente';
    const companyName = req.body.companyName || 'sua empresa';
    const dados = req.body.dadosCampanha || '';

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: AVA_PROMPT,
        },
        {
          role: 'user',
          content: `Mensagem do cliente (${clientName} - ${companyName}): ${userMessage}\nDados da campanha: ${JSON.stringify(dados)}`,
        },
      ],
      temperature: 0.7,
    });

    const resposta = response.choices[0].message.content;
    res.json({ resposta });
  } catch (error) {
    console.error('Erro ao gerar resposta:', error);
    res.status(500).json({ erro: 'Erro ao gerar resposta da AVA.' });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
