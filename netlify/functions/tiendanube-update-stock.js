const {
  findTiendanubeProductForItem,
  json,
  parseBody,
  tiendanubeFetch,
  verifySupabaseUser,
} = require("./_tiendanube");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Metodo no permitido." });
  }

  try {
    await verifySupabaseUser(event);
    const body = await parseBody(event);
    const items = Array.isArray(body.items) ? body.items : [];
    const updated = [];
    const skipped = [];

    for (const item of items) {
      const target = await findTiendanubeProductForItem(item);
      if (!target?.productId) {
        skipped.push({ name: item.name, reason: "No se encontro el producto en Tiendanube." });
        continue;
      }

      await tiendanubeFetch(`/products/${target.productId}/variants/stock`, {
        method: "POST",
        body: JSON.stringify({
          action: "variation",
          value: -Math.abs(Number(item.qty) || 0),
          ...(target.variantId ? { id: Number(target.variantId) } : {}),
        }),
      });

      updated.push({ name: item.name, productId: target.productId, variantId: target.variantId });
    }

    return json(200, { updated, skipped });
  } catch (error) {
    console.error(error);
    return json(500, { error: error.message });
  }
};
