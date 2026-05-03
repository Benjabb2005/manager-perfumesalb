const {
  json,
  mapTiendanubeProduct,
  normalizeText,
  parseBody,
  readOwnerState,
  tiendanubeFetch,
  verifyTiendanubeWebhook,
  writeOwnerState,
} = require("./_tiendanube");
const crypto = require("node:crypto");

function ensureStateShape(state) {
  return {
    perfumes: Array.isArray(state.perfumes) ? state.perfumes : [],
    sales: Array.isArray(state.sales) ? state.sales : [],
    expenses: Array.isArray(state.expenses) ? state.expenses : [],
    subscriptions: Array.isArray(state.subscriptions) ? state.subscriptions : [],
    withdrawals: Array.isArray(state.withdrawals) ? state.withdrawals : [],
    dollarPurchases: Array.isArray(state.dollarPurchases) ? state.dollarPurchases : [],
    dollarSpends: Array.isArray(state.dollarSpends) ? state.dollarSpends : [],
    history: state.history || {},
    priceFormula: state.priceFormula || {},
  };
}

function findPerfumeIndex(state, product) {
  const productId = String(product.tiendanubeProductId || "");
  const variantId = String(product.tiendanubeVariantId || "");
  const sku = normalizeText(product.tiendanubeSku);
  const name = normalizeText(product.name);

  return state.perfumes.findIndex((perfume) => {
    const sameVariant = variantId && String(perfume.tiendanubeVariantId || "") === variantId;
    const sameProduct = productId && String(perfume.tiendanubeProductId || "") === productId;
    const sameSku = sku && normalizeText(perfume.tiendanubeSku) === sku;
    const sameName = name && normalizeText(perfume.name) === name;
    return sameVariant || sameProduct || sameSku || sameName;
  });
}

function upsertTiendanubeProducts(state, products) {
  products.forEach((product) => {
    const index = findPerfumeIndex(state, product);
    const next = {
      id: index >= 0 ? state.perfumes[index].id : crypto.randomUUID(),
      name: product.name || "Sin nombre",
      brand: product.brand || "",
      ml: Number(product.ml) || 0,
      cost: index >= 0 ? state.perfumes[index].cost || 0 : 0,
      price: Number(product.price) || 0,
      stock: Number(product.stock) || 0,
      tiendanubeProductId: product.tiendanubeProductId || "",
      tiendanubeVariantId: product.tiendanubeVariantId || "",
      tiendanubeSku: product.tiendanubeSku || "",
      tiendanubeSyncedAt: new Date().toISOString(),
      createdAt: index >= 0 ? state.perfumes[index].createdAt : new Date().toISOString(),
    };

    if (index >= 0) {
      state.perfumes[index] = { ...state.perfumes[index], ...next };
    } else {
      state.perfumes.push(next);
    }
  });
}

async function handleProductEvent(productId) {
  const state = ensureStateShape(await readOwnerState());
  const product = await tiendanubeFetch(`/products/${productId}`);
  upsertTiendanubeProducts(state, mapTiendanubeProduct(product));
  await writeOwnerState(state);
}

async function handleOrderEvent(orderId) {
  const state = ensureStateShape(await readOwnerState());

  if (state.sales.some((sale) => String(sale.tiendanubeOrderId || "") === String(orderId))) {
    return;
  }

  const order = await tiendanubeFetch(`/orders/${orderId}`);
  const products = Array.isArray(order.products) ? order.products : [];
  const items = products.map((product) => {
    const productName = product.name || product.product_name || product.title || "Producto Tiendanube";
    const qty = Number(product.quantity || product.qty) || 1;
    const unitNet = Number(product.price || product.unit_price || product.total / qty) || 0;

    return {
      id: crypto.randomUUID(),
      perfumeId: "",
      name: productName,
      qty,
      basePrice: unitNet,
      paymentMethod: order.gateway || "Tiendanube",
      unitNet,
      tiendanubeProductId: String(product.product_id || product.id || ""),
      tiendanubeVariantId: String(product.variant_id || ""),
      tiendanubeSku: String(product.sku || ""),
    };
  });

  items.forEach((item) => {
    const index = findPerfumeIndex(state, {
      name: item.name,
      tiendanubeProductId: item.tiendanubeProductId,
      tiendanubeVariantId: item.tiendanubeVariantId,
      tiendanubeSku: item.tiendanubeSku,
    });

    if (index >= 0) {
      item.perfumeId = state.perfumes[index].id;
      state.perfumes[index].stock = Math.max(0, Number(state.perfumes[index].stock || 0) - item.qty);
    } else {
      const perfume = {
        id: crypto.randomUUID(),
        name: item.name,
        brand: "",
        ml: 0,
        cost: 0,
        price: item.basePrice,
        stock: 0,
        tiendanubeProductId: item.tiendanubeProductId,
        tiendanubeVariantId: item.tiendanubeVariantId,
        tiendanubeSku: item.tiendanubeSku,
        tiendanubeSyncedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      item.perfumeId = perfume.id;
      state.perfumes.push(perfume);
    }
  });

  state.sales.unshift({
    id: crypto.randomUUID(),
    tiendanubeOrderId: String(orderId),
    customer: order.contact_name || order.customer?.name || "Tiendanube",
    date: String(order.created_at || new Date().toISOString()).slice(0, 10),
    paymentMethod: order.gateway || "Tiendanube",
    channel: "Tiendanube",
    items,
    grossTotal: Number(order.subtotal || order.total) || items.reduce((sum, item) => sum + item.basePrice * item.qty, 0),
    total: Number(order.total) || items.reduce((sum, item) => sum + item.unitNet * item.qty, 0),
    createdAt: new Date().toISOString(),
  });

  await writeOwnerState(state);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Metodo no permitido." });
  }

  try {
    if (!verifyTiendanubeWebhook(event)) {
      return json(401, { error: "Firma de webhook invalida." });
    }

    const body = await parseBody(event);
    const eventName = body.event || "";

    if (eventName === "order/paid") {
      await handleOrderEvent(body.id);
    }

    if (eventName === "product/created" || eventName === "product/updated") {
      await handleProductEvent(body.id);
    }

    return json(200, { ok: true });
  } catch (error) {
    console.error(error);
    return json(500, { error: error.message });
  }
};
