require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // Habilita JSON no body das requisições

// Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Rota de teste: GET todas as mensagens
app.get('/', async (req, res) => {
  const { data, error } = await supabase.from('messages').select('*');
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// Rota de histórico por número (GET)
app.get('/responder/:numero', async (req, res) => {
  const numero = '+' + req.params.numero;

  const { data, error } = await supabase
    .from('messages')
    .select('content, created_at')
    .eq('number', numero)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ erro: error.message });

  if (!data || data.length === 0) {
    return res.json({ resposta: 'Sem mensagens anteriores encontradas para esse número.' });
  }

  const ultimaMensagem = data[data.length - 1].content;

  return res.json({
    resposta: `Recebido! Última mensagem registrada foi: "${ultimaMensagem}"`
  });
});

// 🔥 NOVA ROTA POST /responder – recebe dados do Make, processa e responde
app.post('/responder', async (req, res) => {
  const { numero, nome, empresa, mensagem, contexto } = req.body;

  // Validação básica
  if (!numero || !mensagem) {
    return res.status(400).json({ erro: 'Número e mensagem são obrigatórios.' });
  }

  // Aqui você pode adicionar lógica de IA / GPT futuramente
  const respostaGerada = `Olá, ${nome || 'cliente'} da ${empresa || 'empresa'}! Recebemos: "${mensagem}"`;

  // Resposta
  return res.json({ resposta: respostaGerada });
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`✅ AVA rodando na porta ${port}`);
});
