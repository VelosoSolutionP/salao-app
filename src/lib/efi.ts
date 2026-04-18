/**
 * Efi Pro (Efí Bank) — cliente PIX
 * Docs: https://dev.efipay.com.br/docs/api-pix/
 *
 * Suporta modo mock quando EFI_CLIENT_ID não está configurado.
 * mTLS via pfx (PKCS12 base64) quando EFI_CERTIFICATE_B64 está presente.
 */

import https from "https";
import crypto from "crypto";

// ─── Config ──────────────────────────────────────────────────────────────────

function isSandbox(): boolean {
  return process.env.EFI_SANDBOX !== "false";
}

export function isMockMode(): boolean {
  return !process.env.EFI_CLIENT_ID;
}

function getBaseUrl(): string {
  return isSandbox()
    ? "https://pix-h.api.efipay.com.br"
    : "https://pix.api.efipay.com.br";
}

function getPixKey(): string {
  return process.env.EFI_PIX_KEY ?? "mock-pix-key@efipay.com.br";
}

// ─── Token cache (OAuth2) ────────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAt: number; // epoch ms
}

let _tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  if (_tokenCache && Date.now() < _tokenCache.expiresAt - 30_000) {
    return _tokenCache.token;
  }

  const clientId = process.env.EFI_CLIENT_ID!;
  const clientSecret = process.env.EFI_CLIENT_SECRET!;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const body = "grant_type=client_credentials";

  const data = await makeRawRequest<{
    access_token: string;
    expires_in: number;
  }>("POST", "/oauth/token", body, {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: `Basic ${credentials}`,
  });

  _tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return _tokenCache.token;
}

// ─── HTTP Client ─────────────────────────────────────────────────────────────

function buildAgent(): https.Agent | undefined {
  const certB64 = process.env.EFI_CERTIFICATE_B64;
  if (!certB64) return undefined;

  const pfx = Buffer.from(certB64, "base64");
  return new https.Agent({ pfx, passphrase: "" });
}

function makeRawRequest<T>(
  method: string,
  path: string,
  body: string | undefined,
  headers: Record<string, string>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const base = getBaseUrl();
    const url = new URL(base + path);

    const agent = buildAgent();
    const options: https.RequestOptions = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        "Content-Length": body ? Buffer.byteLength(body) : 0,
        ...headers,
      },
      ...(agent ? { agent } : {}),
    };

    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk: Buffer) => (raw += chunk.toString()));
      res.on("end", () => {
        if (!res.statusCode || res.statusCode >= 400) {
          reject(new Error(`Efi HTTP ${res.statusCode}: ${raw}`));
          return;
        }
        try {
          resolve(JSON.parse(raw) as T);
        } catch {
          reject(new Error(`Efi JSON parse error: ${raw}`));
        }
      });
    });

    req.on("error", reject);

    if (body) req.write(body);
    req.end();
  });
}

