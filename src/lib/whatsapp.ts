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

export function msgVencimentoProximo(salonName: string, dias: number, valor: string) {
  return `Olá! 👋\n\nSeu plano *Veloso Solution* para o salão *${salonName}* vence em *${dias} dia${dias > 1 ? "s" : ""}*.\n\n💰 Valor: *R$ ${valor}*\n\nEvite o bloqueio automático realizando o pagamento. Em caso de dúvidas, entre em contato.\n\n_Veloso Solution — Controle Total de Salões_`;
}

export function msgVencido(salonName: string, diasAtraso: number, valor: string) {
  return `⚠️ Pagamento em atraso!\n\nSeu plano *Veloso Solution* para *${salonName}* está vencido há *${diasAtraso} dia${diasAtraso > 1 ? "s" : ""}*.\n\n💰 Valor: *R$ ${valor}*\n\n${diasAtraso >= 5 ? "🔒 Seu acesso foi *bloqueado automaticamente*." : `⏳ O acesso será bloqueado em *${5 - diasAtraso} dia${5 - diasAtraso > 1 ? "s" : ""}* se não houver pagamento.`}\n\nRegularize agora para não perder o acesso.\n\n_Veloso Solution_`;
}
