export type PlanoTipo = "BASICO" | "PRATA" | "OURO";

export interface PlanoConfig {
  tipo: PlanoTipo;
  nome: string;
  preco: number;
  maxFuncionarios: number;
  maxSaloesRede: number;
  maxClientesPorFuncionario: number | null; // null = unlimited
  routes: string[]; // allowed sidebar routes
  cor: string;      // hex color for badge
}

export const PLANOS: Record<PlanoTipo, PlanoConfig> = {
  BASICO: {
    tipo: "BASICO",
    nome: "Básico",
    preco: 60,
    maxFuncionarios: 1,
    maxSaloesRede: 1,
    maxClientesPorFuncionario: null,
    routes: ["/dashboard", "/agenda", "/clientes", "/servicos", "/equipe", "/estoque", "/pdv", "/configuracoes", "/contrato", "/notificacoes"],
    cor: "#6366f1",
  },
  PRATA: {
    tipo: "PRATA",
    nome: "Prata",
    preco: 90,
    maxFuncionarios: 5,
    maxSaloesRede: 2,
    maxClientesPorFuncionario: null,
    routes: ["/dashboard", "/agenda", "/clientes", "/servicos", "/equipe", "/estoque", "/pdv", "/financeiro", "/configuracoes", "/contrato", "/notificacoes"],
    cor: "#64748b",
  },
  OURO: {
    tipo: "OURO",
    nome: "Ouro",
    preco: 250,
    maxFuncionarios: 10,
    maxSaloesRede: 5,
    maxClientesPorFuncionario: 100,
    routes: ["/dashboard", "/agenda", "/clientes", "/servicos", "/equipe", "/estoque", "/pdv", "/financeiro", "/relatorios", "/marketing", "/transformacoes", "/planos", "/rede", "/configuracoes", "/contrato", "/notificacoes"],
    cor: "#d97706",
  },
};

export function getPlano(plano: string | null | undefined): PlanoConfig {
  return PLANOS[(plano as PlanoTipo) ?? "BASICO"] ?? PLANOS.BASICO;
}
