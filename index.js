require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

// Necessário para aceitar JSON no body das requisições
app.use(express.json());

// Conexão com o Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// 🟢 GET simples para teste
app.get('/', async (req, res) => {
  const { data, error } = await supabase.from('messages').select('*');
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// 🟢 GET /responder/:numero → retorna histórico
app.get('/responder/:numero', async (req, res) => {
  const numero = `+${req.params.numero}`;

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
});

// 🟢 POST /responder → responde no WhatsApp (usado pelo Make)
app.post('/responder', async (req, res) => {
  const { numero, nome, empresa, mensagem, contexto } = req.body;

  if (!numero || !mensagem) {
    return res.status(400).json({ erro: 'Número e mensagem são obrigatórios.' });
  }

  const resposta = `Olá, ${nome || 'cliente'} da ${empresa || 'empresa'}! Recebemos: "${mensagem}"`;

  return res.json({ resposta });
});

// 🟢 Servidor iniciado
app.listen(port, () => {
  console.log(`✅ AVA rodando na porta ${port}`);
});
