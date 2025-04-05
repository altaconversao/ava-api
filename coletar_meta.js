import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 📅 Ajuste a data que você quer buscar
const DATA_INICIAL = '2024-04-01';
const DATA_FINAL = '2024-04-04';

async function coletarDadosMeta() {
  const { data: contas, error } = await supabase
    .from('contas_anuncio')
    .select('*, clientes(id, nome)')
    .eq('plataforma', 'meta')
    .eq('valido', true);

  if (error) {
    console.error('Erro ao buscar contas:', error);
    return;
  }

  for (const conta of contas) {
    const { conta_id, access_token, cliente_id } = conta;

    const fields = [
      'campaign_name', 'adset_name', 'ad_name',
      'spend', 'clicks', 'cpm', 'ctr', 'reach', 'impressions',
      'actions', 'action_values'
    ];

    try {
      const response = await axios.get(
        `https://graph.facebook.com/v19.0/${conta_id}/insights`, {
          params: {
            level: 'ad', // ou 'campaign' / 'adset'
            time_range: { since: DATA_INICIAL, until: DATA_FINAL },
            fields: fields.join(','),
            access_token
          }
        }
      );

      const resultados = response.data.data;

      for (const linha of resultados) {
        // 👇 mapear métricas específicas
        const getAction = (type) =>
          linha.actions?.find((a) => a.action_type === type)?.value || 0;

        await supabase.from('dados_meta_ads').insert({
          cliente_id,
          campanha: linha.campaign_name,
          conjunto: linha.adset_name,
          criativo: linha.ad_name,
          valor_gasto: linha.spend,
          cliques: linha.clicks,
          cpm: linha.cpm,
          ctr: linha.ctr,
          alcance: linha.reach,
          impressoes: linha.impressions,
          visualizacoes: getAction('landing_page_view'),
          leads: getAction('lead'),
          custo_por_lead: linha.spend / (getAction('lead') || 1),
          conversas_iniciadas: getAction('onsite_conversion.messaging_conversation_started_7d'),
          custo_por_conversa: linha.spend / (getAction('onsite_conversion.messaging_conversation_started_7d') || 1),
          adicoes_carrinho: getAction('add_to_cart'),
          custo_por_adicao_carrinho: linha.spend / (getAction('add_to_cart') || 1),
          iniciacoes_checkout: getAction('initiate_checkout'),
          custo_por_iniciacao_checkout: linha.spend / (getAction('initiate_checkout') || 1),
          compras: getAction('purchase'),
          custo_por_compra: linha.spend / (getAction('purchase') || 1),
          roas: linha.action_values?.find((a) => a.action_type === 'purchase')?.value / (linha.spend || 1),
          ticket_medio: (linha.action_values?.find((a) => a.action_type === 'purchase')?.value || 0) /
            (getAction('purchase') || 1),
          data: new Date(DATA_FINAL)
        });
      }

      console.log(`✅ Dados inseridos para conta ${conta.nome_conta}`);
    } catch (err) {
      console.error(`Erro ao coletar dados da conta ${conta.nome_conta}`, err.response?.data || err.message);
    }
  }
}

coletarDadosMeta();
