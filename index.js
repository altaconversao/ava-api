const dotenv = require('dotenv');

const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const app = express();
const port = process.env.PORT || 8080;

app.use(bodyParser.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const assistant_id = process.env.OPENAI_ASSISTANT_ID;

app.post('/ava/responder', async (req, res) => {
  try {
    const { numero, nome, mensagem, empresa } = req.body;

    if (!numero || !mensagem) {
      return res.status(400).json({ error: 'Número e mensagem são obrigatórios.' });
    }

    const threadRes = await supabase
      .from('threads')
      .select('thread_id')
      .eq('numero', numero)
      .single();

    let thread_id = threadRes?.data?.thread_id;

    if (!thread_id) {
      const newThread = await openai.beta.threads.create();
      thread_id = newThread.id;

      await supabase.from('threads').insert([{ numero, thread_id }]);
    }

    await openai.beta.threads.messages.create(thread_id, {
      role: 'user',
      content: mensagem
    });

    // Buscar nome e empresa no Supabase
const clienteRes = await supabase
  .from('clientes')
  .select('nome, empresa')
  .eq('numero', numero)
  .single();

const nomeCliente = clienteRes?.data?.nome || nome || 'Cliente';
const empresaCliente = clienteRes?.data?.empresa || 'sua empresa';

// Rodar a AVA com instruções personalizadas
const run = await openai.beta.threads.runs.create(thread_id, {
  assistant_id,
  additional_instructions: `Você está conversando com ${req.body.nome || "um cliente"}, da empresa ${req.body.empresa || "a empresa dele(a)"}. Seja empática, proativa e útil. Se souber os dados dele, personalize suas respostas com essas informações.`
});

    let attempts = 0;
    let result;

    while (attempts < 15) {
      result = await openai.beta.threads.runs.retrieve(thread_id, run.id);

      if (result.status === 'completed') break;

      await new Promise(resolve => setTimeout(resolve, 1500));
      attempts++;
    }

    if (result.status !== 'completed') {
      return res.status(408).json({ error: 'A AVA demorou demais para responder.' });
    }

    const messages = await openai.beta.threads.messages.list(thread_id);
    const lastResponse = messages.data.find(msg => msg.role === 'assistant');
    const response = lastResponse?.content?.[0]?.text?.value || 'Sem resposta da AVA.';

    return res.json({ resposta: response });

    } catch (error) {
    console.error("Erro ao processar resposta da Ava:", error); // 👈 isso aqui vai nos dar o erro real
    res.status(500).json({ error: 'Erro interno ao responder.' });
  }
});

app.get('/ava/status', (req, res) => {
  res.send('AVA online e funcionando ✔️');
});

app.listen(port, () => {
  console.log(`AVA rodando em http://localhost:${port}`);
});

// Rota de execução do script de coleta do Meta Ads
app.get('/coletar-meta', async (req, res) => {
  try {
    const script = await import('./coletar_meta.js');
    res.status(200).send('✅ Script de coleta do Meta Ads executado.');
  } catch (err) {
    console.error('Erro ao executar o script de coleta:', err);
    res.status(500).send('❌ Erro ao executar o script.');
  }
});

