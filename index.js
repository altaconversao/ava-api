require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Teste simples
app.get('/', async (req, res) => {
  const { data, error } = await supabase.from('messages').select('*');
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// Teste vivo
app.get('/status', (req, res) => {
  res.send('🔥 AVA online');
});

// Histórico de mensagens
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

// Requisição do Make
app.post('/responder', async (req, res) => {
  try {
    const { numero, nome, empresa, mensagem, contexto } = req.body;

    if (!numero || !mensagem) {
      return res.status(400).json({ erro: 'Número e mensagem são obrigatórios.' });
    }

    const resposta = `Olá, ${nome || 'cliente'} da ${empresa || 'empresa'}! Recebemos: "${mensagem}"`;

    return res.status(200).json({ resposta });
  } catch (error) {
    console.error('Erro no /responder:', error.message);
    return res.status(500).json({ erro: 'Erro interno ao processar a resposta.' });
  }
});

// Inicia servidor
app.listen(port, () => {
  console.log(`✅ AVA rodando na porta ${port}`);
});
