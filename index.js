require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = 3000;

const supabase = createClient(process.env.SUPABASE_URL, 
process.env.SUPABASE_KEY);

app.get('/', async (req, res) => {
  const { data, error } = await supabase.from('messages').select('*');
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

app.get('/responder/:numero', async (req, res) => {
  const numero = req.params.numero;

  const { data, error } = await supabase
    .from('messages')
    .select('content, created_at')
    .eq('number', `+${numero}`)
    .order('created_at', { ascending: true });

  if (error) {
    return res.status(500).json({ erro: error.message });
  }

  if (!data || data.length === 0) {
    return res.json({ resposta: 'Nenhuma mensagem encontrada.' });
  }

  const ultimaMensagem = data[data.length - 1].content;
  return res.json({ resposta: `Última mensagem: "${ultimaMensagem}"` });
});

app.listen(port, () => {
  console.log(`✅ AVA rodando na porta ${port}`);
});

