require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ Status
app.get('/status', (req, res) => {
  res.send('🔥 AVA online');
});

// ✅ Teste de conexão
app.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('messages').select('*').limit(5);
    if (error) return res.status(500).json({ erro: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ✅ Histórico de mensagens
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

// ✅ Rota para ativar AVA como agente externo via Supabase + OpenAI
app.get('/ava/:numero', async (req, res) => {
  const numero = `+${req.params.numero}`;

  try {
    // 🔍 Histórico de mensagens no Supabase
    const { data, error } = await supabase
      .from('messages')
      .select('content')
      .eq('number', numero)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ erro: error.message });
    if (!data || data.length === 0) {
      return res.json({ resposta: 'Sem mensagens no histórico ainda.' });

      
    }
    const mensagens = data.map(m => m.content);
    const historico = mensagens.slice(0, -1).join('\n');
    const ultimaMensagem = mensagens[mensagens.length - 1];

    const thread = await openai.beta.threads.create();
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.AVA_ASSISTANT_ID,
      instructions: `Você é a Ava, assistente oficial da AltaConversão.ai. Abaixo está o histórico de conversas anteriores com o cliente, seguido da última mensagem recebida. Responda com empatia, estratégia e tom humano, como se estivesse conversando pelo WhatsApp.

### Histórico:
${historico}

### Última mensagem do cliente:
${ultimaMensagem}

Responda como se fosse uma continuação da conversa. Seja clara, útil e objetiva. Caso não tenha histórico ou você não encontre, continue a nova conversa de forma natural.`
    });



    // 🕐 Polling até completar
    let status = 'queued';
    while (status !== 'completed') {
      await new Promise(r => setTimeout(r, 1000));
      const result = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      status = result.status;
    }

    // 💬 Captura da resposta da AVA
    const messages = await openai.beta.threads.messages.list(thread.id);
    const resposta = messages.data.find(m => m.role === 'assistant')?.content[0]?.text?.value;

    res.json({ resposta: resposta || 'Sem resposta gerada pela AVA.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
});

// ✅ Endpoint POST opcional (manter caso necessário)
app.post('/responder', async (req, res) => {
  try {
    const { numero, nome, empresa, mensagem } = req.body;

    if (!numero || !mensagem) {
      return res.status(400).json({ erro: 'Número e mensagem são obrigatórios.' });
    }

    const resposta = `Olá, ${nome || 'cliente'} da ${empresa || 'sua empresa'}! Recebemos: "${mensagem}"`;
    res.json({ resposta });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// 🟢 Start do servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
