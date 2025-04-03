require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

// Aceita JSON no body
app.use(express.json());

// Conexão com o Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ✅ Status checker
app.get('/status', (req, res) => {
  res.send('🔥 AVA online');
});

// ✅ GET básico para debug
app.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('messages').select('*').limit(5);
    if (error) return res.status(500).json({ erro: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ✅ Retorna histórico de mensagens
app.get('/responder/:numero', async (req, res) => {
  const numero = `+${req.params.numero}`;

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('content, created_at')
      .eq('number', numero)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ erro: error.message });

    if (!data || data.length === 0) {
      return res.json({ resposta: 'Nenhuma mensagem encontrada.' });
    }

    const ultimaMensagem = data[data.length - 1].content;
    return res.json({ resposta: `Última mensagem: "${ultimaMensagem}"` });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ✅ Endpoint principal para responder
app.post('/responder', async (req, res) => {
  try {
    const { numero, nome, empresa, mensagem, contexto } = req.body;

    if (!numero || !mensagem) {
      return res.status(400).json({ erro: 'Número e mensagem são obrigatórios.' });
    }

    const resposta = `Olá, ${nome || 'cliente'} da ${empresa || 'sua empresa'}! Recebemos: "${mensagem}"`;

    res.json({ resposta });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Rota para ativar a AVA com base no número
app.get('/ava/:numero', async (req, res) => {
  const numero = `+${req.params.numero}`;

  try {
    // Busca histórico no Supabase
    const { data, error } = await supabase
      .from('messages')
      .select('content')
      .eq('number', numero)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ erro: error.message });
    if (!data || data.length === 0) {
      return res.json({ resposta: 'Sem mensagens no histórico ainda.' });
    }

    // Junta todas as mensagens como contexto para a AVA
    const contexto = data.map((m, i) => `Mensagem ${i + 1}: ${m.content}`).join('\n');

    // Cria thread + run do assistente AVA
    const thread = await openai.beta.threads.create();
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: 'asst_1nsGuD8O7v7zYnRYTtedJLpQ',
      instructions: `Você está conversando com um cliente da Alta Conversão via WhatsApp. Histórico recente:\n\n${contexto}`
    });

    // Espera a execução ser finalizada (polling)
    let status = 'queued';
    while (status !== 'completed') {
      await new Promise(r => setTimeout(r, 1000));
      const result = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      status = result.status;
    }

    // Recupera resposta gerada
    const messages = await openai.beta.threads.messages.list(thread.id);
    const resposta = messages.data.find(m => m.role === 'assistant')?.content[0]?.text?.value;

    res.json({ resposta });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
});