async function makeEfiRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const token = await getAccessToken();
  const bodyStr = body ? JSON.stringify(body) : undefined;

  return makeRawRequest<T>(method, path, bodyStr, {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EfiPixResult {
  txid: string;
  brCode: string;
  qrCodeImage: string;
  location?: string;
  status: string;
  mockMode: boolean;
}

interface EfiCobResponse {
  txid: string;
  loc?: { id: number };
  status: string;
  location?: string;
}

interface EfiQrCodeResponse {
  imagemQrcode: string;
  qrcode: string;
}

interface EfiStatusResponse {
  txid: string;
  status: string;
  valor?: { original: string };
  pix?: Array<{ infoPagador?: { nome?: string; cpf?: string } }>;
}

// ─── Mock helpers ────────────────────────────────────────────────────────────

function mockBrCode(txid: string, valor: string): string {
  // Realistically structured mock Pix brCode (EMV-like, not valid for payment)
  return `00020126580014BR.GOV.BCB.PIX0136mock-pix-key@efipay.com.br52040000530398654${String(valor).padStart(2, "0")}${valor}5802BR5925Salao Mock6009SAO PAULO62290525${txid.slice(0, 25)}6304ABCD`;
}

function mockQrCodeImage(txid: string): string {
  // Data-URI placeholder (1x1 transparent PNG + txid hint)
  return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
}

// ─── PIX Imediato ─────────────────────────────────────────────────────────────

export async function efiCreatePix(params: {
  txid: string;
  valor: string; // e.g. "59.90"
  descricao: string;
}): Promise<EfiPixResult> {
  if (isMockMode()) {
    console.warn("[Efi] Mock mode — EFI_CLIENT_ID não configurado. Retornando dados fictícios.");
    return {
      txid: params.txid,
      brCode: mockBrCode(params.txid, params.valor),
      qrCodeImage: mockQrCodeImage(params.txid),
      status: "ATIVA",
      mockMode: true,
    };
  }

  const cob = await makeEfiRequest<EfiCobResponse>("PUT", `/v2/cob/${params.txid}`, {
    calendario: { expiracao: 3600 },
    valor: { original: params.valor },
    chave: getPixKey(),
    solicitacaoPagador: params.descricao,
  });

  let brCode = "";
  let qrCodeImage = "";

  if (cob.loc?.id) {
    try {
      const qr = await makeEfiRequest<EfiQrCodeResponse>(
        "GET",
        `/v2/loc/${cob.loc.id}/qrcode`
      );
      brCode = qr.qrcode;
      qrCodeImage = qr.imagemQrcode;
    } catch (err) {
      console.error("[Efi] Erro ao buscar QR Code:", err);
    }
  }

  return {
    txid: cob.txid,
    brCode,
    qrCodeImage,
    location: cob.location,
    status: cob.status,
    mockMode: false,
  };
}

// ─── PIX com Vencimento (contrato/mensalidade) ────────────────────────────────

export async function efiCreatePixContrato(params: {
  txid: string;
  valor: string; // e.g. "90.00"
  vencimento: string; // ISO date "YYYY-MM-DD"
  salonName: string;
  referencia: string; // e.g. "2025-04"
}): Promise<EfiPixResult> {
  if (isMockMode()) {
    console.warn("[Efi] Mock mode — EFI_CLIENT_ID não configurado. Retornando dados fictícios.");
    return {
      txid: params.txid,
      brCode: mockBrCode(params.txid, params.valor),
      qrCodeImage: mockQrCodeImage(params.txid),
      status: "ATIVA",
      mockMode: true,
    };
  }

  const cob = await makeEfiRequest<EfiCobResponse>("PUT", `/v2/cobv/${params.txid}`, {
    calendario: {
      dataDeVencimento: params.vencimento,
      validadeAposVencimento: 5,
    },
    valor: { original: params.valor },
    chave: getPixKey(),
    solicitacaoPagador: `Mensalidade ${params.salonName} — ${params.referencia}`,
  });

  let brCode = "";
  let qrCodeImage = "";

  if (cob.loc?.id) {
    try {
      const qr = await makeEfiRequest<EfiQrCodeResponse>(
        "GET",
        `/v2/loc/${cob.loc.id}/qrcode`
      );
      brCode = qr.qrcode;
      qrCodeImage = qr.imagemQrcode;
    } catch (err) {
      console.error("[Efi] Erro ao buscar QR Code:", err);
    }
  }

  return {
    txid: cob.txid,
    brCode,
    qrCodeImage,
    location: cob.location,
    status: cob.status,
    mockMode: false,
  };
}

// ─── Status do PIX ───────────────────────────────────────────────────────────

export async function efiGetPixStatus(txid: string): Promise<{
  status: string;
  valor?: string;
  pagador?: { nome?: string; cpf?: string };
}> {
  if (isMockMode()) {
    return { status: "ATIVA" };
  }

  const data = await makeEfiRequest<EfiStatusResponse>("GET", `/v2/cob/${txid}`);

  const pagador = data.pix?.[0]?.infoPagador;

  return {
    status: data.status,
    valor: data.valor?.original,
    pagador: pagador
      ? { nome: pagador.nome, cpf: pagador.cpf }
      : undefined,
  };
}

// ─── Registrar Webhook ───────────────────────────────────────────────────────

export async function efiRegisterWebhook(webhookUrl: string): Promise<void> {
  if (isMockMode()) {
    console.warn("[Efi] Mock mode — webhook não registrado.");
    return;
  }

  const pixKey = getPixKey();
  await makeEfiRequest("PUT", `/v2/webhook/${encodeURIComponent(pixKey)}`, {
    webhookUrl,
  });
}

// ─── txid helper ─────────────────────────────────────────────────────────────

/**
 * Gera um txid válido para Efi: 26-35 chars, apenas [a-zA-Z0-9].
 * Usa 8 chars de prefixo + 24 chars hex do cuid truncado.
 */
export function generateEfiTxid(prefix: string): string {
  const rand = crypto.randomBytes(16).toString("hex"); // 32 chars
  const safe = (prefix.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) + rand).slice(0, 35);
  return safe;
}
