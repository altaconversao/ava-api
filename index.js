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
