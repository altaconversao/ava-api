import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const handleOpenAI = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages) {
      return res.status(400).json({ error: 'messages é obrigatório' });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.7
    });

    const reply = response.choices[0]?.message?.content;
    res.json({ reply });
  } catch (error) {
    console.error('Erro no OpenAI:', error);
    res.status(500).json({ error: 'Erro ao gerar resposta da IA' });
  }
};
