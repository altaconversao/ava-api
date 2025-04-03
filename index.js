import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import { Client } from "@notionhq/client";
import OpenAI from "openai";

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Notion + OpenAI Setup
const notion = new Client({ auth: process.env.NOTION_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/", (req, res) => {
  res.send("API da AVA rodando ✅");
});

app.get("/status", (req, res) => {
  res.status(200).json({ status: "Online", agent: "AVA" });
});

app.post("/responder", async (req, res) => {
  try {
    const { numero, mensagem } = req.body;

    if (!numero || !mensagem) {
      return res.status(400).json({ erro: "Número e mensagem são obrigatórios." });
    }

    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: "Número",
        rich_text: {
          contains: numero,
        },
      },
    });

    if (!response.results.length) {
      return res.status(404).json({ erro: "Cliente não encontrado." });
    }

    const cliente = response.results[0];
    const props = cliente.properties;

    const nomeCliente = props["Nome do Cliente"]?.title[0]?.plain_text || "Cliente";
    const nomeEmpresa = props["Nome da Empresa"]?.rich_text[0]?.plain_text || "sua empresa";

    const investimento = parseFloat(props.Investimento?.number || 0);
    const faturamento = parseFloat(props.Faturamento?.number || 0);
    const compras = parseInt(props.Compras?.number || 0);
    const roas = faturamento && investimento ? (faturamento / investimento).toFixed(2) : 0;
    const cpa = compras && investimento ? (investimento / compras).toFixed(2) : 0;

    const prompt = `
Você é a AVA, assistente de atendimento da AltaConversão.ai.
Responda com educação, empatia e estratégia. Nunca diga que é uma IA.
Seja breve, útil e propositiva. Utilize os dados da campanha quando disponíveis.

Cliente: ${nomeCliente}
Empresa: ${nomeEmpresa}

📊 Desempenho:
💰 Investimento: R$ ${investimento.toFixed(2)}
📈 Faturamento: R$ ${faturamento.toFixed(2)}
🛒 Compras: ${compras}
📊 ROAS: ${roas}
💳 CPA: R$ ${cpa}

Mensagem recebida: "${mensagem}"

Aja como uma consultora 24h. Traga insights, ideias, frases humanizadas como:
"Olha, eu sei que você sabe, mas estou aqui 24h para te ajudar, tá bom? Me chama sempre que quiser bater um papo."

Se os números estiverem baixos, mostre preocupação e proponha ações.
Se estiverem bons, elogie e incentive.
Sempre termine a resposta com um tom otimista.
`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4",
    });

    const resposta = completion.choices[0].message.content;
    res.status(200).json({ resposta });
  } catch (error) {
    console.error("Erro ao gerar resposta:", error);
    res.status(500).json({ erro: "Erro ao gerar resposta personalizada." });
  }
});

app.listen(port, () => {
  console.log(`🔥 Servidor rodando em http://localhost:${port}`);
});
