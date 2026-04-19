/**
 * Seed de desenvolvimento — MSB Solution
 *
 * Garantias de idempotência (pode rodar N vezes sem duplicar):
 *  - Todos os registros usam IDs fixos com prefixo "seed-"
 *  - upsert em tudo que tem ID determinístico
 *  - HorarioSalon / HorarioColaborador / ColaboradorServico: deleteMany + createMany
 *  - MovimentoEstoque: findFirst antes de criar (sem ID único próprio)
 *  - Agendamentos de hoje: update atualiza inicio/fim para sempre ter dados no dashboard
 *  - Agendamentos históricos: update: {} preserva datas da primeira execução
 */

// Carrega .env.local antes de tudo (ts-node não faz isso automaticamente)
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" }); // fallback

import {
  PrismaClient,
  AgendamentoStatus,
  MetodoPagamento,
  PagamentoStatus,
  TipoTransacao,
  TipoMovimento,
  TipoCampanha,
  TipoDesconto,
  PixKeyType,
} from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const pool    = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma  = new PrismaClient({ adapter } as any);

// ─── Helpers de data ─────────────────────────────────────────────────────────

function hojeAs(h: number, m = 0): Date {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function diasAtras(n: number, h: number, m = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, m, 0, 0);
  return d;
}

function diasFrente(n: number, h: number, m = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(h, m, 0, 0);
  return d;
}

function addMin(d: Date, min: number): Date {
  return new Date(d.getTime() + min * 60_000);
}

// ─── IDs fixos ────────────────────────────────────────────────────────────────

