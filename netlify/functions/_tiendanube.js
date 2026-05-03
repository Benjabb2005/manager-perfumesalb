const crypto = require("node:crypto");

const DEFAULT_USER_AGENT = "Perfumeria Manager (contacto@perfumeria.local)";

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(payload),
  };
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta configurar ${name} en Netlify.`);
  }
  return value;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getLocalized(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.es || value.pt || value.en || Object.values(value)[0] || "";
}

function getVariantLabel(variant) {
  const values = Array.isArray(variant?.values) ? variant.values : [];
  return values.map(getLocalized).filter(Boolean).join(" / ");
}

function getVariantStock(variant) {
  if (Number.isFinite(Number(variant?.stock))) return Number(variant.stock);
  const levels = Array.isArray(variant?.inventory_levels) ? variant.inventory_levels : [];
  const total = levels.reduce((sum, level) => sum + (Number(level.stock) || 0), 0);
  return Number.isFinite(total) ? total : 0;
}

function getMlFromName(name) {
  const match = String(name || "").match(/(\d{2,4})\s*ml/i);
  return match ? Number(match[1]) : 0;
}

function mapTiendanubeProduct(product) {
  const productName = getLocalized(product.name);
  const variants = Array.isArray(product.variants) && product.variants.length
    ? product.variants
    : [{ id: "", price: product.price, stock: product.stock, sku: product.sku }];

  return variants.map((variant) => {
    const variantLabel = getVariantLabel(variant);
    const name = variantLabel ? `${productName} - ${variantLabel}` : productName;

    return {
      name,
      brand: getLocalized(product.brand) || "",
      ml: getMlFromName(name),
      price: Number(variant.price || product.price) || 0,
      stock: getVariantStock(variant),
      tiendanubeProductId: String(product.id || ""),
      tiendanubeVariantId: String(variant.id || ""),
      tiendanubeSku: String(variant.sku || product.sku || ""),
    };
  });
}

async function parseBody(event) {
  if (!event.body) return {};
  return JSON.parse(event.body);
}

async function verifySupabaseUser(event) {
  const supabaseUrl = requireEnv("SUPABASE_URL").replace(/\/$/, "");
  const supabaseAnonKey = requireEnv("SUPABASE_ANON_KEY");
  const authorization = event.headers.authorization || event.headers.Authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    throw new Error("Inicia sesion para usar la integracion.");
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: authorization,
    },
  });

  if (!response.ok) {
    throw new Error("Sesion invalida o vencida.");
  }

  return response.json();
}

function verifyTiendanubeWebhook(event) {
  const appSecret = process.env.TIENDANUBE_APP_SECRET;
  if (!appSecret) return true;

  const received = event.headers["x-linkedstore-hmac-sha256"] || event.headers["X-Linkedstore-Hmac-Sha256"];
  if (!received) return false;

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(event.body || "")
    .digest("hex");

  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

async function tiendanubeFetch(path, options = {}) {
  const storeId = requireEnv("TIENDANUBE_STORE_ID");
  const token = requireEnv("TIENDANUBE_ACCESS_TOKEN");
  const userAgent = process.env.TIENDANUBE_USER_AGENT || DEFAULT_USER_AGENT;
  const response = await fetch(`https://api.tiendanube.com/v1/${storeId}${path}`, {
    ...options,
    headers: {
      Authentication: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": userAgent,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tiendanube respondio ${response.status}: ${errorText}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function fetchAllTiendanubeProducts() {
  const products = [];
  let page = 1;

  while (page <= 20) {
    const batch = await tiendanubeFetch(`/products?page=${page}&per_page=100`);
    if (!Array.isArray(batch) || !batch.length) break;
    products.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }

  return products;
}

async function findTiendanubeProductForItem(item) {
  if (item.tiendanubeProductId) {
    return {
      productId: item.tiendanubeProductId,
      variantId: item.tiendanubeVariantId || "",
    };
  }

  const products = await fetchAllTiendanubeProducts();
  const targetSku = normalizeText(item.tiendanubeSku);
  const targetName = normalizeText(item.name);

  for (const product of products) {
    const mappedVariants = mapTiendanubeProduct(product);
    const match = mappedVariants.find((variant) => {
      const sameSku = targetSku && normalizeText(variant.tiendanubeSku) === targetSku;
      const sameName = targetName && normalizeText(variant.name) === targetName;
      return sameSku || sameName;
    });

    if (match) {
      return {
        productId: match.tiendanubeProductId,
        variantId: match.tiendanubeVariantId,
      };
    }
  }

  return null;
}

async function readOwnerState() {
  const supabaseUrl = requireEnv("SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const ownerId = requireEnv("PERFUMERIA_OWNER_USER_ID");
  const table = process.env.SUPABASE_APP_STATE_TABLE || "app_state";
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?id=eq.${ownerId}&select=data&limit=1`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase respondio ${response.status}`);
  }

  const rows = await response.json();
  return rows?.[0]?.data || {};
}

async function writeOwnerState(state) {
  const supabaseUrl = requireEnv("SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const ownerId = requireEnv("PERFUMERIA_OWNER_USER_ID");
  const table = process.env.SUPABASE_APP_STATE_TABLE || "app_state";
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      id: ownerId,
      user_id: ownerId,
      data: state,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Supabase respondio ${response.status}`);
  }
}

module.exports = {
  fetchAllTiendanubeProducts,
  findTiendanubeProductForItem,
  json,
  mapTiendanubeProduct,
  normalizeText,
  parseBody,
  readOwnerState,
  requireEnv,
  tiendanubeFetch,
  verifySupabaseUser,
  verifyTiendanubeWebhook,
  writeOwnerState,
};
