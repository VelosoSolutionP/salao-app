import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlanosSistemaView } from "@/components/planos/PlanosSistemaView";
import {
  FileText,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Calendar,
  Wifi,
  DollarSign,
} from "lucide-react";

export const metadata: Metadata = { title: "Contrato — Bellefy" };

export default async function ContratoPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") redirect("/dashboard");

  const salonId = session.user.salonId;
  if (!salonId) redirect("/dashboard");

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: {
      name: true,
      termoAceito: true,
      termoAceitoEm: true,
      termoAceitoIp: true,
      contratos: {
        where: { ativo: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { valorMensal: true, diaVencimento: true, observacao: true, createdAt: true, plano: true },
      },
    },
  });

  const contrato = salon?.contratos[0];

  const aceitoDe = salon?.termoAceitoEm
    ? new Date(salon.termoAceitoEm).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Contrato de Uso</h1>
        <p className="text-sm text-gray-500 mt-1">
          Detalhes do seu contrato e plano com a plataforma Bellefy.
        </p>
      </div>

      {/* Plans by modules — premium art */}
      <PlanosSistemaView planoAtual={contrato?.plano ?? null} />

      {/* Status card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-violet-500" />
            Status do Contrato
          </h2>
          {salon?.termoAceito ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Ativo · Aceito
            </Badge>
          ) : (
            <Badge variant="destructive" className="font-semibold">
              <Clock className="w-3.5 h-3.5 mr-1" />
              Pendente de aceite
            </Badge>
          )}
        </div>

        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-gray-500 text-xs">Data do aceite</p>
              <p className="font-semibold text-gray-900 mt-0.5">
                {aceitoDe ?? "—"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
              <Wifi className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-gray-500 text-xs">IP registrado</p>
              <p className="font-semibold text-gray-900 mt-0.5 font-mono text-xs">
                {salon?.termoAceitoIp ?? "—"}
              </p>
            </div>
          </div>

          {contrato && (
            <>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Mensalidade</p>
                  <p className="font-semibold text-gray-900 mt-0.5">
                    R$ {Number(contrato.valorMensal).toFixed(2).replace(".", ",")}
                    /mês
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Vencimento todo dia</p>
                  <p className="font-semibold text-gray-900 mt-0.5">
                    Dia {contrato.diaVencimento} de cada mês
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {salon?.termoAceito && (
          <div className="flex items-center gap-2 text-violet-700 bg-violet-50 rounded-lg p-3 mt-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <p className="text-xs">
              Aceite eletrônico com validade jurídica conforme o Marco Civil da
              Internet (Lei 12.965/2014).
            </p>
          </div>
        )}

        {!salon?.termoAceito && (
          <a
            href="/termos"
            className="inline-flex items-center gap-2 mt-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <FileText className="w-4 h-4" />
            Ler e aceitar o contrato
          </a>
        )}
      </div>

      {/* Contract text */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-violet-500" />
          Texto do Contrato
        </h2>
        <ScrollArea className="h-[420px] pr-4">
          <div className="space-y-5 text-sm text-gray-700 leading-relaxed">

            <section>
              <h3 className="font-bold text-gray-900 mb-1">1. Das Partes</h3>
              <p>
                O presente contrato é celebrado entre <strong>Bellefy Tecnologia</strong>{" "}
                (doravante "<em>Bellefy</em>" ou "<em>Plataforma</em>") e o proprietário do
                estabelecimento cadastrado neste sistema (doravante "<em>Cliente</em>"), na
                pessoa do responsável pela conta de acesso.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="font-bold text-gray-900 mb-1">2. Objeto do Contrato</h3>
              <p>
                A Bellefy disponibiliza ao Cliente acesso à plataforma SaaS de gestão de salões
                de beleza, incluindo agendamentos, controle financeiro, gestão de equipe,
                estoque, marketing e demais funcionalidades descritas no plano contratado.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="font-bold text-gray-900 mb-1">3. Período de Teste Gratuito</h3>
              <p>
                O Cliente tem direito a <strong>30 (trinta) dias de uso gratuito</strong> a
                partir da data de criação da conta. Durante este período, todas as
                funcionalidades da plataforma estão disponíveis sem custo. Ao término do
                período de teste, a assinatura mensal será necessária para manter o acesso.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="font-bold text-gray-900 mb-1">4. Cobrança Mensal</h3>
              <p>
                Após o período de teste, o Cliente será cobrado mensalmente conforme o plano
                vigente. O valor da mensalidade e o dia de vencimento serão informados pela
                equipe Bellefy ao Cliente. A inadimplência superior a <strong>10 (dez) dias</strong>{" "}
                poderá resultar na suspensão temporária do acesso até a regularização do
                pagamento.
              </p>
              <p className="mt-2">
                Os pagamentos são realizados via link de cobrança, PIX ou cartão de crédito,
                de acordo com a forma acordada com a equipe Bellefy.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="font-bold text-gray-900 mb-1">5. Reajuste de Preços</h3>
              <p>
                A Bellefy se reserva o direito de reajustar os valores da mensalidade,
                mediante notificação ao Cliente com antecedência mínima de{" "}
                <strong>30 (trinta) dias</strong>. Caso o Cliente não concorde com o novo
                valor, poderá cancelar o contrato sem ônus durante o aviso prévio.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="font-bold text-gray-900 mb-1">6. Cancelamento</h3>
              <p>
                O Cliente pode solicitar o cancelamento a qualquer momento por e-mail ou
                pelo suporte da plataforma. O acesso é mantido até o fim do período já pago.
                Não há reembolso proporcional de mensalidades pagas.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="font-bold text-gray-900 mb-1">7. Responsabilidades do Cliente</h3>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>Manter suas credenciais de acesso em sigilo.</li>
                <li>Não compartilhar o acesso com terceiros não autorizados.</li>
                <li>Utilizar a plataforma em conformidade com a legislação vigente.</li>
                <li>Manter seus dados cadastrais atualizados.</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h3 className="font-bold text-gray-900 mb-1">8. Privacidade e Dados</h3>
              <p>
                A Bellefy trata os dados do Cliente e de seus clientes finais em conformidade
                com a <strong>Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018)</strong>.
                Os dados são armazenados em servidores seguros e não são compartilhados com
                terceiros sem consentimento, exceto quando exigido por lei.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="font-bold text-gray-900 mb-1">9. Disponibilidade do Serviço</h3>
              <p>
                A Bellefy empenha-se em manter a plataforma disponível 24h por dia, 7 dias
                por semana, com SLA de <strong>99% de uptime mensal</strong>. Manutenções
                programadas serão comunicadas com antecedência.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="font-bold text-gray-900 mb-1">10. Suporte</h3>
              <p>
                O suporte técnico é prestado por canais digitais (WhatsApp, e-mail ou chat)
                em horário comercial, de segunda a sexta-feira das 9h às 18h, horário de
                Brasília.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="font-bold text-gray-900 mb-1">11. Foro</h3>
              <p>
                As partes elegem o foro da comarca de <strong>São Paulo/SP</strong> para
                dirimir quaisquer controvérsias oriundas deste contrato, com renúncia a
                qualquer outro, por mais privilegiado que seja.
              </p>
            </section>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
