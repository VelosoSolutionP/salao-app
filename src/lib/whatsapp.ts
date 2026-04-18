/**
 * WhatsApp notification helper — Z-API
 * Configure via environment variables:
 *   ZAPI_INSTANCE_ID  = seu instance ID do z-api.io
 *   ZAPI_TOKEN        = seu client token do z-api.io
 */

export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;

  if (!instanceId || !token) {
    console.log("[WhatsApp] Z-API não configurado. Mensagem para:", phone, "->", message.slice(0, 60));
    return false;
  }

  const clean = phone.replace(/\D/g, "");
  const number = clean.startsWith("55") ? clean : `55${clean}`;

  try {
    const res = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Client-Token": token },
        body: JSON.stringify({ phone: number, message }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      console.error("[WhatsApp] Z-API error:", err);
    }
    return res.ok;
  } catch (e) {
    console.error("[WhatsApp] Error:", e);
    return false;
  }
}

export function msgConfirmacaoAgendamento(
  clienteNome: string,
  salonName: string,
  data: string,
  hora: string,
  servicos: string,
  profissional: string,
) {
  return `Olá, *${clienteNome}*! 👋\n\nSeu agendamento foi confirmado:\n\n📅 *${data}* às *${hora}*\n💇 *${servicos}*\n👤 Profissional: *${profissional}*\n🏠 *${salonName}*\n\nQualquer dúvida, entre em contato conosco. Te esperamos! ✂️\n\n_${salonName}_`;
}

export function msgLembrete24h(
  clienteNome: string,
  salonName: string,
  hora: string,
  servicos: string,
) {
  return `Olá, *${clienteNome}*! 📅\n\nLembrete: seu agendamento é *amanhã às ${hora}*.\n\n💇 ${servicos}\n🏠 *${salonName}*\n\nTe esperamos! Caso precise remarcar, entre em contato com antecedência.\n\n_${salonName}_`;
}

export function msgLembrete1h(
  clienteNome: string,
  salonName: string,
  hora: string,
  minutos = 60,
) {
  const tempo = minutos < 60
    ? `${minutos} minutos`
    : minutos === 60
      ? "1 hora"
      : `${Math.round(minutos / 60)} horas`;
  return `⏰ *${clienteNome}*, seu horário em *${salonName}* é em *${tempo}* (${hora})!\n\nNão se esqueça. Te esperamos! ✂️`;
}

export function msgVencimentoProximo(salonName: string, dias: number, valor: string) {
  return `Olá! 👋\n\nSeu plano *Bellefy* para o salão *${salonName}* vence em *${dias} dia${dias > 1 ? "s" : ""}*.\n\n💰 Valor: *R$ ${valor}*\n\nEvite o bloqueio automático realizando o pagamento. Em caso de dúvidas, entre em contato.\n\n_Bellefy — Controle Total de Salões_`;
}

export function msgVencido(salonName: string, diasAtraso: number, valor: string) {
  return `⚠️ Pagamento em atraso!\n\nSeu plano *Bellefy* para *${salonName}* está vencido há *${diasAtraso} dia${diasAtraso > 1 ? "s" : ""}*.\n\n💰 Valor: *R$ ${valor}*\n\n${diasAtraso >= 5 ? "🔒 Seu acesso foi *bloqueado automaticamente*." : `⏳ O acesso será bloqueado em *${5 - diasAtraso} dia${5 - diasAtraso > 1 ? "s" : ""}* se não houver pagamento.`}\n\nRegularize agora para não perder o acesso.\n\n_Bellefy_`;
}
