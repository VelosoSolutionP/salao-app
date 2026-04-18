import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileText, ShieldCheck } from "lucide-react";
import { AceiteForm } from "./AceiteForm";

export const metadata: Metadata = { title: "Termos de Uso — Bellefy" };

export default async function TermosPage() {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (session.user.role !== "OWNER") redirect("/dashboard");

  const salonId = session.user.salonId;
  if (!salonId) redirect("/dashboard");

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { name: true, termoAceito: true, termoAceitoEm: true },
  });

  if (salon?.termoAceito) redirect("/dashboard");

  const hoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg overflow-hidden">

        {/* Header */}
        <div className="bg-violet-600 px-8 py-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-6 h-6" />
            <span className="text-sm font-semibold uppercase tracking-widest opacity-80">
              Bellefy
            </span>
          </div>
          <h1 className="text-2xl font-black leading-tight">
            Contrato de Uso da Plataforma
          </h1>
          <p className="text-violet-200 text-sm mt-1">
            Salão: <strong className="text-white">{salon?.name}</strong> &mdash; {hoje}
          </p>
        </div>

        {/* Contract body */}
        <div className="px-8 py-6">
          <ScrollArea className="h-[420px] pr-4">
            <div className="space-y-5 text-sm text-gray-700 leading-relaxed">

              <section>
                <h2 className="font-bold text-gray-900 mb-1">1. Das Partes</h2>
                <p>
                  O presente contrato é celebrado entre <strong>Bellefy Tecnologia</strong>{" "}
                  (doravante "<em>Bellefy</em>" ou "<em>Plataforma</em>") e o proprietário do
                  estabelecimento cadastrado neste sistema (doravante "<em>Cliente</em>"), na
                  pessoa do responsável pela conta de acesso.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="font-bold text-gray-900 mb-1">2. Objeto do Contrato</h2>
                <p>
                  A Bellefy disponibiliza ao Cliente acesso à plataforma SaaS de gestão de salões
                  de beleza, incluindo agendamentos, controle financeiro, gestão de equipe,
                  estoque, marketing e demais funcionalidades descritas no plano contratado.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="font-bold text-gray-900 mb-1">3. Período de Teste Gratuito</h2>
                <p>
                  O Cliente tem direito a <strong>30 (trinta) dias de uso gratuito</strong> a
                  partir da data de criação da conta. Durante este período, todas as
                  funcionalidades da plataforma estão disponíveis sem custo. Ao término do
                  período de teste, a assinatura mensal será necessária para manter o acesso.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="font-bold text-gray-900 mb-1">4. Cobrança Mensal</h2>
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
                <h2 className="font-bold text-gray-900 mb-1">5. Reajuste de Preços</h2>
                <p>
                  A Bellefy se reserva o direito de reajustar os valores da mensalidade,
                  mediante notificação ao Cliente com antecedência mínima de{" "}
                  <strong>30 (trinta) dias</strong>. Caso o Cliente não concorde com o novo
                  valor, poderá cancelar o contrato sem ônus durante o aviso prévio.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="font-bold text-gray-900 mb-1">6. Cancelamento</h2>
                <p>
                  O Cliente pode solicitar o cancelamento a qualquer momento por e-mail ou
                  pelo suporte da plataforma. O acesso é mantido até o fim do período já pago.
                  Não há reembolso proporcional de mensalidades pagas.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="font-bold text-gray-900 mb-1">7. Responsabilidades do Cliente</h2>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>Manter suas credenciais de acesso em sigilo.</li>
                  <li>
                    Não compartilhar o acesso com terceiros não autorizados.
                  </li>
                  <li>
                    Utilizar a plataforma em conformidade com a legislação vigente.
                  </li>
                  <li>
                    Manter seus dados cadastrais atualizados.
                  </li>
                </ul>
              </section>

              <Separator />

              <section>
                <h2 className="font-bold text-gray-900 mb-1">8. Privacidade e Dados</h2>
                <p>
                  A Bellefy trata os dados do Cliente e de seus clientes finais em conformidade
                  com a <strong>Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018)</strong>.
                  Os dados são armazenados em servidores seguros e não são compartilhados com
                  terceiros sem consentimento, exceto quando exigido por lei.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="font-bold text-gray-900 mb-1">9. Disponibilidade do Serviço</h2>
                <p>
                  A Bellefy empenha-se em manter a plataforma disponível 24h por dia, 7 dias
                  por semana, com SLA de <strong>99% de uptime mensal</strong>. Manutenções
                  programadas serão comunicadas com antecedência. A Bellefy não se responsabiliza
                  por interrupções decorrentes de falhas de terceiros (infraestrutura de nuvem,
                  telecomunicações, etc.).
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="font-bold text-gray-900 mb-1">10. Suporte</h2>
                <p>
                  O suporte técnico é prestado por canais digitais (WhatsApp, e-mail ou chat)
                  em horário comercial, de segunda a sexta-feira das 9h às 18h, horário de
                  Brasília.
                </p>
              </section>

              <Separator />

              <section>
                <h2 className="font-bold text-gray-900 mb-1">11. Foro</h2>
                <p>
                  As partes elegem o foro da comarca de <strong>São Paulo/SP</strong> para
                  dirimir quaisquer controvérsias oriundas deste contrato, com renúncia a
                  qualquer outro, por mais privilegiado que seja.
                </p>
              </section>

              <div className="flex items-center gap-2 text-violet-700 bg-violet-50 rounded-lg p-3 mt-4">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <p className="text-xs">
                  Seu aceite eletrônico tem validade jurídica conforme o Marco Civil da Internet
                  (Lei 12.965/2014) e é registrado com data, hora e endereço IP.
                </p>
              </div>

            </div>
          </ScrollArea>

          <Separator className="my-5" />

          <AceiteForm />
        </div>
      </div>
    </div>
  );
}
