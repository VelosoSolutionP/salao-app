/**
 * WhatsApp notification helper.
 * Configure via environment variables:
 *   EVOLUTION_API_URL     = https://your-evolution-instance.com
 *   EVOLUTION_API_KEY     = your-api-key
 *   EVOLUTION_API_INSTANCE = your-instance-name
 */

export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const apiUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_API_INSTANCE;

  if (!apiUrl || !apiKey || !instance) {
    console.log("[WhatsApp] Not configured. Would send to:", phone, "->", message.slice(0, 60));
    return false;
  }

  const clean = phone.replace(/\D/g, "");
  const number = clean.startsWith("55") ? clean : `55${clean}`;

  try {
    const res = await fetch(`${apiUrl}/message/sendText/${instance}`, {
      method: "POST",
      headers: { apikey: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ number, textMessage: { text: message } }),
    });
    return res.ok;
  } catch (e) {
    console.error("[WhatsApp] Error:", e);
    return false;
  }
}

export function msgVencimentoProximo(salonName: string, dias: number, valor: string) {
  return `Olá! 👋\n\nSeu plano *Veloso Solution* para o salão *${salonName}* vence em *${dias} dia${dias > 1 ? "s" : ""}*.\n\n💰 Valor: *R$ ${valor}*\n\nEvite o bloqueio automático realizando o pagamento. Em caso de dúvidas, entre em contato.\n\n_Veloso Solution — Controle Total de Salões_`;
}

export function msgVencido(salonName: string, diasAtraso: number, valor: string) {
  return `⚠️ Pagamento em atraso!\n\nSeu plano *Veloso Solution* para *${salonName}* está vencido há *${diasAtraso} dia${diasAtraso > 1 ? "s" : ""}*.\n\n💰 Valor: *R$ ${valor}*\n\n${diasAtraso >= 5 ? "🔒 Seu acesso foi *bloqueado automaticamente*." : `⏳ O acesso será bloqueado em *${5 - diasAtraso} dia${5 - diasAtraso > 1 ? "s" : ""}* se não houver pagamento.`}\n\nRegularize agora para não perder o acesso.\n\n_Veloso Solution_`;
}
