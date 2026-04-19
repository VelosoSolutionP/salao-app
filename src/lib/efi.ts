import https from "https";
import crypto from "crypto";
import QRCode from "qrcode";

// ─── Config ──────────────────────────────────────────────────────────────────

function isSandbox(): boolean {
  return process.env.EFI_SANDBOX !== "false";
}

/** Mock quando faltar qualquer uma das três variáveis obrigatórias para PIX real */
export function isMockMode(): boolean {
  return (
    !process.env.EFI_CLIENT_ID ||
    !process.env.EFI_PIX_KEY ||
    !process.env.EFI_CERTIFICATE_B64
  );
}

function getBaseUrl(): string {
  return isSandbox()
    ? "https://pix-h.api.efipay.com.br"
    : "https://pix.api.efipay.com.br";
}

function getPixKey(): string {
  return normalizePixKey(process.env.EFI_PIX_KEY ?? "mock-pix-key@efipay.com.br");
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

  // Remove whitespace/newlines that Vercel may add to long env vars
  const clean = certB64.replace(/\s/g, "");
  const pfx = Buffer.from(clean, "base64");
  return new https.Agent({ pfx, passphrase: "", rejectUnauthorized: true, keepAlive: false });
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

// ─── QR Code generator ───────────────────────────────────────────────────────

export async function generateQrImage(brCode: string): Promise<string> {
  return QRCode.toDataURL(brCode, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 300,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

// ─── Mock helpers ────────────────────────────────────────────────────────────

/** Normaliza a chave PIX conforme spec BACEN: CNPJ/CPF só dígitos, resto inalterado */
function normalizePixKey(raw: string): string {
  // CNPJ formatado: XX.XXX.XXX/XXXX-XX → 14 dígitos
  if (/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(raw)) return raw.replace(/\D/g, "");
  // CPF formatado: XXX.XXX.XXX-XX → 11 dígitos
  if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(raw)) return raw.replace(/\D/g, "");
  return raw;
}

export function buildFallbackBrCode(txid: string, valor: string, overrideKey?: string): string {
  const amount   = parseFloat(valor).toFixed(2);
  const rawKey   = overrideKey ?? process.env.EFI_PIX_KEY ?? "contato@bellefy.com.br";
  const pixKey   = normalizePixKey(rawKey);
  const keyLen   = String(pixKey.length).padStart(2, "0");
  const keyField = `01${keyLen}${pixKey}`;
  const guiField = `0014BR.GOV.BCB.PIX`;
  const maInfo   = guiField + keyField;
  const maLen    = String(maInfo.length).padStart(2, "0");
  const amtLen   = String(amount.length).padStart(2, "0");
  const txidSafe = txid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 25).padEnd(25, "0");
  const addData  = `0525${txidSafe}`;
  const addLen   = String(addData.length).padStart(2, "0");
  const base =
    `000201` +
    `26${maLen}${maInfo}` +
    `52040000` +
    `5303986` +
    `54${amtLen}${amount}` +
    `5802BR` +
    `5913Bellefy PDV  ` +
    `6009SAO PAULO` +
    `62${addLen}${addData}` +
    `6304`;
  return base + crc16(base);
}

async function mockQrCodeImage(brCode: string): Promise<string> {
  return generateQrImage(brCode);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeQrImage(raw: string): string {
  if (!raw) return "";
  if (raw.startsWith("data:")) return raw;
  return `data:image/png;base64,${raw}`;
}

/** CRC16-CCITT conforme padrão EMV QR Code (BCB Pix) */
function crc16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) : crc << 1;
    }
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// ─── PIX Imediato ─────────────────────────────────────────────────────────────

export async function efiCreatePix(params: {
  txid: string;
  valor: string;
  descricao: string;
  pixKey?: string;
}): Promise<EfiPixResult> {
  if (isMockMode()) {
    console.warn("[Efi] Mock mode — EFI_CLIENT_ID não configurado. Retornando dados fictícios.");
    const brCode = buildFallbackBrCode(params.txid, params.valor);
    return {
      txid: params.txid,
      brCode,
      qrCodeImage: await mockQrCodeImage(brCode),
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
      qrCodeImage = normalizeQrImage(qr.imagemQrcode);
    } catch (err) {
      console.error("[Efi] Erro ao buscar QR Code:", err);
    }
  }

  if (!qrCodeImage && brCode) {
    qrCodeImage = await generateQrImage(brCode);
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
    const brCode = buildFallbackBrCode(params.txid, params.valor);
    return {
      txid: params.txid,
      brCode,
      qrCodeImage: await mockQrCodeImage(brCode),
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
      qrCodeImage = normalizeQrImage(qr.imagemQrcode);
    } catch (err) {
      console.error("[Efi] Erro ao buscar QR Code contrato:", err);
    }
  }

  if (!qrCodeImage && brCode) {
    qrCodeImage = await generateQrImage(brCode);
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

  let data: EfiStatusResponse;
  try {
    data = await makeEfiRequest<EfiStatusResponse>("GET", `/v2/cob/${txid}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("cobranca_nao_encontrada") || msg.includes("404")) {
      return { status: "ATIVA" };
    }
    throw err;
  }

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