const ID = {
  // Usuários
  userOwner:   "seed-user-owner",
  userBarb1:   "seed-user-barber1",
  userBarb2:   "seed-user-barber2",
  userBarb3:   "seed-user-barber3",
  userCli1:    "seed-user-client1",
  userCli2:    "seed-user-client2",
  userCli3:    "seed-user-client3",
  userCli4:    "seed-user-client4",
  userCli5:    "seed-user-client5",
  // Salão
  salon:       "seed-salon-main",
  // Colaboradores
  colab1:      "seed-colab-pedro",
  colab2:      "seed-colab-lucas",
  colab3:      "seed-colab-marina",
  // Clientes
  cli1:        "seed-cli-1",
  cli2:        "seed-cli-2",
  cli3:        "seed-cli-3",
  cli4:        "seed-cli-4",
  cli5:        "seed-cli-5",
  // Serviços
  sCorte:      "seed-srv-corte-masc",
  sBarba:      "seed-srv-barba",
  sCombo:      "seed-srv-combo",
  sDegrade:    "seed-srv-degrade",
  sFeminino:   "seed-srv-corte-fem",
  sProgressiva:"seed-srv-progressiva",
  sHidratacao: "seed-srv-hidratacao",
  sColoracao:  "seed-srv-coloracao",
  sSobrancelha:"seed-srv-sobrancelha",
  sManicure:   "seed-srv-manicure",
  // Produtos
  p1:  "seed-prod-tinta-louro",
  p2:  "seed-prod-tinta-preto",
  p3:  "seed-prod-oleo-barba",
  p4:  "seed-prod-pomada",
  p5:  "seed-prod-shampoo",
  p6:  "seed-prod-condicionador",
  p7:  "seed-prod-lamina",
  p8:  "seed-prod-capa",
  p9:  "seed-prod-neutralizante",
  p10: "seed-prod-alcool",
  // Agendamentos de hoje (inicio/fim atualizados a cada execução)
  agH1: "seed-ag-hoje-1",  agH2: "seed-ag-hoje-2",  agH3: "seed-ag-hoje-3",
  agH4: "seed-ag-hoje-4",  agH5: "seed-ag-hoje-5",  agH6: "seed-ag-hoje-6",
  agH7: "seed-ag-hoje-7",  agH8: "seed-ag-hoje-8",  agH9: "seed-ag-hoje-9",
  // Agendamentos históricos (datas preservadas após 1ª execução)
  agP1: "seed-ag-past-1",  agP2: "seed-ag-past-2",  agP3: "seed-ag-past-3",
  agP4: "seed-ag-past-4",  agP5: "seed-ag-past-5",  agP6: "seed-ag-past-6",
  agP7: "seed-ag-past-7",  agP8: "seed-ag-past-8",
  // Agendamentos futuros (datas atualizadas a cada execução)
  agF1: "seed-ag-fut-1",   agF2: "seed-ag-fut-2",   agF3: "seed-ag-fut-3",
  // Transações
  tx1:  "seed-tx-1",  tx2:  "seed-tx-2",  tx3:  "seed-tx-3",
  tx4:  "seed-tx-4",  tx5:  "seed-tx-5",  tx6:  "seed-tx-6",
  tx7:  "seed-tx-7",  tx8:  "seed-tx-8",  tx9:  "seed-tx-9",
  tx10: "seed-tx-10", tx11: "seed-tx-11", tx12: "seed-tx-12",
  // Transações de hoje (hoje's CONCLUIDO+PAGO appointments)
  tx13: "seed-tx-13", tx14: "seed-tx-14", tx15: "seed-tx-15", tx16: "seed-tx-16",
  // Campanhas
  camp1: "seed-camp-verao",
  camp2: "seed-camp-bemvindo",
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("\n🌱  Seed MSB Solution — iniciando...\n");

  // ── 1. Hashes de senha ───────────────────────────────────────────────────
  const [hMaster, hDono, hBarb, hCli] = await Promise.all([
    bcrypt.hash("msb@master2025", 12),
    bcrypt.hash("msb@2025",  12),
    bcrypt.hash("barb@2025", 12),
    bcrypt.hash("cli@2025",  12),
  ]);

  // ── 2. Usuários ──────────────────────────────────────────────────────────
  console.log("👤  Usuários...");

  // Usuário MASTER — acesso total ao sistema, cadastra salões para clientes
  await prisma.user.upsert({
    where:  { id: "seed-user-master" },
    update: { passwordHash: hMaster },
    create: {
      id: "seed-user-master",
      name: "Admin MSB",
      email: "master@msbsolution.com",
      passwordHash: hMaster,
      phone: "11900000000",
      role: "MASTER",
    },
  });

  const owner = await prisma.user.upsert({
    where:  { id: ID.userOwner },
    update: {},
    create: { id: ID.userOwner, name: "Carlos Mendes",   email: "dono@msbsolution.com",   passwordHash: hDono, phone: "11999990001", role: "OWNER"  },
  });

  const [uBarb1, uBarb2, uBarb3] = await Promise.all([
    prisma.user.upsert({ where: { id: ID.userBarb1 }, update: {}, create: { id: ID.userBarb1, name: "Pedro Alves",    email: "pedro@msbsolution.com",  passwordHash: hBarb, phone: "11999990002", role: "BARBER" } }),
    prisma.user.upsert({ where: { id: ID.userBarb2 }, update: {}, create: { id: ID.userBarb2, name: "Lucas Ferreira", email: "lucas@msbsolution.com",  passwordHash: hBarb, phone: "11999990003", role: "BARBER" } }),
    prisma.user.upsert({ where: { id: ID.userBarb3 }, update: {}, create: { id: ID.userBarb3, name: "Marina Costa",  email: "marina@msbsolution.com", passwordHash: hBarb, phone: "11999990004", role: "BARBER" } }),
  ]);

  const [uCli1, uCli2, uCli3, uCli4, uCli5] = await Promise.all([
    prisma.user.upsert({ where: { id: ID.userCli1 }, update: {}, create: { id: ID.userCli1, name: "João Silva",     email: "joao@cliente.com",     passwordHash: hCli, phone: "11988880001", role: "CLIENT" } }),
    prisma.user.upsert({ where: { id: ID.userCli2 }, update: {}, create: { id: ID.userCli2, name: "Ana Souza",      email: "ana@cliente.com",      passwordHash: hCli, phone: "11988880002", role: "CLIENT" } }),
    prisma.user.upsert({ where: { id: ID.userCli3 }, update: {}, create: { id: ID.userCli3, name: "Marcos Lima",    email: "marcos@cliente.com",   passwordHash: hCli, phone: "11988880003", role: "CLIENT" } }),
    prisma.user.upsert({ where: { id: ID.userCli4 }, update: {}, create: { id: ID.userCli4, name: "Patrícia Gomes", email: "patricia@cliente.com", passwordHash: hCli, phone: "11988880004", role: "CLIENT" } }),
    prisma.user.upsert({ where: { id: ID.userCli5 }, update: {}, create: { id: ID.userCli5, name: "Rafael Nunes",   email: "rafael@cliente.com",   passwordHash: hCli, phone: "11988880005", role: "CLIENT" } }),
  ]);

  // ── 3. Salão ─────────────────────────────────────────────────────────────
  console.log("💈  Salão...");

  // Se já existe outro salão (usuário registrou o próprio), usa ele.
  // Isso evita criar um salão duplicado em dev — roda seed no salão ativo.
  const existingSalon = await prisma.salon.findFirst({
    where: { id: { not: ID.salon } },
    orderBy: { createdAt: "asc" },
  });

  const salon = existingSalon ?? await prisma.salon.upsert({
    where:  { id: ID.salon },
    update: {},
    create: {
      id: ID.salon, ownerId: owner.id,
      name: "Barbearia MSB", slug: "barbearia-msb",
      phone: "1133330001", address: "Rua das Flores, 123 — Centro", city: "São Paulo",
      pixKey: "dono@msbsolution.com", pixKeyType: PixKeyType.EMAIL,
      termoAceito: true, termoAceitoEm: new Date(),
    },
  });

  // Garante termoAceito no salão usado pelo seed (necessário para OWNER acessar o dashboard)
  if (!salon.termoAceito) {
    await prisma.salon.update({
      where: { id: salon.id },
      data: { termoAceito: true, termoAceitoEm: new Date() },
    });
  }

  // Horários do salão — idempotente via deleteMany + createMany
  await prisma.horarioSalon.deleteMany({ where: { salonId: salon.id } });
  await prisma.horarioSalon.createMany({
    data: [
      { salonId: salon.id, diaSemana: 0, abre: "09:00", fecha: "17:00", fechado: true  }, // Dom
      { salonId: salon.id, diaSemana: 1, abre: "08:00", fecha: "20:00", fechado: false }, // Seg
      { salonId: salon.id, diaSemana: 2, abre: "08:00", fecha: "20:00", fechado: false }, // Ter
      { salonId: salon.id, diaSemana: 3, abre: "08:00", fecha: "20:00", fechado: false }, // Qua
      { salonId: salon.id, diaSemana: 4, abre: "08:00", fecha: "20:00", fechado: false }, // Qui
      { salonId: salon.id, diaSemana: 5, abre: "08:00", fecha: "20:00", fechado: false }, // Sex
      { salonId: salon.id, diaSemana: 6, abre: "09:00", fecha: "18:00", fechado: false }, // Sáb
    ],
  });

  // ── 4. Serviços ───────────────────────────────────────────────────────────
  console.log("✂️   Serviços...");

  const [sCorte, sBarba, sCombo, sDegrade, sFem, sProg, sHidra, sColor, sSobr, sMani] =
    await Promise.all([
      prisma.servico.upsert({ where: { id: ID.sCorte      }, update: { salonId: salon.id }, create: { id: ID.sCorte,       salonId: salon.id, nome: "Corte Masculino",       preco: 45,   duracao: 30,  categoria: "Corte"      } }),
      prisma.servico.upsert({ where: { id: ID.sBarba      }, update: { salonId: salon.id }, create: { id: ID.sBarba,       salonId: salon.id, nome: "Barba",                 preco: 35,   duracao: 30,  categoria: "Barba"      } }),
      prisma.servico.upsert({ where: { id: ID.sCombo      }, update: { salonId: salon.id }, create: { id: ID.sCombo,       salonId: salon.id, nome: "Corte + Barba",          preco: 70,   duracao: 60,  categoria: "Combo"      } }),
      prisma.servico.upsert({ where: { id: ID.sDegrade    }, update: { salonId: salon.id }, create: { id: ID.sDegrade,     salonId: salon.id, nome: "Degradê",                preco: 55,   duracao: 45,  categoria: "Corte"      } }),
      prisma.servico.upsert({ where: { id: ID.sFeminino   }, update: { salonId: salon.id }, create: { id: ID.sFeminino,    salonId: salon.id, nome: "Corte Feminino",         preco: 80,   duracao: 60,  categoria: "Corte"      } }),
      prisma.servico.upsert({ where: { id: ID.sProgressiva}, update: { salonId: salon.id }, create: { id: ID.sProgressiva, salonId: salon.id, nome: "Escova Progressiva",     preco: 200,  duracao: 180, categoria: "Química"    } }),
      prisma.servico.upsert({ where: { id: ID.sHidratacao }, update: { salonId: salon.id }, create: { id: ID.sHidratacao,  salonId: salon.id, nome: "Hidratação Capilar",     preco: 70,   duracao: 60,  categoria: "Tratamento" } }),
      prisma.servico.upsert({ where: { id: ID.sColoracao  }, update: { salonId: salon.id }, create: { id: ID.sColoracao,   salonId: salon.id, nome: "Coloração",              preco: 120,  duracao: 90,  categoria: "Coloração"  } }),
      prisma.servico.upsert({ where: { id: ID.sSobrancelha}, update: { salonId: salon.id }, create: { id: ID.sSobrancelha, salonId: salon.id, nome: "Design de Sobrancelha",  preco: 25,   duracao: 20,  categoria: "Estética"   } }),
      prisma.servico.upsert({ where: { id: ID.sManicure   }, update: { salonId: salon.id }, create: { id: ID.sManicure,    salonId: salon.id, nome: "Manicure",               preco: 35,   duracao: 45,  categoria: "Estética"   } }),
    ]);

  // ── 5. Colaboradores ──────────────────────────────────────────────────────
  /**
   * Regras de negócio aplicadas:
   *  Pedro  (barbeiro clássico) → 45% comissão
   *  Lucas  (barbeiro moderno)  → 40% comissão
   *  Marina (especialista)      → 50% comissão (coloração/química — maior expertise)
   */
  console.log("💼  Colaboradores...");

  const [colab1, colab2, colab3] = await Promise.all([
    prisma.colaborador.upsert({ where: { id: ID.colab1 }, update: { salonId: salon.id }, create: { id: ID.colab1, userId: uBarb1.id, salonId: salon.id, bio: "Especialista em degradê e barba tradicional",          specialties: ["Degradê", "Barba", "Navalhado"],              comissao: 0.45 } }),
    prisma.colaborador.upsert({ where: { id: ID.colab2 }, update: { salonId: salon.id }, create: { id: ID.colab2, userId: uBarb2.id, salonId: salon.id, bio: "Corte moderno e atendimento rápido",                   specialties: ["Corte Masculino", "Corte + Barba"],            comissao: 0.40 } }),
    prisma.colaborador.upsert({ where: { id: ID.colab3 }, update: { salonId: salon.id }, create: { id: ID.colab3, userId: uBarb3.id, salonId: salon.id, bio: "Especialista em coloração e tratamentos capilares",    specialties: ["Coloração", "Escova Progressiva", "Hidratação"],comissao: 0.50 } }),
  ]);

  // Horários dos colaboradores
  await prisma.horarioColaborador.deleteMany({ where: { colaboradorId: { in: [colab1.id, colab2.id, colab3.id] } } });
  await prisma.horarioColaborador.createMany({
    data: [
      // Pedro — Seg a Sáb 09:00–18:00
      ...[1,2,3,4,5,6].map(d => ({ colaboradorId: colab1.id, diaSemana: d, inicio: "09:00", fim: "18:00" })),
      // Lucas — Seg a Sex 10:00–19:00, Sáb 10:00–17:00
      ...[1,2,3,4,5].map(d => ({ colaboradorId: colab2.id, diaSemana: d, inicio: "10:00", fim: "19:00" })),
      { colaboradorId: colab2.id, diaSemana: 6, inicio: "10:00", fim: "17:00" },
      // Marina — Ter a Sáb 09:00–18:00
      ...[2,3,4,5,6].map(d => ({ colaboradorId: colab3.id, diaSemana: d, inicio: "09:00", fim: "18:00" })),
    ],
  });

  // Serviços por colaborador
  await prisma.colaboradorServico.deleteMany({ where: { colaboradorId: { in: [colab1.id, colab2.id, colab3.id] } } });
  await prisma.colaboradorServico.createMany({
    data: [
      // Pedro — clássico
      { colaboradorId: colab1.id, servicoId: sCorte.id },
      { colaboradorId: colab1.id, servicoId: sBarba.id },
      { colaboradorId: colab1.id, servicoId: sCombo.id },
      { colaboradorId: colab1.id, servicoId: sDegrade.id },
      { colaboradorId: colab1.id, servicoId: sSobr.id },
      // Lucas — moderno
      { colaboradorId: colab2.id, servicoId: sCorte.id },
      { colaboradorId: colab2.id, servicoId: sBarba.id },
      { colaboradorId: colab2.id, servicoId: sCombo.id },
      { colaboradorId: colab2.id, servicoId: sDegrade.id },
      // Marina — coloração e tratamentos
      { colaboradorId: colab3.id, servicoId: sFem.id },
      { colaboradorId: colab3.id, servicoId: sProg.id },
      { colaboradorId: colab3.id, servicoId: sHidra.id },
      { colaboradorId: colab3.id, servicoId: sColor.id },
      { colaboradorId: colab3.id, servicoId: sSobr.id },
      { colaboradorId: colab3.id, servicoId: sMani.id },
    ],
  });

  // ── 6. Clientes ───────────────────────────────────────────────────────────
  console.log("🙋  Clientes...");

  const [cli1, cli2, cli3, cli4, cli5] = await Promise.all([
    prisma.cliente.upsert({ where: { id: ID.cli1 }, update: {}, create: { id: ID.cli1, userId: uCli1.id, salonId: salon.id, totalVisitas: 12, totalGasto: 540, ultimaVisita: diasAtras(3,10)  } }),
    prisma.cliente.upsert({ where: { id: ID.cli2 }, update: {}, create: { id: ID.cli2, userId: uCli2.id, salonId: salon.id, totalVisitas:  5, totalGasto: 350, ultimaVisita: diasAtras(7,11)  } }),
    prisma.cliente.upsert({ where: { id: ID.cli3 }, update: {}, create: { id: ID.cli3, userId: uCli3.id, salonId: salon.id, totalVisitas:  8, totalGasto: 480, ultimaVisita: diasAtras(1,14)  } }),
    prisma.cliente.upsert({ where: { id: ID.cli4 }, update: {}, create: { id: ID.cli4, userId: uCli4.id, salonId: salon.id, totalVisitas:  3, totalGasto: 210, ultimaVisita: diasAtras(14,9)  } }),
    prisma.cliente.upsert({ where: { id: ID.cli5 }, update: {}, create: { id: ID.cli5, userId: uCli5.id, salonId: salon.id, totalVisitas:  1, totalGasto:  45, ultimaVisita: diasAtras(21,16) } }),
  ]);

  // ── 7. Notificações ───────────────────────────────────────────────────────
  console.log("🔔  Notificações...");

  for (const userId of [owner.id, uBarb1.id, uBarb2.id, uBarb3.id, uCli1.id, uCli2.id, uCli3.id, uCli4.id, uCli5.id]) {
    await prisma.notifConfig.upsert({ where: { userId }, update: {}, create: { userId } });
  }

  // ── 8. Agendamentos de hoje ───────────────────────────────────────────────
  // update: { inicio, fim } → dashboard sempre populado independente do dia
  console.log("📅  Agendamentos de hoje...");

  // Pedro — coluna cheia (2 concluídos + 1 ao vivo + 1 confirmado)
  await ag(ID.agH1, { salonId: salon.id, clienteId: cli1.id, colaboradorId: colab1.id, inicio: hojeAs(8,0),   fim: addMin(hojeAs(8,0),30),   status: AgendamentoStatus.CONCLUIDO,     totalPrice: 45,  pagamento: MetodoPagamento.PIX,            pagamentoStatus: PagamentoStatus.PAGO    }, true);
  await srv(ID.agH1, sCorte.id,  45, 30);
  await ag(ID.agH2, { salonId: salon.id, clienteId: cli3.id, colaboradorId: colab1.id, inicio: hojeAs(8,45),  fim: addMin(hojeAs(8,45),60),  status: AgendamentoStatus.CONCLUIDO,     totalPrice: 70,  pagamento: MetodoPagamento.DINHEIRO,       pagamentoStatus: PagamentoStatus.PAGO    }, true);
  await srv(ID.agH2, sCombo.id,  70, 60);
  await ag(ID.agH3, { salonId: salon.id, clienteId: cli2.id, colaboradorId: colab1.id, inicio: hojeAs(10,0),  fim: addMin(hojeAs(10,0),45),  status: AgendamentoStatus.EM_ANDAMENTO,  totalPrice: 55,  pagamento: MetodoPagamento.PIX,            pagamentoStatus: PagamentoStatus.PENDENTE}, true);
  await srv(ID.agH3, sDegrade.id,55, 45);
  await ag(ID.agH4, { salonId: salon.id, clienteId: cli4.id, colaboradorId: colab1.id, inicio: hojeAs(11,30), fim: addMin(hojeAs(11,30),30), status: AgendamentoStatus.CONFIRMADO,    totalPrice: 35,  pagamento: MetodoPagamento.PIX,            pagamentoStatus: PagamentoStatus.PENDENTE}, true);
  await srv(ID.agH4, sBarba.id,  35, 30);

  // Lucas — parcialmente ocupado
  await ag(ID.agH5, { salonId: salon.id, clienteId: cli5.id, colaboradorId: colab2.id, inicio: hojeAs(10,30), fim: addMin(hojeAs(10,30),30), status: AgendamentoStatus.CONCLUIDO,     totalPrice: 45,  pagamento: MetodoPagamento.CARTAO_DEBITO,  pagamentoStatus: PagamentoStatus.PAGO    }, true);
  await srv(ID.agH5, sCorte.id,  45, 30);
  await ag(ID.agH6, { salonId: salon.id, clienteId: cli1.id, colaboradorId: colab2.id, inicio: hojeAs(11,30), fim: addMin(hojeAs(11,30),60), status: AgendamentoStatus.EM_ANDAMENTO,  totalPrice: 70,  pagamento: MetodoPagamento.PIX,            pagamentoStatus: PagamentoStatus.PENDENTE}, true);
  await srv(ID.agH6, sCombo.id,  70, 60);
  await ag(ID.agH7, { salonId: salon.id, clienteId: cli3.id, colaboradorId: colab2.id, inicio: hojeAs(14,0),  fim: addMin(hojeAs(14,0),45),  status: AgendamentoStatus.CONFIRMADO,    totalPrice: 55,  pagamento: MetodoPagamento.CARTAO_CREDITO, pagamentoStatus: PagamentoStatus.PENDENTE}, true);
  await srv(ID.agH7, sDegrade.id,55, 45);

  // Marina — serviços longos
  await ag(ID.agH8, { salonId: salon.id, clienteId: cli2.id, colaboradorId: colab3.id, inicio: hojeAs(9,0),   fim: addMin(hojeAs(9,0),90),   status: AgendamentoStatus.CONCLUIDO,     totalPrice: 120, pagamento: MetodoPagamento.PIX,            pagamentoStatus: PagamentoStatus.PAGO    }, true);
  await srv(ID.agH8, sColor.id, 120, 90);
  await ag(ID.agH9, { salonId: salon.id, clienteId: cli4.id, colaboradorId: colab3.id, inicio: hojeAs(11,0),  fim: addMin(hojeAs(11,0),60),  status: AgendamentoStatus.CONFIRMADO,    totalPrice: 70,  pagamento: MetodoPagamento.CARTAO_CREDITO, pagamentoStatus: PagamentoStatus.PENDENTE}, true);
  await srv(ID.agH9, sHidra.id,  70, 60);

  // ── 9. Histórico de agendamentos ──────────────────────────────────────────
  // update: {} → datas não mudam após 1ª execução
  console.log("🗂️   Histórico...");

  await ag(ID.agP1, { salonId: salon.id, clienteId: cli1.id, colaboradorId: colab1.id, inicio: diasAtras(1,9),    fim: addMin(diasAtras(1,9),60),    status: AgendamentoStatus.CONCLUIDO,       totalPrice: 70,  pagamento: MetodoPagamento.PIX,            pagamentoStatus: PagamentoStatus.PAGO    }, false);
  await srv(ID.agP1, sCombo.id,  70, 60);
  await ag(ID.agP2, { salonId: salon.id, clienteId: cli3.id, colaboradorId: colab2.id, inicio: diasAtras(2,14),   fim: addMin(diasAtras(2,14),30),   status: AgendamentoStatus.NAO_COMPARECEU,  totalPrice: 45,  pagamento: undefined,                     pagamentoStatus: PagamentoStatus.PENDENTE}, false);
  await srv(ID.agP2, sCorte.id,  45, 30);
  await ag(ID.agP3, { salonId: salon.id, clienteId: cli2.id, colaboradorId: colab3.id, inicio: diasAtras(3,10),   fim: addMin(diasAtras(3,10),180),  status: AgendamentoStatus.CONCLUIDO,       totalPrice: 200, pagamento: MetodoPagamento.CARTAO_CREDITO, pagamentoStatus: PagamentoStatus.PAGO    }, false);
  await srv(ID.agP3, sProg.id,  200,180);
  await ag(ID.agP4, { salonId: salon.id, clienteId: cli4.id, colaboradorId: colab1.id, inicio: diasAtras(5,11),   fim: addMin(diasAtras(5,11),45),   status: AgendamentoStatus.CONCLUIDO,       totalPrice: 55,  pagamento: MetodoPagamento.DINHEIRO,       pagamentoStatus: PagamentoStatus.PAGO    }, false);
  await srv(ID.agP4, sDegrade.id,55, 45);
  await ag(ID.agP5, { salonId: salon.id, clienteId: cli5.id, colaboradorId: colab2.id, inicio: diasAtras(7,15),   fim: addMin(diasAtras(7,15),60),   status: AgendamentoStatus.CONCLUIDO,       totalPrice: 70,  pagamento: MetodoPagamento.PIX,            pagamentoStatus: PagamentoStatus.PAGO    }, false);
  await srv(ID.agP5, sCombo.id,  70, 60);
  await ag(ID.agP6, { salonId: salon.id, clienteId: cli1.id, colaboradorId: colab3.id, inicio: diasAtras(10,9),   fim: addMin(diasAtras(10,9),90),   status: AgendamentoStatus.CONCLUIDO,       totalPrice: 120, pagamento: MetodoPagamento.PIX,            pagamentoStatus: PagamentoStatus.PAGO    }, false);
  await srv(ID.agP6, sColor.id, 120, 90);
  await ag(ID.agP7, { salonId: salon.id, clienteId: cli2.id, colaboradorId: colab1.id, inicio: diasAtras(14,10),  fim: addMin(diasAtras(14,10),30),  status: AgendamentoStatus.CANCELADO,       totalPrice: 45,  canceladoMotivo: "Cancelado com mais de 2h de antecedência", pagamentoStatus: PagamentoStatus.PENDENTE}, false);
  await srv(ID.agP7, sCorte.id,  45, 30);
  await ag(ID.agP8, { salonId: salon.id, clienteId: cli3.id, colaboradorId: colab1.id, inicio: diasAtras(21,14,30),fim: addMin(diasAtras(21,14,30),30),status: AgendamentoStatus.CONCLUIDO,      totalPrice: 35,  pagamento: MetodoPagamento.DINHEIRO,       pagamentoStatus: PagamentoStatus.PAGO    }, false);
  await srv(ID.agP8, sBarba.id,  35, 30);

  // ── 10. Agendamentos futuros ──────────────────────────────────────────────
  console.log("📆  Agendamentos futuros...");

  await ag(ID.agF1, { salonId: salon.id, clienteId: cli1.id, colaboradorId: colab1.id, inicio: diasFrente(1,10),  fim: addMin(diasFrente(1,10),60),  status: AgendamentoStatus.CONFIRMADO, totalPrice: 70,  pagamento: MetodoPagamento.PIX,            pagamentoStatus: PagamentoStatus.PENDENTE}, true);
  await srv(ID.agF1, sCombo.id,  70, 60);
  await ag(ID.agF2, { salonId: salon.id, clienteId: cli2.id, colaboradorId: colab3.id, inicio: diasFrente(2,9),   fim: addMin(diasFrente(2,9),90),   status: AgendamentoStatus.PENDENTE,   totalPrice: 120, pagamento: undefined,                     pagamentoStatus: PagamentoStatus.PENDENTE}, true);
  await srv(ID.agF2, sColor.id, 120, 90);
  await ag(ID.agF3, { salonId: salon.id, clienteId: cli5.id, colaboradorId: colab2.id, inicio: diasFrente(3,14),  fim: addMin(diasFrente(3,14),45),  status: AgendamentoStatus.PENDENTE,   totalPrice: 55,  pagamento: undefined,                     pagamentoStatus: PagamentoStatus.PENDENTE}, true);
  await srv(ID.agF3, sDegrade.id,55, 45);

  // ── 11. Transações financeiras ────────────────────────────────────────────
  /**
   * Regras de negócio:
   *  - NAO_COMPARECEU gera taxa de 20% sobre o valor (agP2 → R$9,00)
   *  - CONCLUIDO gera RECEITA no valor total
   *  - Despesas operacionais fixas (aluguel, energia, etc.)
   */
  console.log("💰  Transações...");

  const txs: Array<{
    id: string; agendamentoId?: string; tipo: TipoTransacao;
    descricao: string; valor: number; metodo?: MetodoPagamento;
    categoria: string; data: Date;
  }> = [
    { id: ID.tx1,  agendamentoId: ID.agP1, tipo: TipoTransacao.RECEITA, descricao: "Atendimento — Corte + Barba (João Silva)",       valor:  70,   metodo: MetodoPagamento.PIX,            categoria: "Atendimento", data: diasAtras(1,10)    },
    { id: ID.tx2,  agendamentoId: ID.agP3, tipo: TipoTransacao.RECEITA, descricao: "Atendimento — Escova Progressiva (Ana Souza)",   valor: 200,   metodo: MetodoPagamento.CARTAO_CREDITO, categoria: "Atendimento", data: diasAtras(3,12)    },
    { id: ID.tx3,  agendamentoId: ID.agP4, tipo: TipoTransacao.RECEITA, descricao: "Atendimento — Degradê (Patrícia Gomes)",         valor:  55,   metodo: MetodoPagamento.DINHEIRO,       categoria: "Atendimento", data: diasAtras(5,11,45) },
    { id: ID.tx4,  agendamentoId: ID.agP5, tipo: TipoTransacao.RECEITA, descricao: "Atendimento — Corte + Barba (Rafael Nunes)",     valor:  70,   metodo: MetodoPagamento.PIX,            categoria: "Atendimento", data: diasAtras(7,16)    },
    { id: ID.tx5,  agendamentoId: ID.agP6, tipo: TipoTransacao.RECEITA, descricao: "Atendimento — Coloração (João Silva)",           valor: 120,   metodo: MetodoPagamento.PIX,            categoria: "Atendimento", data: diasAtras(10,10,30)},
    { id: ID.tx6,  agendamentoId: ID.agP8, tipo: TipoTransacao.RECEITA, descricao: "Atendimento — Barba (Marcos Lima)",              valor:  35,   metodo: MetodoPagamento.DINHEIRO,       categoria: "Atendimento", data: diasAtras(21,15)   },
    // Regra: não comparecimento → taxa 20% do valor (R$45 × 20% = R$9)
    { id: ID.tx7,  tipo: TipoTransacao.RECEITA, descricao: "Taxa não comparecimento 20% — Marcos Lima",    valor:   9,   metodo: MetodoPagamento.PIX,            categoria: "Taxa",        data: diasAtras(2,14,30) },
    // Despesas operacionais
    { id: ID.tx8,  tipo: TipoTransacao.DESPESA, descricao: "Aluguel mensal",                                valor: 2800,  metodo: MetodoPagamento.TRANSFERENCIA,  categoria: "Aluguel",     data: diasAtras(12,9)    },
    { id: ID.tx9,  tipo: TipoTransacao.DESPESA, descricao: "Energia Elétrica",                              valor:  380,  metodo: MetodoPagamento.PIX,            categoria: "Utilidade",   data: diasAtras(15,10)   },
    { id: ID.tx10, tipo: TipoTransacao.DESPESA, descricao: "Reposição de produtos — L'Oréal / Wella",       valor:  450,  metodo: MetodoPagamento.CARTAO_CREDITO, categoria: "Estoque",     data: diasAtras(8,14)    },
    { id: ID.tx11, tipo: TipoTransacao.DESPESA, descricao: "Material de limpeza",                            valor:   85,  metodo: MetodoPagamento.DINHEIRO,       categoria: "Limpeza",     data: diasAtras(6,11)    },
    { id: ID.tx12, tipo: TipoTransacao.DESPESA, descricao: "Internet + sistema MSB (mensalidade)",           valor:  199,  metodo: MetodoPagamento.CARTAO_DEBITO,  categoria: "Sistema",     data: diasAtras(10,9)    },
    // Hoje: receitas dos agendamentos CONCLUIDO+PAGO (agH1, agH2, agH5, agH8)
    { id: ID.tx13, agendamentoId: ID.agH1, tipo: TipoTransacao.RECEITA, descricao: "Atendimento — Corte Masculino (João Silva)",       valor:  45,  metodo: MetodoPagamento.PIX,           categoria: "Atendimento", data: hojeAs(8,30)  },
    { id: ID.tx14, agendamentoId: ID.agH2, tipo: TipoTransacao.RECEITA, descricao: "Atendimento — Corte + Barba (Ana Souza)",          valor:  70,  metodo: MetodoPagamento.DINHEIRO,      categoria: "Atendimento", data: hojeAs(9,45)  },
    { id: ID.tx15, agendamentoId: ID.agH5, tipo: TipoTransacao.RECEITA, descricao: "Atendimento — Corte Masculino (Rafael Nunes)",     valor:  45,  metodo: MetodoPagamento.CARTAO_DEBITO, categoria: "Atendimento", data: hojeAs(11,0)  },
    { id: ID.tx16, agendamentoId: ID.agH8, tipo: TipoTransacao.RECEITA, descricao: "Atendimento — Coloração (Ana Souza)",              valor: 120,  metodo: MetodoPagamento.PIX,           categoria: "Atendimento", data: hojeAs(10,30) },
  ];

  for (const t of txs) {
    await prisma.transacao.upsert({
      where:  { id: t.id },
      // Sempre atualiza a data para manter as transações no período corrente
      update: { dataTransacao: t.data },
      create: {
        id: t.id, salonId: salon.id,
        agendamentoId: t.agendamentoId,
        tipo: t.tipo, descricao: t.descricao,
        valor: t.valor, metodo: t.metodo,
        categoria: t.categoria, dataTransacao: t.data,
      },
    });
  }

  // ── 12. Produtos e estoque ────────────────────────────────────────────────
  /**
   * Produtos com estoque < estoqueMin aparecem como alertas no dashboard:
   *  prod2 (Tinta Preto 1.0) → 2 un  (mín 5) — CRÍTICO
   *  prod4 (Pomada Forte)    → 1 un  (mín 5) — CRÍTICO
   *  prod6 (Condicionador)   → 1 L   (mín 3) — CRÍTICO
   *  prod8 (Capa desc.)      → 3 cx  (mín 5) — ATENÇÃO
   */
  console.log("📦  Produtos...");

  const produtos = [
    { id: ID.p1,  nome: "Tinta Louro Claro 7.0",     categoria: "Coloração",   marca: "L'Oréal",     unidade: "un",  precoCompra: 18.50, precoVenda: 35,  estoque: 12, estoqueMin: 5  },
    { id: ID.p2,  nome: "Tinta Preto Natural 1.0",   categoria: "Coloração",   marca: "Wella",       unidade: "un",  precoCompra: 16.00, precoVenda: 30,  estoque:  2, estoqueMin: 5  },
    { id: ID.p3,  nome: "Óleo de Barba Premium",     categoria: "Barba",       marca: "Barba Forte", unidade: "ml",  precoCompra: 22.00, precoVenda: 45,  estoque:  8, estoqueMin: 4  },
    { id: ID.p4,  nome: "Pomada Modeladora Forte",   categoria: "Barba",       marca: "Uppercut",    unidade: "un",  precoCompra: 28.00, precoVenda: 55,  estoque:  1, estoqueMin: 5  },
    { id: ID.p5,  nome: "Shampoo Anti-resíduo 1L",   categoria: "Capilar",     marca: "Wella",       unidade: "L",   precoCompra: 35.00, precoVenda: 65,  estoque:  5, estoqueMin: 3  },
    { id: ID.p6,  nome: "Condicionador Hidratação",  categoria: "Capilar",     marca: "Kérastase",   unidade: "L",   precoCompra: 45.00, precoVenda: 80,  estoque:  1, estoqueMin: 3  },
    { id: ID.p7,  nome: "Lâmina Gillette Fusion",    categoria: "Descartável", marca: "Gillette",    unidade: "cx",  precoCompra:  8.00, precoVenda: 15,  estoque: 20, estoqueMin: 10 },
    { id: ID.p8,  nome: "Capa Descartável (cx100)",  categoria: "Descartável", marca: "Genérico",    unidade: "cx",  precoCompra: 12.00, precoVenda:  0,  estoque:  3, estoqueMin: 5  },
    { id: ID.p9,  nome: "Neutralizante Pós-química", categoria: "Pós-química", marca: "Schwarzkopf", unidade: "ml",  precoCompra: 25.00, precoVenda: 48,  estoque:  4, estoqueMin: 4  },
    { id: ID.p10, nome: "Álcool Gel 70% 500ml",      categoria: "Higiene",     marca: "Assepso",     unidade: "un",  precoCompra:  9.00, precoVenda:  0,  estoque:  6, estoqueMin: 3  },
  ];

  for (const p of produtos) {
    await prisma.produto.upsert({ where: { id: p.id }, update: {}, create: { salonId: salon.id, ...p } });
  }

  // Movimentos de estoque (findFirst + create — sem ID único próprio no schema)
  const movimentos = [
    { produtoId: ID.p1, tipo: TipoMovimento.ENTRADA, quantidade: 10, observacao: "Reposição mensal",      userId: owner.id,   createdAt: diasAtras(8,14)  },
    { produtoId: ID.p3, tipo: TipoMovimento.ENTRADA, quantidade:  5, observacao: "Reposição mensal",      userId: owner.id,   createdAt: diasAtras(8,14)  },
    { produtoId: ID.p7, tipo: TipoMovimento.ENTRADA, quantidade: 20, observacao: "Compra fornecedor",     userId: owner.id,   createdAt: diasAtras(15,9)  },
    { produtoId: ID.p2, tipo: TipoMovimento.SAIDA,   quantidade:  3, observacao: "Uso em coloração",      userId: uBarb3.id,  createdAt: diasAtras(3,11)  },
    { produtoId: ID.p4, tipo: TipoMovimento.SAIDA,   quantidade:  4, observacao: "Uso em atendimentos",   userId: uBarb1.id,  createdAt: diasAtras(5,10)  },
    { produtoId: ID.p6, tipo: TipoMovimento.SAIDA,   quantidade:  2, observacao: "Uso em hidratação",     userId: uBarb3.id,  createdAt: diasAtras(3,11)  },
    { produtoId: ID.p9, tipo: TipoMovimento.AJUSTE,  quantidade:  4, observacao: "Acerto de inventário",  userId: owner.id,   createdAt: diasAtras(30,9)  },
  ];

  for (const m of movimentos) {
    const existe = await prisma.movimentoEstoque.findFirst({
      where: { produtoId: m.produtoId, tipo: m.tipo, quantidade: m.quantidade, createdAt: m.createdAt },
    });
    if (!existe) {
      await prisma.movimentoEstoque.create({ data: m });
    }
  }

  // ── 13. Campanhas ─────────────────────────────────────────────────────────
  console.log("🎯  Campanhas...");

  await prisma.campanha.upsert({
    where:  { id: ID.camp1 },
    update: {},
    create: {
      id: ID.camp1, salonId: salon.id,
      nome: "Promoção Verão", tipo: TipoCampanha.DESCONTO,
      descricao: "15% de desconto no Corte + Barba durante o verão",
      desconto: 15, tipoDesconto: TipoDesconto.PERCENTUAL,
      codigo: "VERAO15",
      validaDe: diasAtras(30,0), validaAte: diasFrente(60,23,59),
      ativa: true, usosMax: 100, usosAtuais: 23,
      servicoIds: [ID.sCombo],
    },
  });

  await prisma.campanha.upsert({
    where:  { id: ID.camp2 },
    update: {},
    create: {
      id: ID.camp2, salonId: salon.id,
      nome: "Bem-vindo — Primeiro Corte", tipo: TipoCampanha.PRIMEIRO_AGENDAMENTO,
      descricao: "R$10 de desconto para novos clientes no primeiro agendamento",
      desconto: 10, tipoDesconto: TipoDesconto.FIXO,
      codigo: "BEMVINDO10",
      validaDe: diasAtras(90,0), validaAte: diasFrente(90,23,59),
      ativa: true, usosMax: null, usosAtuais: 7,
      servicoIds: [],
    },
  });

  // ── Resumo ────────────────────────────────────────────────────────────────
  console.log("\n✅  Seed concluído!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  ACESSO AO SISTEMA");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Proprietário   dono@msbsolution.com    msb@2025");
  console.log("  Barbeiro       pedro@msbsolution.com   barb@2025");
  console.log("  Barbeiro       lucas@msbsolution.com   barb@2025");
  console.log("  Cabeleireira   marina@msbsolution.com  barb@2025");
  console.log("  Cliente        joao@cliente.com        cli@2025");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Salão          Barbearia MSB (slug: barbearia-msb)");
  console.log("  Agenda hoje    9 atendimentos — 3 profissionais");
  console.log("  Estoque        4 produtos abaixo do mínimo (alertas)");
  console.log("  Campanhas      2 ativas (VERAO15 / BEMVINDO10)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

// ─── Funções auxiliares ───────────────────────────────────────────────────────

type AgInput = {
  salonId: string; clienteId: string; colaboradorId: string;
  inicio: Date; fim: Date; status: AgendamentoStatus;
  totalPrice: number; pagamento?: MetodoPagamento;
  pagamentoStatus: PagamentoStatus; canceladoMotivo?: string;
};

/** Upsert de agendamento. atualizarDatas=true → atualiza inicio/fim a cada execução. */
async function ag(id: string, data: AgInput, atualizarDatas: boolean) {
  await prisma.agendamento.upsert({
    where:  { id },
    update: atualizarDatas ? { inicio: data.inicio, fim: data.fim, status: data.status } : {},
    create: {
      id,
      salonId:        data.salonId,
      clienteId:      data.clienteId,
      colaboradorId:  data.colaboradorId,
      inicio:         data.inicio,
      fim:            data.fim,
      status:         data.status,
      totalPrice:     data.totalPrice,
      pagamento:      data.pagamento,
      pagamentoStatus: data.pagamentoStatus,
      canceladoMotivo: data.canceladoMotivo,
    },
  });
}

/** Upsert de serviço no agendamento. */
async function srv(agendamentoId: string, servicoId: string, preco: number, duracao: number) {
  await prisma.agendamentoServico.upsert({
    where:  { agendamentoId_servicoId: { agendamentoId, servicoId } },
    update: {},
    create: { agendamentoId, servicoId, preco, duracao },
  });
}

// ─── Entrypoint ───────────────────────────────────────────────────────────────

main()
  .catch((err) => { console.error("❌  Seed falhou:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
