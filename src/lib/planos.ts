export type PlanoTipo = "BASICO" | "PRATA" | "OURO" | "PLATINA";

export interface PlanoConfig {
  tipo: PlanoTipo;
  nome: string;
  preco: number | null; // null = customizado
  maxFuncionarios: number | null; // null = ilimitado
  maxClientes: number | null;     // null = ilimitado
  maxSaloesRede: number | null;
  routes: string[]; // allowed sidebar routes
  cor: string;      // hex color for badge
}

// BASICO: só agendamento e cadastro
const BASE_ROUTES = [
  "/dashboard", "/agenda", "/clientes", "/servicos", "/equipe",
  "/configuracoes", "/contrato", "/notificacoes",
];

const PRATA_ROUTES   = [...BASE_ROUTES, "/estoque", "/pdv", "/planos"];
const OURO_ROUTES    = [...PRATA_ROUTES, "/financeiro", "/transformacoes"];
const PLATINA_ROUTES = [...OURO_ROUTES, "/relatorios", "/marketing", "/rede"];

export const PLANOS: Record<PlanoTipo, PlanoConfig> = {
  BASICO: {
    tipo: "BASICO",
    nome: "Básico",
    preco: 60,
    maxFuncionarios: 5,
    maxClientes: 100,
    maxSaloesRede: 1,
    routes: BASE_ROUTES,
    cor: "#6366f1",
  },
  PRATA: {
    tipo: "PRATA",
    nome: "Prata",
    preco: 150,
    maxFuncionarios: 5,
    maxClientes: 100,
    maxSaloesRede: 2,
    routes: PRATA_ROUTES,
    cor: "#64748b",
  },
  OURO: {
    tipo: "OURO",
    nome: "Gold",
    preco: 250,
    maxFuncionarios: 10,
    maxClientes: 200,
    maxSaloesRede: 5,
    routes: OURO_ROUTES,
    cor: "#d97706",
  },
  PLATINA: {
    tipo: "PLATINA",
    nome: "Platina",
    preco: null,
    maxFuncionarios: null,
    maxClientes: null,
    maxSaloesRede: null,
    routes: PLATINA_ROUTES,
    cor: "#8b5cf6",
  },
};

export function getPlano(plano: string | null | undefined): PlanoConfig {
  return PLANOS[(plano as PlanoTipo) ?? "BASICO"] ?? PLANOS.BASICO;
}

/** Returns true if the salon is still in 30-day free trial */
export function emPeriodoTrial(salonCreatedAt: Date): boolean {
  const dias = (Date.now() - salonCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
  return dias <= 30;
}

/** Returns true if access should be blocked.
 *  Só bloqueia quando há contrato ativo E pagamento >5 dias vencido.
 *  Sem contrato = trial/free tier = nunca bloqueia (mostra banner de upgrade). */
export function deveBloquear(params: {
  contratoAtivo: boolean;
  ultimoVencimento: Date | null;
  pago: boolean;
}): boolean {
  if (!params.contratoAtivo) return false; // sem contrato = modo free, não bloqueia
  if (params.pago) return false;
  if (!params.ultimoVencimento) return false;
  const diasAtraso = (Date.now() - params.ultimoVencimento.getTime()) / (1000 * 60 * 60 * 24);
  return diasAtraso > 5;
}
