const {
  fetchAllTiendanubeProducts,
  json,
  mapTiendanubeProduct,
  verifySupabaseUser,
} = require("./_tiendanube");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Metodo no permitido." });
  }

  try {
    await verifySupabaseUser(event);
    const products = await fetchAllTiendanubeProducts();
    return json(200, {
      products: products.flatMap(mapTiendanubeProduct),
    });
  } catch (error) {
    console.error(error);
    return json(500, { error: error.message });
  }
};
