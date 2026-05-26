const STORAGE_KEY = "perfumeria-manager-v2";
const SIDEBAR_STORAGE_KEY = "perfumeria-sidebar-open";
const DATABASE_NAME = "perfumeria-manager-db";
const DATABASE_VERSION = 1;
const STATE_STORE_NAME = "app-state";
const STATE_RECORD_KEY = "current-state";
const DEFAULT_REMOTE_TABLE = "app_state";
const AUTH_STORAGE_KEY = "perfumeria-auth-session";
const TIENDANUBE_FUNCTION_BASE = "/.netlify/functions";

const PAYMENT_METHODS = {
  Transferencia: {
    label: "Transferencia",
    factor: (price) => price * 0.9,
  },
  Efectivo: {
    label: "Efectivo",
    factor: (price) => price * 0.9,
  },
  Tarjeta1: {
    label: "Tarjeta 1 cuota",
    factor: (price) => price - ((price * 0.0559) * 1.21),
  },
  Tarjeta2: {
    label: "Tarjeta 2 cuotas",
    factor: (price) => price - ((price * 0.0559) * 1.21) - ((price * 0.0889) * 1.21),
  },
  Personalizado: {
    label: "Personalizado",
    factor: (price) => price,
  },
  Personalizado2: {
    label: "Personalizado en 2 cuotas",
    factor: (price) => price,
  },
  Promo: {
    label: "Promocion",
    factor: (price) => getPromoPrice(price),
  },
  Descuento20: {
    label: "20% descuento",
    factor: (price) => getDiscount20Price(price),
  },
};

const PERFUME_GENDER_OPTIONS = ["Femenino", "Masculino", "Unisex", "Sin clasificar"];
const PERFUME_PROFILE_OPTIONS = [
  "Dulce",
  "Floral",
  "Frutal",
  "Citrico",
  "Fresco",
  "Amaderado",
  "Especiado",
  "Oriental",
  "Cuero",
  "Sin clasificar",
];

const state = {
  perfumes: [],
  sales: [],
  expenses: [],
  subscriptions: [],
  bankIncomes: [],
  withdrawals: [],
  dollarPurchases: [],
  dollarSpends: [],
  draftSaleItems: [],
  history: {
    salesAmount: 0,
    soldUnits: 0,
    expensesAmount: 0,
    initialInvestment: 0,
    boughtUnits: 0,
    subscriptionsAmount: 0,
    bankIncomesAmount: 0,
    withdrawalsAmount: 0,
    dollarPurchasePesos: 0,
    dollarBoughtUnits: 0,
    dollarSpentUnits: 0,
  },
};

let databasePromise;
let saveQueue = Promise.resolve();
let remoteDatabaseWarningShown = false;
let authSession = null;

const refs = {};
const priceFormulaState = {
  baseExtra: 5000,
  markupMultiplier: 1.5,
  markdownAmount: 2000,
  promoDiscountPercent: 20,
};

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();
  initSidebarState();
  initAuthState();
  await loadState();
  bindEvents();
  seedDefaultDates();
  renderAll();
});

function cacheElements() {
  refs.sidebar = document.getElementById("sidebar");
  refs.authScreen = document.getElementById("authScreen");
  refs.sidebarToggle = document.getElementById("sidebarToggle");
  refs.appShell = document.querySelector(".app-shell");
  refs.mainContent = document.querySelector(".main-content");
  refs.tabs = document.querySelectorAll(".nav-tab");
  refs.panels = document.querySelectorAll(".tab-panel");
  refs.statsGrid = document.getElementById("statsGrid");
  refs.analysisStatsGrid = document.getElementById("analysisStatsGrid");
  refs.bankStatsGrid = document.getElementById("bankStatsGrid");
  refs.topProducts = document.getElementById("topProducts");
  refs.topRevenueProducts = document.getElementById("topRevenueProducts");
  refs.paymentBreakdown = document.getElementById("paymentBreakdown");
  refs.channelBreakdown = document.getElementById("channelBreakdown");
  refs.lowStockList = document.getElementById("lowStockList");
  refs.recentSales = document.getElementById("recentSales");
  refs.pendingOrders = document.getElementById("pendingOrders");
  refs.historyForm = document.getElementById("historyForm");

  refs.perfumeForm = document.getElementById("perfumeForm");
  refs.brandSuggestions = document.getElementById("brandSuggestions");
  refs.fragranticaSearchLink = document.getElementById("fragranticaSearchLink");
  refs.savePerfumeBtn = document.getElementById("savePerfumeBtn");
  refs.cancelPerfumeEditBtn = document.getElementById("cancelPerfumeEditBtn");
  refs.productSearch = document.getElementById("productSearch");
  refs.brandFilter = document.getElementById("brandFilter");
  refs.genderFilter = document.getElementById("genderFilter");
  refs.scentProfileFilter = document.getElementById("scentProfileFilter");
  refs.productSort = document.getElementById("productSort");
  refs.productsTableBody = document.getElementById("productsTableBody");

  refs.saleForm = document.getElementById("saleForm");
  refs.saleProductSelect = document.getElementById("saleProductSelect");
  refs.saleQtyInput = document.getElementById("saleQtyInput");
  refs.saleUnitPriceInput = document.getElementById("saleUnitPriceInput");
  refs.saleInstallmentFields = document.getElementById("saleInstallmentFields");
  refs.saleFirstPaymentInput = document.getElementById("saleFirstPaymentInput");
  refs.saleSecondDueDateInput = document.getElementById("saleSecondDueDateInput");
  refs.addSaleItemBtn = document.getElementById("addSaleItemBtn");
  refs.saleItemsList = document.getElementById("saleItemsList");
  refs.saleSummary = document.getElementById("saleSummary");
  refs.salesTableBody = document.getElementById("salesTableBody");

  refs.orderForm = document.getElementById("orderForm");
  refs.orderSummary = document.getElementById("orderSummary");
  refs.ordersTableBody = document.getElementById("ordersTableBody");
  refs.dollarPurchaseForm = document.getElementById("dollarPurchaseForm");
  refs.dollarSpendForm = document.getElementById("dollarSpendForm");
  refs.subscriptionForm = document.getElementById("subscriptionForm");
  refs.bankIncomeForm = document.getElementById("bankIncomeForm");
  refs.withdrawalForm = document.getElementById("withdrawalForm");
  refs.dollarTableBody = document.getElementById("dollarTableBody");
  refs.bankMovementsTableBody = document.getElementById("bankMovementsTableBody");

  refs.exportBtn = document.getElementById("exportBtn");
  refs.exportExcelBtn = document.getElementById("exportExcelBtn");
  refs.importInput = document.getElementById("importInput");
  refs.loadDemoDataBtn = document.getElementById("loadDemoDataBtn");
  refs.syncTiendanubeBtn = document.getElementById("syncTiendanubeBtn");
  refs.clearAllDataBtn = document.getElementById("clearAllDataBtn");
  refs.priceFormulaForm = document.getElementById("priceFormulaForm");
  refs.priceCalculatorTableBody = document.getElementById("priceCalculatorTableBody");
  refs.authStatus = document.getElementById("authStatus");
  refs.currentUserBadge = document.getElementById("currentUserBadge");
  refs.authLoginForm = document.getElementById("authLoginForm");
  refs.authRegisterForm = document.getElementById("authRegisterForm");
  refs.authLogoutBtn = document.getElementById("authLogoutBtn");
  refs.toastRegion = document.getElementById("toastRegion");
  refs.confirmOverlay = document.getElementById("confirmOverlay");
  refs.confirmMessage = document.getElementById("confirmMessage");
  refs.confirmCancelBtn = document.getElementById("confirmCancelBtn");
  refs.confirmAcceptBtn = document.getElementById("confirmAcceptBtn");
}

function bindEvents() {
  refs.sidebarToggle.addEventListener("click", toggleSidebar);
  refs.mainContent.addEventListener("click", closeSidebarOnSmallScreens);
  document.addEventListener("keydown", closeSidebarWithEscape);
  window.addEventListener("resize", handleResponsiveSidebar);

  refs.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      switchTab(tab.dataset.tabTarget);
      closeSidebarOnSmallScreens();
    });
  });

  refs.perfumeForm.addEventListener("submit", handlePerfumeSubmit);
  refs.perfumeForm.name.addEventListener("input", syncFragranticaSearchLink);
  refs.perfumeForm.brand.addEventListener("input", syncFragranticaSearchLink);
  refs.cancelPerfumeEditBtn.addEventListener("click", resetPerfumeForm);
  refs.historyForm.addEventListener("submit", handleHistorySubmit);
  refs.productSearch.addEventListener("input", renderProductsTable);
  refs.brandFilter.addEventListener("change", renderProductsTable);
  refs.genderFilter.addEventListener("change", renderProductsTable);
  refs.scentProfileFilter.addEventListener("change", renderProductsTable);
  refs.productSort.addEventListener("change", renderProductsTable);

  refs.saleProductSelect.addEventListener("change", syncSaleUnitPrice);
  refs.saleForm.paymentMethod.addEventListener("change", () => {
    syncSaleUnitPrice();
    syncSalePaymentFields(true);
    renderSaleDraft();
  });
  refs.saleForm.date.addEventListener("change", () => syncSalePaymentFields(true));
  refs.saleFirstPaymentInput.addEventListener("input", renderSaleDraft);
  refs.saleSecondDueDateInput.addEventListener("input", renderSaleDraft);
  refs.addSaleItemBtn.addEventListener("click", addSaleDraftItem);
  refs.saleForm.addEventListener("submit", handleSaleSubmit);

  refs.orderForm.addEventListener("submit", handleExpenseSubmit);
  refs.dollarPurchaseForm.addEventListener("submit", handleDollarPurchaseSubmit);
  refs.dollarPurchaseForm.pesosAmount.addEventListener("input", syncDollarPurchaseAmount);
  refs.dollarPurchaseForm.dollarPrice.addEventListener("input", syncDollarPurchaseAmount);
  refs.dollarSpendForm.addEventListener("submit", handleDollarSpendSubmit);
  refs.subscriptionForm.addEventListener("submit", handleSubscriptionSubmit);
  refs.bankIncomeForm.addEventListener("submit", handleBankIncomeSubmit);
  refs.withdrawalForm.addEventListener("submit", handleWithdrawalSubmit);

  refs.exportBtn.addEventListener("click", exportData);
  refs.exportExcelBtn.addEventListener("click", exportExcelWorkbook);
  refs.importInput.addEventListener("change", importData);
  refs.loadDemoDataBtn.addEventListener("click", loadDemoData);
  refs.syncTiendanubeBtn.addEventListener("click", syncTiendanubeProducts);
  refs.clearAllDataBtn.addEventListener("click", clearAllData);
  refs.priceFormulaForm.addEventListener("input", handlePriceFormulaInput);
  refs.authLoginForm.addEventListener("submit", handleLoginSubmit);
  refs.authRegisterForm.addEventListener("submit", handleRegisterSubmit);
  refs.authLogoutBtn.addEventListener("click", handleLogout);
  refs.confirmCancelBtn.addEventListener("click", () => closeConfirmDialog(false));
  refs.confirmAcceptBtn.addEventListener("click", () => closeConfirmDialog(true));
  refs.confirmOverlay.addEventListener("click", (event) => {
    if (event.target === refs.confirmOverlay) closeConfirmDialog(false);
  });
}

let confirmResolver = null;

function showNotification(message, type = "success", title = "Listo") {
  if (!refs.toastRegion) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(message)}</span>
    </div>
    <button type="button" class="toast-close" aria-label="Cerrar notificacion">×</button>
  `;

  const closeToast = () => {
    if (!toast.isConnected || toast.classList.contains("leaving")) return;
    toast.classList.add("leaving");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  };

  toast.querySelector(".toast-close").addEventListener("click", closeToast);
  refs.toastRegion.appendChild(toast);
  window.setTimeout(closeToast, type === "error" ? 5200 : 3400);
}

function showError(message) {
  showNotification(message, "error", "Atencion");
}

function confirmAction(message) {
  if (!refs.confirmOverlay) return Promise.resolve(false);
  refs.confirmMessage.textContent = message;
  refs.confirmOverlay.hidden = false;
  refs.confirmAcceptBtn.focus();

  return new Promise((resolve) => {
    confirmResolver = resolve;
  });
}

function closeConfirmDialog(result) {
  if (!confirmResolver) return;
  refs.confirmOverlay.hidden = true;
  confirmResolver(result);
  confirmResolver = null;
}

function initSidebarState() {
  const shouldOpen = window.innerWidth > 900;
  setSidebarOpen(shouldOpen, false);
}

function toggleSidebar() {
  setSidebarOpen(!document.body.classList.contains("sidebar-open"));
}

function setSidebarOpen(isOpen, shouldSave = true) {
  document.body.classList.toggle("sidebar-open", isOpen);
  document.body.classList.toggle("sidebar-collapsed", !isOpen);
  refs.sidebarToggle.setAttribute("aria-expanded", String(isOpen));
  refs.sidebarToggle.setAttribute("aria-label", isOpen ? "Cerrar menu" : "Abrir menu");

  if (shouldSave) {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isOpen));
  }
}

function closeSidebarOnSmallScreens() {
  if (window.innerWidth <= 900 && document.body.classList.contains("sidebar-open")) {
    setSidebarOpen(false);
  }
}

function closeSidebarWithEscape(event) {
  if (event.key === "Escape" && document.body.classList.contains("sidebar-open")) {
    setSidebarOpen(false);
  }
}

function handleResponsiveSidebar() {
  if (window.innerWidth <= 900 && document.body.classList.contains("sidebar-open")) {
    setSidebarOpen(false, false);
    return;
  }

  if (window.innerWidth > 900 && !document.body.classList.contains("sidebar-open")) {
    setSidebarOpen(true, false);
  }
}

function initAuthState() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    authSession = raw ? JSON.parse(raw) : null;
  } catch (error) {
    authSession = null;
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

function setAuthSession(session) {
  authSession = session;
  if (session) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

function getCurrentUser() {
  return authSession?.user || null;
}

function getAccessToken() {
  return authSession?.access_token || "";
}

function seedDefaultDates() {
  const today = new Date().toISOString().slice(0, 10);
  if (!refs.saleForm.date.value) refs.saleForm.date.value = today;
  if (!refs.orderForm.date.value) refs.orderForm.date.value = today;
  if (!refs.dollarPurchaseForm.date.value) refs.dollarPurchaseForm.date.value = today;
  if (!refs.dollarSpendForm.date.value) refs.dollarSpendForm.date.value = today;
  if (!refs.subscriptionForm.date.value) refs.subscriptionForm.date.value = today;
  if (!refs.bankIncomeForm.date.value) refs.bankIncomeForm.date.value = today;
  if (!refs.withdrawalForm.date.value) refs.withdrawalForm.date.value = today;
  syncSalePaymentFields();
}

function switchTab(targetId) {
  refs.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tabTarget === targetId));
  refs.panels.forEach((panel) => panel.classList.toggle("active", panel.id === targetId));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadState() {
  try {
    const config = getRemoteDatabaseConfig();
    if (config.enabled && !isRemoteAuthReady()) {
      hydrateState({});
      return;
    }

    if (config.enabled && isRemoteAuthReady()) {
      const remoteSaved = await readRemoteDatabaseState();
      hydrateState(remoteSaved || {});
      await writeLocalDatabaseState(getStateSnapshot());
      if (!remoteSaved) {
        await syncRemoteDatabaseState(getStateSnapshot());
      }
      return;
    }

    const saved = await readLocalDatabaseState();
    if (saved) {
      hydrateState(saved);
      await syncRemoteDatabaseState(getStateSnapshot());
      return;
    }

    await migrateLocalStorageState();
  } catch (error) {
    console.error("No se pudieron cargar los datos desde la base de datos.", error);
    showError("No se pudo abrir la base de datos local. Revisa los permisos del navegador.");
  }
}

function saveState() {
  const snapshot = getStateSnapshot();
  saveQueue = saveQueue
    .catch(() => {})
    .then(() => writeDatabaseState(snapshot))
    .catch((error) => {
      console.error("No se pudieron guardar los datos en la base de datos.", error);
      showError("No se pudieron guardar los cambios en la base de datos local.");
    });
}

async function readDatabaseState() {
  const remoteSaved = await readRemoteDatabaseState();
  return remoteSaved || readLocalDatabaseState();
}

async function writeDatabaseState(snapshot) {
  await writeLocalDatabaseState(snapshot);
  await syncRemoteDatabaseState(snapshot);
}

function openDatabase() {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB no esta disponible en este navegador."));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STATE_STORE_NAME)) {
        database.createObjectStore(STATE_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return databasePromise;
}

async function readLocalDatabaseState() {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STATE_STORE_NAME, "readonly");
    const store = transaction.objectStore(STATE_STORE_NAME);
    const request = store.get(getLocalStateRecordKey());

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function writeLocalDatabaseState(snapshot) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STATE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(STATE_STORE_NAME);
    store.put({ ...snapshot, updatedAt: new Date().toISOString() }, getLocalStateRecordKey());

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function getLocalStateRecordKey() {
  const config = getRemoteDatabaseConfig();
  const userId = getCurrentUser()?.id;
  return config.enabled && userId ? `user:${userId}` : STATE_RECORD_KEY;
}

function getRemoteDatabaseConfig() {
  const config = window.PERFUMERIA_DATABASE || {};
  const apiBaseUrl = String(config.apiBaseUrl || "").replace(/\/$/, "");
  return {
    enabled: Boolean(config.enabled && (apiBaseUrl || (config.supabaseUrl && config.anonKey))),
    apiBaseUrl,
    supabaseUrl: String(config.supabaseUrl || "").replace(/\/$/, ""),
    anonKey: String(config.anonKey || ""),
    tableName: config.tableName || DEFAULT_REMOTE_TABLE,
  };
}

function validateRemoteConfig(config) {
  if (!config.enabled) return;
  if (isApiBackendEnabled(config)) return;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl)) {
    throw new Error("La URL de Supabase no parece valida.");
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.anonKey) && !/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(config.anonKey)) {
    throw new Error("La anon/public key de Supabase no parece valida. Copiala de nuevo desde Project Settings > API.");
  }
}

function isApiBackendEnabled(config = getRemoteDatabaseConfig()) {
  return Boolean(config.enabled && config.apiBaseUrl);
}

function isRemoteAuthReady() {
  const config = getRemoteDatabaseConfig();
  return Boolean(config.enabled && getAccessToken() && getCurrentUser()?.id);
}

function getRemoteTableName(tableName) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(tableName)) {
    throw new Error("El nombre de la tabla remota no es valido.");
  }
  return tableName;
}

function getRemoteHeaders(config, extraHeaders = {}) {
  const accessToken = getAccessToken();
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${accessToken || config.anonKey}`,
    ...extraHeaders,
  };
}

async function readRemoteDatabaseState() {
  const config = getRemoteDatabaseConfig();
  if (!config.enabled || !isRemoteAuthReady()) return null;
  if (isApiBackendEnabled(config)) return readApiDatabaseState(config);

  try {
    const tableName = getRemoteTableName(config.tableName);
    const userId = getCurrentUser().id;
    const response = await fetch(
      `${config.supabaseUrl}/rest/v1/${tableName}?id=eq.${encodeURIComponent(userId)}&select=data&limit=1`,
      { headers: getRemoteHeaders(config) }
    );

    if (!response.ok) {
      throw new Error(`Supabase respondio ${response.status}`);
    }

    const rows = await response.json();
    return rows?.[0]?.data || null;
  } catch (error) {
    warnRemoteDatabase(error);
    return null;
  }
}

async function syncRemoteDatabaseState(snapshot) {
  const config = getRemoteDatabaseConfig();
  if (!config.enabled || !isRemoteAuthReady()) return;
  if (isApiBackendEnabled(config)) {
    await syncApiDatabaseState(config, snapshot);
    return;
  }

  try {
    const tableName = getRemoteTableName(config.tableName);
    const user = getCurrentUser();
    const response = await fetch(`${config.supabaseUrl}/rest/v1/${tableName}?on_conflict=id`, {
      method: "POST",
      headers: getRemoteHeaders(config, {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify({
        id: user.id,
        user_id: user.id,
        data: snapshot,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Supabase respondio ${response.status}`);
    }
  } catch (error) {
    warnRemoteDatabase(error);
  }
}

async function readApiDatabaseState(config) {
  try {
    const response = await fetch(`${config.apiBaseUrl}/state`, {
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(await getApiErrorMessage(response));
    }

    const payload = await response.json();
    return payload.data || null;
  } catch (error) {
    warnRemoteDatabase(error);
    return null;
  }
}

async function syncApiDatabaseState(config, snapshot) {
  try {
    const response = await fetch(`${config.apiBaseUrl}/state`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: snapshot }),
    });

    if (!response.ok) {
      throw new Error(await getApiErrorMessage(response));
    }
  } catch (error) {
    warnRemoteDatabase(error);
  }
}

function warnRemoteDatabase(error) {
  console.error("No se pudo sincronizar con la base de datos publica.", error);
  if (remoteDatabaseWarningShown) return;
  remoteDatabaseWarningShown = true;
  showNotification("La base publica no esta disponible ahora. La app sigue funcionando con la copia local.", "warning", "Conexion interrumpida");
}

async function migrateLocalStorageState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const saved = JSON.parse(raw);
    hydrateState(saved);
    await writeLocalDatabaseState(getStateSnapshot());
    await syncRemoteDatabaseState(getStateSnapshot());
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("No se pudieron migrar los datos anteriores.", error);
  }
}

function hydrateState(saved) {
  const normalized = normalizeState(saved);
  state.perfumes = normalized.perfumes;
  state.sales = normalized.sales;
  state.expenses = normalized.expenses;
  state.subscriptions = normalized.subscriptions;
  state.bankIncomes = normalized.bankIncomes;
  state.withdrawals = normalized.withdrawals;
  state.dollarPurchases = normalized.dollarPurchases;
  state.dollarSpends = normalized.dollarSpends;
  state.history = normalized.history;
  priceFormulaState.baseExtra = normalized.priceFormula.baseExtra;
  priceFormulaState.markupMultiplier = normalized.priceFormula.markupMultiplier;
  priceFormulaState.markdownAmount = normalized.priceFormula.markdownAmount;
  priceFormulaState.promoDiscountPercent = normalized.priceFormula.promoDiscountPercent;
  state.draftSaleItems = [];
}

function normalizeState(saved = {}) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    perfumes: Array.isArray(saved.perfumes)
      ? saved.perfumes.map((item) => ({
          id: item.id || crypto.randomUUID(),
          name: item.name || "Sin nombre",
          brand: item.brand || "",
          ml: Number(item.ml) || 0,
          cost: Number(item.cost) || 0,
          price: Number(item.price) || Number(item.basePrice) || 0,
          stock: Number(item.stock) || 0,
          tiendanubeProductId: item.tiendanubeProductId || "",
          tiendanubeVariantId: item.tiendanubeVariantId || "",
          tiendanubeSku: item.tiendanubeSku || "",
          tiendanubeSyncedAt: item.tiendanubeSyncedAt || "",
          gender: normalizePerfumeGender(item.gender),
          scentProfile: normalizeScentProfile(item.scentProfile),
          scentTags: normalizeScentTags(item.scentTags, item.scentProfile),
          infoSource: item.infoSource || getFragranticaSearchUrl(item),
          infoSourceTitle: item.infoSourceTitle || "Buscar en Fragrantica",
          infoUpdatedAt: item.infoUpdatedAt || "",
          createdAt: item.createdAt || new Date().toISOString(),
        }))
      : [],
    sales: Array.isArray(saved.sales)
      ? saved.sales.map((sale) => normalizeSale(sale, today))
      : [],
    expenses: normalizeExpenses(saved),
    subscriptions: Array.isArray(saved.subscriptions) ? saved.subscriptions : [],
    bankIncomes: Array.isArray(saved.bankIncomes) ? saved.bankIncomes : [],
    withdrawals: Array.isArray(saved.withdrawals) ? saved.withdrawals : [],
    dollarPurchases: Array.isArray(saved.dollarPurchases) ? saved.dollarPurchases : [],
    dollarSpends: Array.isArray(saved.dollarSpends) ? saved.dollarSpends : [],
    history: normalizeHistory(saved.history),
    priceFormula: normalizePriceFormula(saved.priceFormula),
  };
}

function normalizeSale(sale = {}, today) {
  const items = Array.isArray(sale.items)
    ? sale.items.map((item) => ({
        id: item.id || crypto.randomUUID(),
        perfumeId: item.perfumeId || "",
        name: item.name || "Sin nombre",
        qty: Number(item.qty) || 1,
        basePrice: Number(item.basePrice) || Number(item.unitPrice) || 0,
        paymentMethod: item.paymentMethod || sale.paymentMethod || "Transferencia",
        unitNet: Number(item.unitNet) || Number(item.unitPrice) || 0,
        tiendanubeProductId: item.tiendanubeProductId || "",
        tiendanubeVariantId: item.tiendanubeVariantId || "",
        tiendanubeSku: item.tiendanubeSku || "",
      }))
    : [];
  const agreedTotal = Number(sale.agreedTotal) || Number(sale.fullTotal) || Number(sale.total) || 0;
  const payments = normalizeSalePayments(sale, agreedTotal, today);
  const paidTotal = getPaymentsPaidTotal(payments);

  return {
    id: sale.id || crypto.randomUUID(),
    customer: sale.customer || "",
    date: sale.date || today,
    paymentMethod: sale.paymentMethod || "Transferencia",
    channel: sale.channel || "",
    items,
    grossTotal: Number(sale.grossTotal) || agreedTotal,
    agreedTotal,
    total: paidTotal,
    payments,
    createdAt: sale.createdAt || new Date().toISOString(),
  };
}

function normalizeSalePayments(sale, agreedTotal, today) {
  if (Array.isArray(sale.payments) && sale.payments.length) {
    return sale.payments.map((payment, index) => ({
      id: payment.id || crypto.randomUUID(),
      label: payment.label || `Pago ${index + 1}`,
      amount: Number(payment.amount) || 0,
      dueDate: payment.dueDate || sale.date || today,
      paidDate: payment.paidDate || "",
      paid: Boolean(payment.paid || payment.paidDate),
    }));
  }

  return [{
    id: crypto.randomUUID(),
    label: "Pago completo",
    amount: Number(sale.total) || agreedTotal,
    dueDate: sale.date || today,
    paidDate: sale.date || today,
    paid: true,
  }];
}

function normalizeExpenses(saved = {}) {
  if (Array.isArray(saved.expenses)) return saved.expenses;
  if (!Array.isArray(saved.orders)) return [];

  return saved.orders.map((item) => ({
    id: item.id || crypto.randomUUID(),
    supplier: item.supplier || "Importado",
    category: "Encargo",
    date: item.date || new Date().toISOString().slice(0, 10),
    amount: Number(item.total) || 0,
    notes: item.items?.map((entry) => `${entry.name} x${entry.qty}`).join(", ") || "",
    createdAt: item.createdAt || new Date().toISOString(),
  }));
}

function normalizeHistory(history = {}) {
  return {
    salesAmount: Number(history.salesAmount) || 0,
    soldUnits: Number(history.soldUnits) || 0,
    expensesAmount: Number(history.expensesAmount) || 0,
    initialInvestment: Number(history.initialInvestment) || 0,
    boughtUnits: Number(history.boughtUnits) || 0,
    subscriptionsAmount: Number(history.subscriptionsAmount) || 0,
    bankIncomesAmount: Number(history.bankIncomesAmount) || 0,
    withdrawalsAmount: Number(history.withdrawalsAmount) || 0,
    dollarPurchasePesos: Number(history.dollarPurchasePesos) || 0,
    dollarBoughtUnits: Number(history.dollarBoughtUnits) || 0,
    dollarSpentUnits: Number(history.dollarSpentUnits) || 0,
  };
}

function normalizePriceFormula(priceFormula = {}) {
  return {
    baseExtra: numberOrDefault(priceFormula.baseExtra, 5000),
    markupMultiplier: numberOrDefault(priceFormula.markupMultiplier, 1.5),
    markdownAmount: numberOrDefault(priceFormula.markdownAmount, 2000),
    promoDiscountPercent: numberOrDefault(priceFormula.promoDiscountPercent, 20),
  };
}

function numberOrDefault(value, defaultValue) {
  const number = Number(value);
  return Number.isFinite(number) ? number : defaultValue;
}

function getStateSnapshot() {
  return {
    perfumes: state.perfumes,
    sales: state.sales,
    expenses: state.expenses,
    subscriptions: state.subscriptions,
    bankIncomes: state.bankIncomes,
    withdrawals: state.withdrawals,
    dollarPurchases: state.dollarPurchases,
    dollarSpends: state.dollarSpends,
    history: state.history,
    priceFormula: { ...priceFormulaState },
  };
}

function renderAll() {
  renderAuthGate();
  syncBrandSuggestions();
  renderHistoryForm();
  syncBrandFilterOptions();
  syncPerfumeFilterOptions();
  populateProductSelects();
  renderProductsTable();
  renderSalesTable();
  renderExpensesTable();
  renderDollarTable();
  renderBankMovementsTable();
  renderSummaryDashboard();
  renderAnalysis();
  renderPriceCalculator();
  renderSaleDraft();
  renderExpenseDraft();
  syncDollarPurchaseAmount();
}

function renderHistoryForm() {
  refs.historyForm.historicalSalesAmount.value = state.history.salesAmount || 0;
  refs.historyForm.historicalSoldUnits.value = state.history.soldUnits || 0;
  refs.historyForm.historicalExpensesAmount.value = state.history.expensesAmount || 0;
  refs.historyForm.historicalInitialInvestment.value = state.history.initialInvestment || 0;
  refs.historyForm.historicalBoughtUnits.value = state.history.boughtUnits || 0;
  refs.historyForm.historicalSubscriptionsAmount.value = state.history.subscriptionsAmount || 0;
  refs.historyForm.historicalWithdrawalsAmount.value = state.history.withdrawalsAmount || 0;
  refs.historyForm.historicalDollarPurchasePesos.value = state.history.dollarPurchasePesos || 0;
  refs.historyForm.historicalDollarBoughtUnits.value = state.history.dollarBoughtUnits || 0;
  refs.historyForm.historicalDollarSpentUnits.value = state.history.dollarSpentUnits || 0;
}

async function handlePerfumeSubmit(event) {
  event.preventDefault();
  const formData = new FormData(refs.perfumeForm);
  const perfumeId = formData.get("perfumeId");
  const isEditingPerfume = Boolean(perfumeId);
  const existingPerfume = perfumeId ? state.perfumes.find((item) => item.id === perfumeId) : null;
  const perfume = {
    id: perfumeId || crypto.randomUUID(),
    name: formData.get("name").trim(),
    brand: formData.get("brand").trim(),
    gender: normalizePerfumeGender(formData.get("gender")),
    scentProfile: normalizeScentProfile(formData.get("scentProfile")),
    ml: Number(formData.get("ml")) || 0,
    cost: Number(formData.get("cost")) || 0,
    price: Number(formData.get("price")) || 0,
    stock: Number(formData.get("stock")) || 0,
    createdAt: existingPerfume?.createdAt || new Date().toISOString(),
  };

  if (!perfume.name) {
    showError("Escribe el nombre del perfume.");
    return;
  }

  let enrichedPerfume = {
    ...existingPerfume,
    ...perfume,
    scentTags: normalizeScentTags([perfume.scentProfile], perfume.scentProfile),
    infoSource: getFragranticaSearchUrl(perfume),
    infoSourceTitle: "Buscar en Fragrantica",
    infoUpdatedAt: new Date().toISOString(),
  };

  if (perfumeId) {
    const index = state.perfumes.findIndex((item) => item.id === perfumeId);
    if (index >= 0) {
      state.perfumes[index] = {
        ...state.perfumes[index],
        ...enrichedPerfume,
      };
    }
  } else {
    state.perfumes.push(enrichedPerfume);
  }

  resetPerfumeForm();
  saveState();
  renderAll();
  showNotification(isEditingPerfume ? "Perfume actualizado correctamente." : "Perfume agregado correctamente.");
}

async function callNetlifyFunction(name, payload = {}) {
  const response = await fetch(`${TIENDANUBE_FUNCTION_BASE}/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || `La funcion ${name} respondio ${response.status}`);
  }

  return data;
}

async function syncTiendanubeProducts() {
  if (!getAccessToken()) {
    showError("Inicia sesion antes de sincronizar Tiendanube.");
    return;
  }

  try {
    refs.syncTiendanubeBtn.disabled = true;
    refs.syncTiendanubeBtn.textContent = "Sincronizando...";
    const result = await callNetlifyFunction("tiendanube-sync-products");
    const products = Array.isArray(result.products) ? result.products : [];
    let created = 0;
    let updated = 0;

    for (const product of products) {
      const existingIndex = findPerfumeIndexByTiendanubeProduct(product);
      const normalized = {
        id: existingIndex >= 0 ? state.perfumes[existingIndex].id : crypto.randomUUID(),
        name: product.name || "Sin nombre",
        brand: product.brand || "",
        ml: Number(product.ml) || 0,
        cost: existingIndex >= 0 ? state.perfumes[existingIndex].cost || 0 : 0,
        price: Number(product.price) || 0,
        stock: Number(product.stock) || 0,
        tiendanubeProductId: product.tiendanubeProductId || "",
        tiendanubeVariantId: product.tiendanubeVariantId || "",
        tiendanubeSku: product.tiendanubeSku || "",
        tiendanubeSyncedAt: new Date().toISOString(),
        createdAt: existingIndex >= 0 ? state.perfumes[existingIndex].createdAt : new Date().toISOString(),
      };
      const existing = existingIndex >= 0 ? state.perfumes[existingIndex] : null;
      const enriched = {
        ...normalized,
        gender: normalizePerfumeGender(existing?.gender),
        scentProfile: normalizeScentProfile(existing?.scentProfile),
        scentTags: normalizeScentTags(existing?.scentTags, existing?.scentProfile),
        infoSource: getFragranticaSearchUrl(normalized),
        infoSourceTitle: "Buscar en Fragrantica",
        infoUpdatedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        state.perfumes[existingIndex] = {
          ...state.perfumes[existingIndex],
          ...enriched,
        };
        updated += 1;
      } else {
        state.perfumes.push(enriched);
        created += 1;
      }
    }

    saveState();
    renderAll();
    showNotification(`Tiendanube sincronizado: ${created} nuevos, ${updated} actualizados.`);
  } catch (error) {
    console.error("No se pudo sincronizar Tiendanube.", error);
    showError(`No se pudo sincronizar Tiendanube. ${error.message}`);
  } finally {
    refs.syncTiendanubeBtn.disabled = false;
    refs.syncTiendanubeBtn.textContent = "Sincronizar productos";
  }
}

function findPerfumeIndexByTiendanubeProduct(product) {
  const productId = String(product.tiendanubeProductId || "");
  const variantId = String(product.tiendanubeVariantId || "");
  const sku = String(product.tiendanubeSku || "").trim().toLowerCase();
  const name = String(product.name || "").trim().toLowerCase();

  return state.perfumes.findIndex((perfume) => {
    const sameVariant = variantId && String(perfume.tiendanubeVariantId || "") === variantId;
    const sameProduct = productId && String(perfume.tiendanubeProductId || "") === productId;
    const sameSku = sku && String(perfume.tiendanubeSku || "").trim().toLowerCase() === sku;
    const sameName = name && String(perfume.name || "").trim().toLowerCase() === name;
    return sameVariant || sameProduct || sameSku || sameName;
  });
}

async function syncTiendanubeStockForSale(sale) {
  if (!getAccessToken()) return;

  try {
    await callNetlifyFunction("tiendanube-update-stock", {
      saleId: sale.id,
      items: sale.items,
    });
    showNotification("Stock sincronizado con Tiendanube.");
  } catch (error) {
    console.error("No se pudo sincronizar stock con Tiendanube.", error);
    showNotification(`La venta se guardo, pero no se pudo sincronizar Tiendanube. ${error.message}`, "warning", "Tiendanube pendiente");
  }
}

function resetPerfumeForm() {
  refs.perfumeForm.reset();
  refs.perfumeForm.perfumeId.value = "";
  refs.perfumeForm.gender.value = "";
  refs.perfumeForm.scentProfile.value = "";
  refs.perfumeForm.ml.value = 100;
  refs.perfumeForm.cost.value = 0;
  refs.perfumeForm.stock.value = 0;
  refs.savePerfumeBtn.textContent = "Guardar perfume";
  refs.cancelPerfumeEditBtn.hidden = true;
  syncFragranticaSearchLink();
}

function startPerfumeEdit(perfumeId) {
  const perfume = state.perfumes.find((item) => item.id === perfumeId);
  if (!perfume) return;

  refs.perfumeForm.perfumeId.value = perfume.id;
  refs.perfumeForm.name.value = perfume.name || "";
  refs.perfumeForm.brand.value = perfume.brand || "";
  refs.perfumeForm.gender.value = normalizePerfumeGender(perfume.gender) === "Sin clasificar" ? "" : normalizePerfumeGender(perfume.gender);
  refs.perfumeForm.scentProfile.value = normalizeScentProfile(perfume.scentProfile) === "Sin clasificar" ? "" : normalizeScentProfile(perfume.scentProfile);
  refs.perfumeForm.ml.value = perfume.ml || 0;
  refs.perfumeForm.cost.value = perfume.cost || 0;
  refs.perfumeForm.price.value = perfume.price || 0;
  refs.perfumeForm.stock.value = perfume.stock || 0;
  refs.savePerfumeBtn.textContent = "Guardar cambios";
  refs.cancelPerfumeEditBtn.hidden = false;
  syncFragranticaSearchLink();
  refs.perfumeForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function syncBrandFilterOptions() {
  const currentValue = refs.brandFilter.value;
  const brands = Array.from(
    new Set(
      state.perfumes
        .map((item) => (item.brand || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "es"));

  refs.brandFilter.innerHTML = [
    `<option value="">Todas las marcas</option>`,
    ...brands.map((brand) => `<option value="${escapeHtml(brand)}">${escapeHtml(brand)}</option>`),
  ].join("");

  refs.brandFilter.value = brands.includes(currentValue) ? currentValue : "";
}

function syncBrandSuggestions() {
  const brands = Array.from(
    new Set(
      state.perfumes
        .map((item) => (item.brand || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "es"));

  refs.brandSuggestions.innerHTML = brands
    .map((brand) => `<option value="${escapeHtml(brand)}"></option>`)
    .join("");
}

function syncFragranticaSearchLink() {
  const name = refs.perfumeForm?.name?.value || "";
  const brand = refs.perfumeForm?.brand?.value || "";
  refs.fragranticaSearchLink.href = getFragranticaSearchUrl({ name, brand });
}

function getFragranticaSearchUrl(perfume = {}) {
  const query = encodeURIComponent(`${perfume.brand || ""} ${perfume.name || ""}`.trim());
  return query ? `https://www.fragrantica.com/search/?query=${query}` : "https://www.fragrantica.com/";
}

function syncPerfumeFilterOptions() {
  syncStaticSelectOptions(refs.genderFilter, "Todos los generos", PERFUME_GENDER_OPTIONS);
  syncStaticSelectOptions(refs.scentProfileFilter, "Todos los perfiles", PERFUME_PROFILE_OPTIONS);
}

function syncStaticSelectOptions(select, allLabel, options) {
  const currentValue = select.value;
  select.innerHTML = [
    `<option value="">${escapeHtml(allLabel)}</option>`,
    ...options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`),
  ].join("");
  select.value = options.includes(currentValue) ? currentValue : "";
}

function handlePriceFormulaInput() {
  const formData = new FormData(refs.priceFormulaForm);
  priceFormulaState.baseExtra = Number(formData.get("baseExtra")) || 0;
  priceFormulaState.markupMultiplier = Number(formData.get("markupMultiplier")) || 0;
  priceFormulaState.markdownAmount = Number(formData.get("markdownAmount")) || 0;
  priceFormulaState.promoDiscountPercent = Number(formData.get("promoDiscountPercent")) || 0;
  saveState();
  renderPriceCalculator();
}

function renderAuthGate() {
  const config = getRemoteDatabaseConfig();
  const user = getCurrentUser();

  if (!config.enabled) {
    refs.authStatus.innerHTML = `
      <strong>Base publica desactivada</strong>
      <span>Configura Supabase en database-config.js para activar el acceso con usuario.</span>
    `;
    refs.authScreen.hidden = true;
    refs.appShell.hidden = false;
    refs.currentUserBadge.hidden = true;
    refs.authLogoutBtn.hidden = true;
    return;
  }

  if (!user) {
    const storageLabel = isApiBackendEnabled(config) ? "servidor dinamico" : "base publica";
    refs.authStatus.innerHTML = `
      <strong>Necesitas iniciar sesion</strong>
      <span>Crea una cuenta o entra con tu email para abrir el panel con ${storageLabel}.</span>
    `;
    refs.authScreen.hidden = false;
    refs.appShell.hidden = true;
    refs.currentUserBadge.hidden = true;
    refs.authLogoutBtn.hidden = true;
    return;
  }

  refs.authStatus.innerHTML = `
    <strong>Sesion iniciada</strong>
    <span>${escapeHtml(user.email || "Usuario conectado")}</span>
  `;
  refs.authScreen.hidden = true;
  refs.appShell.hidden = false;
  refs.currentUserBadge.innerHTML = `
    <span>Cuenta iniciada</span>
    <strong>${escapeHtml(user.email || "Usuario conectado")}</strong>
  `;
  refs.currentUserBadge.hidden = false;
  refs.authLogoutBtn.hidden = false;
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const config = getRemoteDatabaseConfig();
  if (!config.enabled) {
    showError("Primero activa Supabase en database-config.js.");
    return;
  }

  const formData = new FormData(refs.authLoginForm);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  try {
    validateRemoteConfig(config);
    const session = await authenticateWithPassword(config, email, password);
    setAuthSession(session);
    refs.authLoginForm.reset();
    await loadState();
    renderAll();
    showNotification("Sesion iniciada correctamente.");
  } catch (error) {
    console.error("No se pudo iniciar sesion.", error);
    showError(`No se pudo iniciar sesion. ${error.message}`);
  }
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  const config = getRemoteDatabaseConfig();
  if (!config.enabled) {
    showError("Primero activa Supabase en database-config.js.");
    return;
  }

  const formData = new FormData(refs.authRegisterForm);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  try {
    validateRemoteConfig(config);
    const session = await registerWithPassword(config, email, password);
    refs.authRegisterForm.reset();

    if (session?.access_token) {
      setAuthSession(session);
      hydrateState({});
      await writeDatabaseState(getStateSnapshot());
      renderAll();
      showNotification("Cuenta creada y sesion iniciada.");
      return;
    }

    showNotification("Cuenta creada. Revisa tu email si Supabase pide confirmar la cuenta antes de iniciar sesion.", "warning", "Cuenta creada");
  } catch (error) {
    console.error("No se pudo crear la cuenta.", error);
    showError(`No se pudo crear la cuenta. ${error.message}`);
  }
}

async function handleLogout() {
  const confirmed = await confirmAction("Vas a cerrar la sesion actual. Quieres seguir?");
  if (!confirmed) return;

  const config = getRemoteDatabaseConfig();
  if (config.enabled && getAccessToken()) {
    try {
      const logoutUrl = isApiBackendEnabled(config)
        ? `${config.apiBaseUrl}/auth/logout`
        : `${config.supabaseUrl}/auth/v1/logout`;
      await fetch(logoutUrl, {
        method: "POST",
        headers: isApiBackendEnabled(config)
          ? { Authorization: `Bearer ${getAccessToken()}` }
          : getRemoteHeaders(config),
      });
    } catch (error) {
      console.error("No se pudo cerrar la sesion remota.", error);
    }
  }

  setAuthSession(null);
  hydrateState({});
  renderAll();
  showNotification("Sesion cerrada correctamente.");
}

async function authenticateWithPassword(config, email, password) {
  if (isApiBackendEnabled(config)) {
    return authenticateWithApiPassword(config, email, password);
  }

  const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await getSupabaseErrorMessage(response));
  }

  return response.json();
}

async function registerWithPassword(config, email, password) {
  if (isApiBackendEnabled(config)) {
    return registerWithApiPassword(config, email, password);
  }

  const response = await fetch(`${config.supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await getSupabaseErrorMessage(response));
  }

  return response.json();
}

async function authenticateWithApiPassword(config, email, password) {
  const response = await fetch(`${config.apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json();
}

async function registerWithApiPassword(config, email, password) {
  const response = await fetch(`${config.apiBaseUrl}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json();
}

async function getSupabaseErrorMessage(response) {
  try {
    const details = await response.json();
    return details.msg || details.message || details.error_description || details.error || `Supabase respondio ${response.status}`;
  } catch (error) {
    return `Supabase respondio ${response.status}`;
  }
}

async function getApiErrorMessage(response) {
  try {
    const details = await response.json();
    return details.error || details.message || `Servidor respondio ${response.status}`;
  } catch (error) {
    return `Servidor respondio ${response.status}`;
  }
}

function handleHistorySubmit(event) {
  event.preventDefault();
  const formData = new FormData(refs.historyForm);
  state.history = {
    salesAmount: Number(formData.get("historicalSalesAmount")) || 0,
    soldUnits: Number(formData.get("historicalSoldUnits")) || 0,
    expensesAmount: Number(formData.get("historicalExpensesAmount")) || 0,
    initialInvestment: Number(formData.get("historicalInitialInvestment")) || 0,
    boughtUnits: Number(formData.get("historicalBoughtUnits")) || 0,
    subscriptionsAmount: Number(formData.get("historicalSubscriptionsAmount")) || 0,
    withdrawalsAmount: Number(formData.get("historicalWithdrawalsAmount")) || 0,
    dollarPurchasePesos: Number(formData.get("historicalDollarPurchasePesos")) || 0,
    dollarBoughtUnits: Number(formData.get("historicalDollarBoughtUnits")) || 0,
    dollarSpentUnits: Number(formData.get("historicalDollarSpentUnits")) || 0,
  };
  saveState();
  renderAll();
  showNotification("Acumulado inicial guardado correctamente.");
}

function populateProductSelects() {
  const perfumeOptions = state.perfumes
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
    .map((perfume) => `<option value="${perfume.id}">${escapeHtml(perfume.name)} (${perfume.stock} en stock)</option>`)
    .join("");

  refs.saleProductSelect.innerHTML = `<option value="">Selecciona un perfume</option>${perfumeOptions}`;
  syncSaleUnitPrice();
}

function getPaymentNet(price, methodKey) {
  const paymentMethod = PAYMENT_METHODS[methodKey] || PAYMENT_METHODS.Transferencia;
  return roundCurrency(paymentMethod.factor(Number(price) || 0));
}

function getPromoPrice(price) {
  return Math.max(0, roundToThousands((Number(price) || 0) * 0.9 - priceFormulaState.markdownAmount));
}

function getDiscount20Price(price) {
  return roundCurrency((Number(price) || 0) * 0.8);
}

function isCustomPaymentMethod(methodKey) {
  return methodKey === "Personalizado" || methodKey === "Personalizado2";
}

function isInstallmentPaymentMethod(methodKey) {
  return methodKey === "Personalizado2";
}

function syncSaleUnitPrice() {
  const perfume = state.perfumes.find((item) => item.id === refs.saleProductSelect.value);
  if (!perfume) {
    refs.saleUnitPriceInput.value = "";
    return;
  }

  const method = refs.saleForm.paymentMethod.value;
  refs.saleUnitPriceInput.readOnly = !isCustomPaymentMethod(method);
  refs.saleUnitPriceInput.value = getPaymentNet(perfume.price, method);
}

function syncSalePaymentFields(resetDueDate = false) {
  const isInstallment = isInstallmentPaymentMethod(refs.saleForm.paymentMethod.value);
  refs.saleInstallmentFields.hidden = !isInstallment;

  if (!isInstallment) {
    refs.saleFirstPaymentInput.value = "";
    refs.saleSecondDueDateInput.value = "";
    return;
  }

  if (resetDueDate || !refs.saleSecondDueDateInput.value) {
    refs.saleSecondDueDateInput.value = addMonthsToDate(refs.saleForm.date.value, 1);
  }
}

function addSaleDraftItem() {
  const perfume = state.perfumes.find((item) => item.id === refs.saleProductSelect.value);
  const quantity = Number(refs.saleQtyInput.value) || 0;
  const unitNet = Number(refs.saleUnitPriceInput.value) || 0;

  if (!perfume) {
    showError("Selecciona un perfume.");
    return;
  }

  if (quantity <= 0) {
    showError("La cantidad debe ser mayor a 0.");
    return;
  }

  if (unitNet < 0) {
    showError("El precio personalizado no puede ser negativo.");
    return;
  }

  const reservedQty = getDraftSaleQtyForPerfume(perfume.id);
  if (reservedQty + quantity > perfume.stock) {
    showError(`No tienes stock suficiente. Stock actual: ${perfume.stock}`);
    return;
  }

  state.draftSaleItems.push({
    id: crypto.randomUUID(),
    perfumeId: perfume.id,
    name: perfume.name,
    qty: quantity,
    basePrice: perfume.price,
    paymentMethod: refs.saleForm.paymentMethod.value,
    unitNet,
    tiendanubeProductId: perfume.tiendanubeProductId || "",
    tiendanubeVariantId: perfume.tiendanubeVariantId || "",
    tiendanubeSku: perfume.tiendanubeSku || "",
  });

  refs.saleQtyInput.value = 1;
  renderSaleDraft();
  showNotification("Item agregado a la venta.");
}

function removeSaleDraftItem(itemId) {
  state.draftSaleItems = state.draftSaleItems.filter((item) => item.id !== itemId);
  renderSaleDraft();
  showNotification("Item quitado de la venta.");
}

function getDraftSaleQtyForPerfume(perfumeId) {
  return state.draftSaleItems
    .filter((item) => item.perfumeId === perfumeId)
    .reduce((sum, item) => sum + (item.qty || 0), 0);
}

function renderSaleDraft() {
  refs.saleItemsList.innerHTML = "";

  if (!state.draftSaleItems.length) {
    refs.saleItemsList.appendChild(buildEmptyState("Agrega uno o mas productos a la venta."));
  } else {
    state.draftSaleItems.forEach((item) => {
      const row = document.createElement("div");
      row.className = "mini-item";
      row.innerHTML = `
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <div>${item.qty} x ${formatCurrency(item.unitNet)} · ${escapeHtml(getPaymentLabel(item.paymentMethod))}</div>
        </div>
        <button type="button" class="text-button">Quitar</button>
      `;
      row.querySelector("button").addEventListener("click", () => removeSaleDraftItem(item.id));
      refs.saleItemsList.appendChild(row);
    });
  }

  const gross = state.draftSaleItems.reduce((sum, item) => sum + item.basePrice * item.qty, 0);
  const net = state.draftSaleItems.reduce((sum, item) => sum + item.unitNet * item.qty, 0);
  const paymentPreview = buildSalePaymentsPreview(net);
  const paidNow = getPaymentsPaidTotal(paymentPreview);
  const pending = Math.max(0, net - paidNow);

  refs.saleSummary.innerHTML = `
    <div>Precio de lista: <strong>${formatCurrency(gross)}</strong></div>
    <div>Total pactado: <strong>${formatCurrency(net)}</strong></div>
    <div>Se suma ahora al banco: <strong>${formatCurrency(paidNow)}</strong></div>
    ${pending > 0 ? `<div>Queda pendiente: <strong>${formatCurrency(pending)}</strong></div>` : ""}
  `;
}

function buildSalePaymentsPreview(agreedTotal) {
  const date = refs.saleForm.date.value || new Date().toISOString().slice(0, 10);
  if (!isInstallmentPaymentMethod(refs.saleForm.paymentMethod.value)) {
    return [{
      id: crypto.randomUUID(),
      label: "Pago completo",
      amount: agreedTotal,
      dueDate: date,
      paidDate: date,
      paid: true,
    }];
  }

  const firstPayment = Math.min(agreedTotal, Math.max(0, Number(refs.saleFirstPaymentInput.value) || agreedTotal / 2));
  const secondPayment = Math.max(0, agreedTotal - firstPayment);
  return [
    {
      id: crypto.randomUUID(),
      label: "Cuota 1",
      amount: roundCurrency(firstPayment),
      dueDate: date,
      paidDate: date,
      paid: firstPayment > 0,
    },
    {
      id: crypto.randomUUID(),
      label: "Cuota 2",
      amount: roundCurrency(secondPayment),
      dueDate: refs.saleSecondDueDateInput.value || addMonthsToDate(date, 1),
      paidDate: "",
      paid: false,
    },
  ];
}

function handleSaleSubmit(event) {
  event.preventDefault();

  if (!state.draftSaleItems.length) {
    showError("Agrega al menos un item a la venta.");
    return;
  }

  const groupedQty = state.draftSaleItems.reduce((acc, item) => {
    acc[item.perfumeId] = (acc[item.perfumeId] || 0) + item.qty;
    return acc;
  }, {});

  for (const [perfumeId, qty] of Object.entries(groupedQty)) {
    const perfume = state.perfumes.find((item) => item.id === perfumeId);
    if (!perfume || perfume.stock < qty) {
      showError(`No tienes stock suficiente para ${perfume?.name || "ese perfume"}.`);
      return;
    }
  }

  const formData = new FormData(refs.saleForm);
  const sale = {
    id: crypto.randomUUID(),
    customer: formData.get("customer").trim(),
    date: formData.get("date"),
    paymentMethod: formData.get("paymentMethod"),
    channel: formData.get("channel").trim(),
    items: state.draftSaleItems.map((item) => ({ ...item })),
    grossTotal: state.draftSaleItems.reduce((sum, item) => sum + item.basePrice * item.qty, 0),
    agreedTotal: state.draftSaleItems.reduce((sum, item) => sum + item.unitNet * item.qty, 0),
    createdAt: new Date().toISOString(),
  };
  sale.payments = buildSalePaymentsPreview(sale.agreedTotal);
  sale.total = getPaymentsPaidTotal(sale.payments);

  sale.items.forEach((item) => {
    const perfume = state.perfumes.find((entry) => entry.id === item.perfumeId);
    if (perfume) {
      perfume.stock = Math.max(0, perfume.stock - item.qty);
    }
  });

  state.sales.unshift(sale);
  state.draftSaleItems = [];
  refs.saleForm.reset();
  seedDefaultDates();
  syncSaleUnitPrice();
  saveState();
  renderAll();
  showNotification("Venta registrada correctamente.");
  syncTiendanubeStockForSale(sale);
}

async function deleteSale(saleId) {
  const sale = state.sales.find((item) => item.id === saleId);
  if (!sale) return;

  const confirmed = await confirmAction("Esta venta se va a borrar y el stock se va a devolver. Quieres seguir?");
  if (!confirmed) return;

  sale.items.forEach((item) => {
    const perfume = state.perfumes.find((entry) => entry.id === item.perfumeId);
    if (perfume) {
      perfume.stock += item.qty;
    }
  });

  state.sales = state.sales.filter((item) => item.id !== saleId);
  saveState();
  renderAll();
  showNotification("Venta borrada correctamente.");
}

async function deletePerfume(perfumeId) {
  const perfume = state.perfumes.find((item) => item.id === perfumeId);
  if (!perfume) return;

  const hasSales = state.sales.some((sale) =>
    sale.items.some((item) => item.perfumeId === perfumeId)
  );

  if (hasSales) {
    showError("No puedes borrar este perfume porque ya aparece en ventas guardadas.");
    return;
  }

  const confirmed = await confirmAction("Este perfume se va a borrar del inventario. Quieres seguir?");
  if (!confirmed) return;

  state.perfumes = state.perfumes.filter((item) => item.id !== perfumeId);
  state.draftSaleItems = state.draftSaleItems.filter((item) => item.perfumeId !== perfumeId);
  if (refs.perfumeForm.perfumeId.value === perfumeId) {
    resetPerfumeForm();
  }
  saveState();
  renderAll();
  showNotification("Perfume eliminado correctamente.");
}

function handleExpenseSubmit(event) {
  event.preventDefault();
  const formData = new FormData(refs.orderForm);
  const expense = {
    id: crypto.randomUUID(),
    supplier: formData.get("supplier").trim(),
    category: formData.get("category"),
    date: formData.get("date"),
    amount: Number(formData.get("amount")) || 0,
    notes: formData.get("notes").trim(),
    createdAt: new Date().toISOString(),
  };

  if (!expense.amount || expense.amount <= 0) {
    showError("Escribe un gasto valido.");
    return;
  }

  state.expenses.unshift(expense);
  refs.orderForm.reset();
  seedDefaultDates();
  saveState();
  renderAll();
  showNotification("Gasto registrado correctamente.");
}

async function deleteExpense(expenseId) {
  const confirmed = await confirmAction("Este gasto se va a borrar. Quieres seguir?");
  if (!confirmed) return;
  state.expenses = state.expenses.filter((item) => item.id !== expenseId);
  saveState();
  renderAll();
  showNotification("Gasto eliminado correctamente.");
}

async function deleteDollarPurchase(itemId) {
  const confirmed = await confirmAction("Esta compra de dolares se va a borrar. Quieres seguir?");
  if (!confirmed) return;
  state.dollarPurchases = state.dollarPurchases.filter((item) => item.id !== itemId);
  saveState();
  renderAll();
  showNotification("Compra de dolares eliminada correctamente.");
}

async function deleteDollarSpend(itemId) {
  const confirmed = await confirmAction("Este gasto en dolares se va a borrar. Quieres seguir?");
  if (!confirmed) return;
  state.dollarSpends = state.dollarSpends.filter((item) => item.id !== itemId);
  saveState();
  renderAll();
  showNotification("Gasto en dolares eliminado correctamente.");
}

async function deleteBankIncome(itemId) {
  const confirmed = await confirmAction("Este ingreso del banco se va a borrar. Quieres seguir?");
  if (!confirmed) return;
  state.bankIncomes = state.bankIncomes.filter((item) => item.id !== itemId);
  saveState();
  renderAll();
  showNotification("Ingreso del banco eliminado correctamente.");
}

async function deleteSubscription(itemId) {
  const confirmed = await confirmAction("Esta suscripcion se va a borrar. Quieres seguir?");
  if (!confirmed) return;
  state.subscriptions = state.subscriptions.filter((item) => item.id !== itemId);
  saveState();
  renderAll();
  showNotification("Suscripcion eliminada correctamente.");
}

async function deleteWithdrawal(itemId) {
  const confirmed = await confirmAction("Este retiro se va a borrar. Quieres seguir?");
  if (!confirmed) return;
  state.withdrawals = state.withdrawals.filter((item) => item.id !== itemId);
  saveState();
  renderAll();
  showNotification("Retiro eliminado correctamente.");
}

function renderExpenseDraft() {
  refs.orderSummary.innerHTML = `
    <div>Puedes cargar cualquier gasto o encargo manualmente.</div>
    <div>Ese monto se suma a tu total gastado.</div>
  `;
}

function syncDollarPurchaseAmount() {
  const pesosAmount = Number(refs.dollarPurchaseForm.pesosAmount.value) || 0;
  const dollarPrice = Number(refs.dollarPurchaseForm.dollarPrice.value) || 0;
  refs.dollarPurchaseForm.dollarsAmount.value =
    dollarPrice > 0 ? roundCurrency(pesosAmount / dollarPrice) : 0;
}

function handleDollarPurchaseSubmit(event) {
  event.preventDefault();
  const formData = new FormData(refs.dollarPurchaseForm);
  const pesosAmount = Number(formData.get("pesosAmount")) || 0;
  const dollarPrice = Number(formData.get("dollarPrice")) || 0;
  const dollarsAmount = dollarPrice > 0 ? roundCurrency(pesosAmount / dollarPrice) : 0;

  if (pesosAmount <= 0 || dollarPrice <= 0 || dollarsAmount <= 0) {
    showError("Carga una compra de dolares valida.");
    return;
  }

  state.dollarPurchases.unshift({
    id: crypto.randomUUID(),
    date: formData.get("date"),
    pesosAmount,
    dollarPrice,
    dollarsAmount,
    notes: formData.get("notes").trim(),
    createdAt: new Date().toISOString(),
  });

  refs.dollarPurchaseForm.reset();
  seedDefaultDates();
  saveState();
  renderAll();
  showNotification("Compra de dolares registrada correctamente.");
}

function handleDollarSpendSubmit(event) {
  event.preventDefault();
  const formData = new FormData(refs.dollarSpendForm);
  const dollarsAmount = Number(formData.get("dollarsAmount")) || 0;
  if (dollarsAmount <= 0) {
    showError("Carga un gasto en dolares valido.");
    return;
  }

  state.dollarSpends.unshift({
    id: crypto.randomUUID(),
    date: formData.get("date"),
    dollarsAmount,
    detail: formData.get("detail").trim(),
    createdAt: new Date().toISOString(),
  });

  refs.dollarSpendForm.reset();
  seedDefaultDates();
  saveState();
  renderAll();
  showNotification("Gasto en dolares registrado correctamente.");
}

function handleSubscriptionSubmit(event) {
  event.preventDefault();
  const formData = new FormData(refs.subscriptionForm);
  const amount = Number(formData.get("amount")) || 0;
  if (amount <= 0) {
    showError("Carga una suscripcion valida.");
    return;
  }

  state.subscriptions.unshift({
    id: crypto.randomUUID(),
    date: formData.get("date"),
    detail: formData.get("detail").trim(),
    amount,
    createdAt: new Date().toISOString(),
  });

  refs.subscriptionForm.reset();
  seedDefaultDates();
  saveState();
  renderAll();
  showNotification("Suscripcion registrada correctamente.");
}

function handleBankIncomeSubmit(event) {
  event.preventDefault();
  const formData = new FormData(refs.bankIncomeForm);
  const amount = Number(formData.get("amount")) || 0;
  if (amount <= 0) {
    showError("Carga un ingreso valido.");
    return;
  }

  state.bankIncomes.unshift({
    id: crypto.randomUUID(),
    date: formData.get("date"),
    detail: formData.get("detail").trim(),
    amount,
    createdAt: new Date().toISOString(),
  });

  refs.bankIncomeForm.reset();
  seedDefaultDates();
  saveState();
  renderAll();
  showNotification("Ingreso del banco registrado correctamente.");
}

function handleWithdrawalSubmit(event) {
  event.preventDefault();
  const formData = new FormData(refs.withdrawalForm);
  const amount = Number(formData.get("amount")) || 0;
  if (amount <= 0) {
    showError("Carga un retiro valido.");
    return;
  }

  state.withdrawals.unshift({
    id: crypto.randomUUID(),
    date: formData.get("date"),
    detail: formData.get("detail").trim(),
    amount,
    createdAt: new Date().toISOString(),
  });

  refs.withdrawalForm.reset();
  seedDefaultDates();
  saveState();
  renderAll();
  showNotification("Retiro registrado correctamente.");
}

function adjustStock(perfumeId, delta) {
  const perfume = state.perfumes.find((item) => item.id === perfumeId);
  if (!perfume) return;
  perfume.stock = Math.max(0, perfume.stock + delta);
  saveState();
  renderAll();
  showNotification("Stock actualizado correctamente.");
}

function renderDollarTable() {
  refs.dollarTableBody.innerHTML = "";
  const movements = [
    ...state.dollarPurchases.map((item) => ({
      id: item.id,
      date: item.date,
      type: "Compra",
      source: "purchase",
      pesosAmount: item.pesosAmount,
      dollarPrice: item.dollarPrice,
      dollarsAmount: item.dollarsAmount,
      detail: item.notes || "",
    })),
    ...state.dollarSpends.map((item) => ({
      id: item.id,
      date: item.date,
      type: "Gasto USD",
      source: "spend",
      pesosAmount: "",
      dollarPrice: "",
      dollarsAmount: item.dollarsAmount,
      detail: item.detail || "",
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!movements.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="7">Todavia no registraste movimientos en dolares.</td>`;
    refs.dollarTableBody.appendChild(row);
    return;
  }

  movements.forEach((movement) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td data-label="Fecha">${formatDate(movement.date)}</td>
      <td data-label="Tipo">${escapeHtml(movement.type)}</td>
      <td data-label="Pesos">${movement.pesosAmount === "" ? "-" : formatCurrency(movement.pesosAmount)}</td>
      <td data-label="Precio dolar">${movement.dollarPrice === "" ? "-" : formatCurrency(movement.dollarPrice)}</td>
      <td data-label="Dolares">${roundCurrency(movement.dollarsAmount)}</td>
      <td data-label="Detalle">${escapeHtml(movement.detail || "-")}</td>
      <td data-label="Accion"><button type="button" class="danger-text-button">Borrar</button></td>
    `;
    row.querySelector("button").addEventListener("click", () => {
      if (movement.source === "purchase") {
        deleteDollarPurchase(movement.id);
      } else {
        deleteDollarSpend(movement.id);
      }
    });
    refs.dollarTableBody.appendChild(row);
  });
}

function renderBankMovementsTable() {
  refs.bankMovementsTableBody.innerHTML = "";
  const movements = [
    ...state.subscriptions.map((item) => ({ ...item, type: "Suscripcion", source: "subscription" })),
    ...state.bankIncomes.map((item) => ({ ...item, type: "Ingreso banco", source: "income" })),
    ...state.withdrawals.map((item) => ({ ...item, type: "Retiro", source: "withdrawal" })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!movements.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="5">Todavia no registraste movimientos en pesos.</td>`;
    refs.bankMovementsTableBody.appendChild(row);
    return;
  }

  movements.forEach((movement) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td data-label="Fecha">${formatDate(movement.date)}</td>
      <td data-label="Tipo">${escapeHtml(movement.type)}</td>
      <td data-label="Detalle">${escapeHtml(movement.detail || "-")}</td>
      <td data-label="Monto">${formatCurrency(movement.amount)}</td>
      <td data-label="Accion"><button type="button" class="danger-text-button">Borrar</button></td>
    `;
    row.querySelector("button").addEventListener("click", () => {
      if (movement.source === "subscription") {
        deleteSubscription(movement.id);
      } else if (movement.source === "income") {
        deleteBankIncome(movement.id);
      } else {
        deleteWithdrawal(movement.id);
      }
    });
    refs.bankMovementsTableBody.appendChild(row);
  });
}

function renderProductsTable() {
  const query = refs.productSearch.value.trim().toLowerCase();
  const brandFilter = refs.brandFilter.value.trim().toLowerCase();
  const genderFilter = refs.genderFilter.value.trim().toLowerCase();
  const scentProfileFilter = refs.scentProfileFilter.value.trim().toLowerCase();
  const sortMode = refs.productSort.value;
  const filtered = state.perfumes
    .filter((item) => `${item.name} ${item.brand} ${getDisplayPerfumeGender(item)} ${item.scentProfile} ${(item.scentTags || []).join(" ")}`.toLowerCase().includes(query))
    .filter((item) => !brandFilter || (item.brand || "").trim().toLowerCase() === brandFilter)
    .filter((item) => !genderFilter || getDisplayPerfumeGender(item).toLowerCase() === genderFilter)
    .filter((item) => !scentProfileFilter || normalizeScentProfile(item.scentProfile).toLowerCase() === scentProfileFilter)
    .sort((a, b) => {
      if (sortMode === "price-desc") return b.price - a.price;
      if (sortMode === "price-asc") return a.price - b.price;
      return a.name.localeCompare(b.name, "es");
    });

  refs.productsTableBody.innerHTML = "";

  if (!filtered.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="9">No hay perfumes cargados todavia.</td>`;
    refs.productsTableBody.appendChild(row);
    return;
  }

  filtered.forEach((item) => {
    const row = document.createElement("tr");
    const priceItems = [
      ["Costo", item.cost],
      ["Lista", item.price],
      ["Transf. / efectivo", getPaymentNet(item.price, "Transferencia")],
      ["Tarjeta 1", getPaymentNet(item.price, "Tarjeta1")],
      ["Tarjeta 2", getPaymentNet(item.price, "Tarjeta2")],
      ["Promo", getPaymentNet(item.price, "Promo")],
      ["20% off", getPaymentNet(item.price, "Descuento20")],
    ];
    row.innerHTML = `
      <td data-label="Producto"><strong>${escapeHtml(item.name)}</strong></td>
      <td data-label="Marca">${escapeHtml(item.brand || "-")}</td>
      <td data-label="Genero">${renderInfoTag(getDisplayPerfumeGender(item))}</td>
      <td data-label="Perfil">${renderScentProfileCell(item)}</td>
      <td data-label="ML">${item.ml ? `${escapeHtml(String(item.ml))} ml` : "-"}</td>
      <td data-label="Precios">
        <div class="product-price-scroll" tabindex="0" aria-label="Precios de ${escapeHtml(item.name)}">
          ${priceItems.map(([label, value]) => `
            <div class="product-price-pill">
              <span>${escapeHtml(label)}</span>
              <strong>${formatCurrency(value)}</strong>
            </div>
          `).join("")}
        </div>
      </td>
      <td data-label="Stock"><span class="tag ${item.stock <= 1 ? "low" : "ok"}">${item.stock}</span></td>
      <td data-label="Ajustar">
        <div class="inline-actions">
          <button type="button" class="chip-button" data-stock-action="-1">-1</button>
          <button type="button" class="chip-button" data-stock-action="1">+1</button>
        </div>
      </td>
      <td data-label="Acciones">
        <div class="row-actions">
          <button type="button" class="text-button" data-edit-product="1">Editar</button>
          <button type="button" class="danger-text-button" data-delete-product="1">Borrar</button>
        </div>
      </td>
    `;

    row.querySelectorAll("[data-stock-action]").forEach((button) => {
      button.addEventListener("click", () => adjustStock(item.id, Number(button.dataset.stockAction)));
    });
    row.querySelector("[data-edit-product]").addEventListener("click", () => startPerfumeEdit(item.id));
    row.querySelector("[data-delete-product]").addEventListener("click", () => deletePerfume(item.id));

    refs.productsTableBody.appendChild(row);
  });
}

function renderInfoTag(value) {
  const normalized = value || "Sin clasificar";
  const className = normalized === "Sin clasificar" ? "pending" : "ok";
  return `<span class="tag ${className}">${escapeHtml(normalized)}</span>`;
}

function getDisplayPerfumeGender(perfume) {
  return normalizePerfumeGender(perfume.gender);
}

function renderScentProfileCell(item) {
  const profile = normalizeScentProfile(item.scentProfile);
  const sourceLink = item.infoSource
    ? `<a class="source-link" href="${escapeHtml(item.infoSource)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(item.infoSourceTitle || "Fuente externa")}">fuente</a>`
    : "";

  return `
    <div class="profile-cell">
      ${renderInfoTag(profile)}
      ${sourceLink}
    </div>
  `;
}

function renderSalesTable() {
  refs.salesTableBody.innerHTML = "";

  if (!state.sales.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="7">Todavia no registraste ventas.</td>`;
    refs.salesTableBody.appendChild(row);
    return;
  }

  state.sales
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((sale) => {
      const row = document.createElement("tr");
      const remaining = getSaleRemaining(sale);
      row.innerHTML = `
        <td data-label="Fecha">${formatDate(sale.date)}</td>
        <td data-label="Cliente">${escapeHtml(sale.customer || "-")}</td>
        <td data-label="Items">${sale.items.map((item) => `${escapeHtml(item.name)} x${item.qty}`).join(", ")}</td>
        <td data-label="Metodo">${escapeHtml(getPaymentLabel(sale.paymentMethod))}</td>
        <td data-label="Total neto">
          <div><strong>${formatCurrency(getSaleAgreedTotal(sale))}</strong></div>
          ${remaining > 0 ? `<div class="muted-cell">Pendiente: ${formatCurrency(remaining)}</div>` : ""}
        </td>
        <td data-label="Pagado">${renderSalePaymentsCell(sale)}</td>
        <td data-label="Accion">
          <div class="table-actions">
            ${getNextPendingPayment(sale) ? `<button type="button" class="text-button pay-installment-button">Marcar cuota pagada</button>` : ""}
            <button type="button" class="danger-text-button delete-sale-button">Borrar</button>
          </div>
        </td>
      `;
      row.querySelector(".delete-sale-button").addEventListener("click", () => deleteSale(sale.id));
      row.querySelector(".pay-installment-button")?.addEventListener("click", () => markNextInstallmentPaid(sale.id));
      refs.salesTableBody.appendChild(row);
    });
}

function renderSalePaymentsCell(sale) {
  return getSalePayments(sale).map((payment) => {
    const status = payment.paid
      ? `Pagada ${formatDate(payment.paidDate || sale.date)}`
      : `Vence ${formatDate(payment.dueDate)}`;
    return `
      <div class="payment-line">
        <strong>${escapeHtml(payment.label)}</strong>
        <span>${formatCurrency(payment.amount)} - ${escapeHtml(status)}</span>
      </div>
    `;
  }).join("");
}

function getNextPendingPayment(sale) {
  return getSalePayments(sale).find((payment) => !payment.paid && payment.amount > 0);
}

function markNextInstallmentPaid(saleId) {
  const sale = state.sales.find((item) => item.id === saleId);
  if (!sale) return;

  const payment = getNextPendingPayment(sale);
  if (!payment) {
    showNotification("Esa venta no tiene cuotas pendientes.");
    return;
  }

  payment.paid = true;
  payment.paidDate = new Date().toISOString().slice(0, 10);
  sale.payments = getSalePayments(sale);
  sale.total = getPaymentsPaidTotal(sale.payments);
  saveState();
  renderAll();
  showNotification("Cuota marcada como pagada.");
}

function renderExpensesTable() {
  refs.ordersTableBody.innerHTML = "";

  if (!state.expenses.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="5">Todavia no registraste gastos.</td>`;
    refs.ordersTableBody.appendChild(row);
    return;
  }

  state.expenses
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((expense) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td data-label="Fecha">${formatDate(expense.date)}</td>
        <td data-label="Detalle">${escapeHtml(expense.supplier || "-")}</td>
        <td data-label="Categoria">${escapeHtml(expense.category || "-")}</td>
        <td data-label="Monto">${formatCurrency(expense.amount)}</td>
        <td data-label="Accion"><button type="button" class="danger-text-button">Borrar</button></td>
      `;
      row.querySelector("button").addEventListener("click", () => deleteExpense(expense.id));
      refs.ordersTableBody.appendChild(row);
    });
}

function renderDashboard() {
  const summary = getDashboardSummary();

  const stats = [
    { label: "Pesos en banco", value: formatCurrency(summary.bankPesos) },
    { label: "Dolares en banco", value: `${roundCurrency(summary.bankDollars)} USD` },
    { label: "Total vendido", value: formatCurrency(summary.totalSold) },
    { label: "Total gastado", value: formatCurrency(summary.totalSpent) },
    { label: "Inversion inicial", value: formatCurrency(summary.initialInvestment) },
    { label: "Suscripciones", value: formatCurrency(summary.totalSubscriptions) },
    { label: "Ingresos banco", value: formatCurrency(summary.totalBankIncomes) },
    { label: "Retiros", value: formatCurrency(summary.totalWithdrawals) },
    { label: "Balance", value: formatCurrency(summary.balance) },
    { label: "Cantidad total en stock", value: String(summary.totalStockUnits) },
    { label: "Perfumes vendidos", value: String(summary.totalSoldUnits) },
    { label: "Perfumes comprados", value: String(summary.totalBoughtUnits) },
  ];

  refs.statsGrid.innerHTML = stats
    .map((stat) => `
      <article class="stat-card">
        <h4>${escapeHtml(stat.label)}</h4>
        <strong>${escapeHtml(stat.value)}</strong>
      </article>
    `)
    .join("");

  const bankStats = [
    { label: "Inversion inicial", value: formatCurrency(summary.initialInvestment) },
    { label: "Total dolares comprados", value: `${roundCurrency(summary.totalDollarBoughtUnits)} USD` },
    { label: "Total dolares gastados", value: `${roundCurrency(summary.totalDollarSpentUnits)} USD` },
    { label: "Pesos usados en dolares", value: formatCurrency(summary.totalDollarPurchasePesos) },
    { label: "Total suscripciones", value: formatCurrency(summary.totalSubscriptions) },
    { label: "Ingresos del banco", value: formatCurrency(summary.totalBankIncomes) },
    { label: "Total retiros", value: formatCurrency(summary.totalWithdrawals) },
    { label: "Banco neto", value: formatCurrency(summary.bankPesos) },
  ];

  refs.bankStatsGrid.innerHTML = bankStats
    .map((stat) => `
      <article class="stat-card">
        <h4>${escapeHtml(stat.label)}</h4>
        <strong>${escapeHtml(stat.value)}</strong>
      </article>
    `)
    .join("");

  renderStackList(
    refs.topProducts,
    getTopProducts().map((item) => ({
      title: item.name,
      subtitle: `${item.qty} vendidos · ${formatCurrency(item.revenue)}`,
    })),
    "Todavia no hay ventas cargadas."
  );

  renderStackList(
    refs.lowStockList,
    state.perfumes
      .filter((item) => item.stock <= 1)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 6)
      .map((item) => ({
        title: item.name,
        subtitle: `Stock actual: ${item.stock}`,
      })),
    "No hay perfumes con stock bajo."
  );

  renderStackList(
    refs.recentSales,
    state.sales.slice(0, 5).map((sale) => ({
      title: `${formatDate(sale.date)} · ${sale.customer || "Sin cliente"}`,
      subtitle: `${getPaymentLabel(sale.paymentMethod)} · ${formatCurrency(sale.total)}`,
    })),
    "Todavia no registraste ventas."
  );

  renderStackList(
    refs.pendingOrders,
    state.expenses.slice(0, 5).map((expense) => ({
      title: `${formatDate(expense.date)} · ${expense.supplier || "Sin detalle"}`,
      subtitle: `${expense.category || "Gasto"} · ${formatCurrency(expense.amount)}`,
    })),
    "Todavia no registraste gastos."
  );
}

function renderStackList(container, items, emptyMessage) {
  container.innerHTML = "";
  if (!items.length) {
    container.appendChild(buildEmptyState(emptyMessage));
    return;
  }

  items.forEach((item) => {
    const block = document.createElement("div");
    block.className = "stack-item";
    block.innerHTML = `
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <div>${escapeHtml(item.subtitle)}</div>
      </div>
    `;
    container.appendChild(block);
  });
}

function buildEmptyState(message) {
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = message;
  return empty;
}

function exportData() {
  const blob = new Blob(
    [JSON.stringify({
      exportedAt: new Date().toISOString(),
      perfumes: state.perfumes,
      sales: state.sales,
      expenses: state.expenses,
      subscriptions: state.subscriptions,
      bankIncomes: state.bankIncomes,
      withdrawals: state.withdrawals,
      dollarPurchases: state.dollarPurchases,
      dollarSpends: state.dollarSpends,
      history: state.history,
      priceFormula: priceFormulaState,
    }, null, 2)],
    { type: "application/json" }
  );

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `perfumeria-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showNotification("Respaldo JSON exportado correctamente.");
}

function exportExcelWorkbook() {
  const workbook = {
    sheets: [
      {
        name: "Resumen",
        rows: [
          ["Total vendido", getDashboardSummary().totalSold],
          ["Total gastado", getDashboardSummary().totalSpent],
          ["Inversion inicial", getDashboardSummary().initialInvestment],
          ["Suscripciones", getDashboardSummary().totalSubscriptions],
          ["Ingresos del banco", getDashboardSummary().totalBankIncomes],
          ["Retiros", getDashboardSummary().totalWithdrawals],
          ["Pesos usados en dolares", getDashboardSummary().totalDollarPurchasePesos],
          ["Pesos en banco", getDashboardSummary().bankPesos],
          ["Dolares comprados", getDashboardSummary().totalDollarBoughtUnits],
          ["Dolares gastados", getDashboardSummary().totalDollarSpentUnits],
          ["Dolares en banco", getDashboardSummary().bankDollars],
          ["Balance", getDashboardSummary().balance],
          ["Perfumes vendidos", getDashboardSummary().totalSoldUnits],
          ["Perfumes comprados", getDashboardSummary().totalBoughtUnits],
        ],
      },
      {
        name: "Perfumes",
        rows: [
          ["Producto", "Marca", "Genero", "Perfil", "Etiquetas", "Fuente", "ML", "Costo", "Precio lista", "Transferencia / efectivo", "Tarjeta 1 cuota", "Tarjeta 2 cuotas", "Promo", "20% descuento", "Stock"],
          ...state.perfumes.map((item) => [
            item.name,
            item.brand || "",
            normalizePerfumeGender(item.gender),
            normalizeScentProfile(item.scentProfile),
            normalizeScentTags(item.scentTags, item.scentProfile).join(", "),
            item.infoSource || "",
            item.ml || "",
            item.cost || 0,
            item.price,
            getPaymentNet(item.price, "Transferencia"),
            getPaymentNet(item.price, "Tarjeta1"),
            getPaymentNet(item.price, "Tarjeta2"),
            getPaymentNet(item.price, "Promo"),
            getPaymentNet(item.price, "Descuento20"),
            item.stock,
          ]),
        ],
      },
      {
        name: "Ventas",
        rows: [
          ["Fecha", "Cliente", "Metodo", "Producto", "Cantidad", "Neto unitario", "Total pactado", "Pagado", "Pendiente", "Proximo vencimiento"],
          ...state.sales.flatMap((sale) =>
            sale.items.map((item, index) => [
              index === 0 ? sale.date : "",
              index === 0 ? sale.customer : "",
              index === 0 ? getPaymentLabel(sale.paymentMethod) : "",
              item.name,
              item.qty,
              item.unitNet || item.basePrice || 0,
              index === 0 ? getSaleAgreedTotal(sale) : "",
              index === 0 ? sale.total : "",
              index === 0 ? getSaleRemaining(sale) : "",
              index === 0 ? (getNextPendingPayment(sale)?.dueDate || "") : "",
            ])
          ),
        ],
      },
      {
        name: "Gastos",
        rows: [
          ["Fecha", "Detalle", "Categoria", "Monto", "Notas"],
          ...state.expenses.map((item) => [item.date, item.supplier, item.category, item.amount, item.notes]),
        ],
      },
      {
        name: "Banco",
        rows: [
          ["Fecha", "Tipo", "Pesos", "Precio dolar", "Dolares", "Detalle"],
          ...state.dollarPurchases.map((item) => [item.date, "Compra USD", item.pesosAmount, item.dollarPrice, item.dollarsAmount, item.notes]),
          ...state.dollarSpends.map((item) => [item.date, "Gasto USD", "", "", item.dollarsAmount, item.detail]),
          ...state.subscriptions.map((item) => [item.date, "Suscripcion", item.amount, "", "", item.detail]),
          ...state.bankIncomes.map((item) => [item.date, "Ingreso banco", item.amount, "", "", item.detail]),
          ...state.withdrawals.map((item) => [item.date, "Retiro", item.amount, "", "", item.detail]),
        ],
      },
    ],
  };

  const xml = buildExcelXml(workbook);
  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `perfumeria-export-${new Date().toISOString().slice(0, 10)}.xls`;
  link.click();
  URL.revokeObjectURL(link.href);
  showNotification("Excel exportado correctamente.");
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      hydrateState(data);
      saveState();
      renderAll();
      showNotification("Respaldo importado correctamente.");
    } catch (error) {
      showError("El archivo no tiene un formato valido.");
    } finally {
      refs.importInput.value = "";
    }
  };
  reader.readAsText(file);
}

async function clearAllData() {
  const confirmed = await confirmAction("Esto borra todos los datos guardados para esta cuenta. Quieres seguir?");
  if (!confirmed) return;
  state.perfumes = [];
  state.sales = [];
  state.expenses = [];
  state.subscriptions = [];
  state.bankIncomes = [];
  state.withdrawals = [];
  state.dollarPurchases = [];
  state.dollarSpends = [];
  state.draftSaleItems = [];
  state.history = normalizeHistory();
  Object.assign(priceFormulaState, normalizePriceFormula());
  saveState();
  renderAll();
  showNotification("Todos los datos se borraron correctamente.");
}

async function loadDemoData() {
  const confirmed = await confirmAction("Se van a cargar datos de ejemplo. Si ya tenes datos, primero exportalos por las dudas.");
  if (!confirmed) return;

  state.perfumes = [
    { id: crypto.randomUUID(), name: "Armaf Club de Nuit Iconic", brand: "Armaf", gender: "Masculino", scentProfile: "Fresco", scentTags: ["Fresco"], infoSource: getFragranticaSearchUrl({ name: "Armaf Club de Nuit Iconic", brand: "Armaf" }), infoSourceTitle: "Buscar en Fragrantica", infoUpdatedAt: new Date().toISOString(), ml: 105, cost: 69770, price: 95000, stock: 4, createdAt: new Date().toISOString() },
    { id: crypto.randomUUID(), name: "Lattafa Yara", brand: "Lattafa", gender: "Femenino", scentProfile: "Dulce", scentTags: ["Dulce"], infoSource: getFragranticaSearchUrl({ name: "Lattafa Yara", brand: "Lattafa" }), infoSourceTitle: "Buscar en Fragrantica", infoUpdatedAt: new Date().toISOString(), ml: 100, cost: 41760, price: 72000, stock: 6, createdAt: new Date().toISOString() },
    { id: crypto.randomUUID(), name: "Afnan 9PM", brand: "Afnan", gender: "Masculino", scentProfile: "Dulce", scentTags: ["Dulce"], infoSource: getFragranticaSearchUrl({ name: "Afnan 9PM", brand: "Afnan" }), infoSourceTitle: "Buscar en Fragrantica", infoUpdatedAt: new Date().toISOString(), ml: 100, cost: 52300, price: 68000, stock: 2, createdAt: new Date().toISOString() },
  ];

  state.sales = [
    {
      id: crypto.randomUUID(),
      customer: "jessi barbato",
      date: "2026-04-24",
      paymentMethod: "Transferencia",
      channel: "Instagram",
      items: [
        {
          id: crypto.randomUUID(),
          perfumeId: state.perfumes[0].id,
          name: state.perfumes[0].name,
          qty: 1,
          basePrice: state.perfumes[0].price,
          paymentMethod: "Transferencia",
          unitNet: getPaymentNet(state.perfumes[0].price, "Transferencia"),
        },
      ],
      grossTotal: state.perfumes[0].price,
      total: getPaymentNet(state.perfumes[0].price, "Transferencia"),
      createdAt: new Date().toISOString(),
    },
  ];

  state.expenses = [
    {
      id: crypto.randomUUID(),
      supplier: "Compra mayorista",
      category: "Reposicion",
      date: "2026-04-24",
      amount: 180000,
      notes: "Pedido semanal",
      createdAt: new Date().toISOString(),
    },
  ];

  state.subscriptions = [
    { id: crypto.randomUUID(), date: "2026-04-10", detail: "Canva Pro", amount: 15999, createdAt: new Date().toISOString() },
  ];

  state.bankIncomes = [
    { id: crypto.randomUUID(), date: "2026-04-30", detail: "Rendimiento banco", amount: 1250, createdAt: new Date().toISOString() },
  ];

  state.withdrawals = [
    { id: crypto.randomUUID(), date: "2026-04-12", detail: "Retiro Agus", amount: 100000, createdAt: new Date().toISOString() },
  ];

  state.dollarPurchases = [
    { id: crypto.randomUUID(), date: "2026-04-11", pesosAmount: 300000, dollarPrice: 1243.31, dollarsAmount: 241.05, notes: "Compra banco", createdAt: new Date().toISOString() },
  ];

  state.dollarSpends = [
    { id: crypto.randomUUID(), date: "2026-04-20", dollarsAmount: 125.11, detail: "Pago proveedor", createdAt: new Date().toISOString() },
  ];

  state.history = {
    salesAmount: 12985672,
    soldUnits: 184,
    expensesAmount: 8406308,
    initialInvestment: 3500000,
    boughtUnits: 197,
    subscriptionsAmount: 1055916.6,
    withdrawalsAmount: 200000,
    dollarPurchasePesos: 2800000,
    dollarBoughtUnits: 2196.63,
    dollarSpentUnits: 1238.57,
  };

  state.draftSaleItems = [];
  Object.assign(priceFormulaState, normalizePriceFormula());
  saveState();
  renderAll();
  showNotification("Datos de ejemplo cargados correctamente.");
}

function buildExcelXml(workbook) {
  const sheetXml = workbook.sheets
    .map((sheet) => {
      const rowsXml = sheet.rows
        .map((row) => {
          const cellsXml = row
            .map((cell) => {
              const { type, value } = getSpreadsheetCell(cell);
              return `<Cell><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
            })
            .join("");
          return `<Row>${cellsXml}</Row>`;
        })
        .join("");
      return `<Worksheet ss:Name="${escapeXml(sheet.name)}"><Table>${rowsXml}</Table></Worksheet>`;
    })
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  ${sheetXml}
</Workbook>`;
}

function getSpreadsheetCell(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { type: "Number", value: roundCurrency(value) };
  }
  return { type: "String", value: String(value ?? "") };
}

function renderSummaryDashboard() {
  const summary = getDashboardSummary();

  const stats = [
    { label: "Pesos en banco", value: formatCurrency(summary.bankPesos) },
    { label: "Dolares en banco", value: `${roundCurrency(summary.bankDollars)} USD` },
    { label: "Total vendido", value: formatCurrency(summary.totalSold) },
    { label: "Total gastado", value: formatCurrency(summary.totalSpent) },
    { label: "Inversion inicial", value: formatCurrency(summary.initialInvestment) },
    { label: "Suscripciones", value: formatCurrency(summary.totalSubscriptions) },
    { label: "Ingresos banco", value: formatCurrency(summary.totalBankIncomes) },
    { label: "Retiros", value: formatCurrency(summary.totalWithdrawals) },
    { label: "Balance", value: formatCurrency(summary.balance) },
    { label: "Cantidad total en stock", value: String(summary.totalStockUnits) },
    { label: "Perfumes vendidos", value: String(summary.totalSoldUnits) },
    { label: "Perfumes comprados", value: String(summary.totalBoughtUnits) },
  ];

  refs.statsGrid.innerHTML = stats
    .map((stat) => `
      <article class="stat-card">
        <h4>${escapeHtml(stat.label)}</h4>
        <strong>${escapeHtml(stat.value)}</strong>
      </article>
    `)
    .join("");

  const bankStats = [
    { label: "Inversion inicial", value: formatCurrency(summary.initialInvestment) },
    { label: "Total dolares comprados", value: `${roundCurrency(summary.totalDollarBoughtUnits)} USD` },
    { label: "Total dolares gastados", value: `${roundCurrency(summary.totalDollarSpentUnits)} USD` },
    { label: "Pesos usados en dolares", value: formatCurrency(summary.totalDollarPurchasePesos) },
    { label: "Total suscripciones", value: formatCurrency(summary.totalSubscriptions) },
    { label: "Ingresos del banco", value: formatCurrency(summary.totalBankIncomes) },
    { label: "Total retiros", value: formatCurrency(summary.totalWithdrawals) },
    { label: "Banco neto", value: formatCurrency(summary.bankPesos) },
  ];

  refs.bankStatsGrid.innerHTML = bankStats
    .map((stat) => `
      <article class="stat-card">
        <h4>${escapeHtml(stat.label)}</h4>
        <strong>${escapeHtml(stat.value)}</strong>
      </article>
    `)
    .join("");

  renderStackList(
    refs.lowStockList,
    state.perfumes
      .slice()
      .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name, "es"))
      .map((item) => ({
        title: item.name,
        subtitle: `${item.brand || "Sin marca"} · Stock actual: ${item.stock}`,
      })),
    "Todavia no cargaste perfumes."
  );

  renderStackList(
    refs.recentSales,
    getRecentSales(5).map((sale) => ({
      title: `${formatDate(sale.date)} · ${sale.customer || "Sin cliente"}`,
      subtitle: `${getPaymentLabel(sale.paymentMethod)} · ${formatCurrency(sale.total)}`,
    })),
    "Todavia no registraste ventas."
  );

  renderStackList(
    refs.pendingOrders,
    getRecentExpenses(5).map((expense) => ({
      title: `${formatDate(expense.date)} · ${expense.supplier || "Sin detalle"}`,
      subtitle: `${expense.category || "Gasto"} · ${formatCurrency(expense.amount)}`,
    })),
    "Todavia no registraste gastos."
  );
}

function renderAnalysis() {
  const summary = getDashboardSummary();
  const averageTicket = state.sales.length
    ? state.sales.reduce((sum, sale) => sum + (sale.total || 0), 0) / state.sales.length
    : 0;

  const analysisStats = [
    { label: "Ventas cargadas", value: String(state.sales.length) },
    { label: "Ticket promedio", value: formatCurrency(averageTicket) },
    { label: "Productos distintos", value: String(state.perfumes.length) },
    { label: "Cantidad total en stock", value: String(summary.totalStockUnits) },
    { label: "Productos con stock 0", value: String(state.perfumes.filter((item) => item.stock === 0).length) },
    { label: "Productos con stock 1", value: String(state.perfumes.filter((item) => item.stock === 1).length) },
  ];

  refs.analysisStatsGrid.innerHTML = analysisStats
    .map((stat) => `
      <article class="stat-card">
        <h4>${escapeHtml(stat.label)}</h4>
        <strong>${escapeHtml(stat.value)}</strong>
      </article>
    `)
    .join("");

  renderStackList(
    refs.topProducts,
    getTopProducts().map((item) => ({
      title: item.name,
      subtitle: `${item.qty} vendidos · ${formatCurrency(item.revenue)}`,
    })),
    "Todavia no hay ventas cargadas."
  );

  renderStackList(
    refs.topRevenueProducts,
    getTopRevenueProducts().map((item) => ({
      title: item.name,
      subtitle: `${formatCurrency(item.revenue)} cobrados · ${item.qty} unidades`,
    })),
    "Todavia no hay ventas cargadas."
  );

  renderStackList(
    refs.paymentBreakdown,
    getPaymentBreakdown().map((item) => ({
      title: item.label,
      subtitle: `${item.count} ventas · ${formatCurrency(item.total)}`,
    })),
    "Todavia no hay ventas cargadas."
  );

  renderStackList(
    refs.channelBreakdown,
    getChannelBreakdown().map((item) => ({
      title: item.channel,
      subtitle: `${item.count} ventas · ${formatCurrency(item.total)}`,
    })),
    "Todavia no hay canales cargados."
  );
}

function renderPriceCalculator() {
  refs.priceFormulaForm.baseExtra.value = priceFormulaState.baseExtra;
  refs.priceFormulaForm.markupMultiplier.value = priceFormulaState.markupMultiplier;
  refs.priceFormulaForm.markdownAmount.value = priceFormulaState.markdownAmount;
  refs.priceFormulaForm.promoDiscountPercent.value = priceFormulaState.promoDiscountPercent;

  refs.priceCalculatorTableBody.innerHTML = "";

  if (!state.perfumes.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="11">Todavia no cargaste perfumes para calcular precios.</td>`;
    refs.priceCalculatorTableBody.appendChild(row);
    return;
  }

  state.perfumes
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
    .forEach((perfume) => {
      const suggestedPrice = calculateSuggestedPrice(perfume.cost);
      const transferPrice = getPaymentNet(suggestedPrice, "Transferencia");
      const markdownPrice = getPromoPrice(suggestedPrice);
      const promoPrice = roundCurrency(suggestedPrice * (1 - priceFormulaState.promoDiscountPercent / 100));

      const row = document.createElement("tr");
      row.innerHTML = `
        <td data-label="Producto"><strong>${escapeHtml(perfume.name)}</strong></td>
        <td data-label="Marca">${escapeHtml(perfume.brand || "-")}</td>
        <td data-label="Costo">${formatCurrency(perfume.cost)}</td>
        <td data-label="Precio actual">${formatCurrency(perfume.price)}</td>
        <td data-label="Precio sugerido">${formatCurrency(suggestedPrice)}</td>
        <td data-label="Transferencia">${formatCurrency(transferPrice)}</td>
        <td data-label="Rebajado">${formatCurrency(markdownPrice)}</td>
        <td data-label="Promo 20%">${formatCurrency(promoPrice)}</td>
        <td data-label="Ganancia">${formatCurrency(suggestedPrice - (perfume.cost || 0))}</td>
        <td data-label="Ganancia transf.">${formatCurrency(transferPrice - (perfume.cost || 0))}</td>
        <td data-label="Ganancia promo">${formatCurrency(promoPrice - (perfume.cost || 0))}</td>
      `;
      refs.priceCalculatorTableBody.appendChild(row);
    });
}

function getTopProducts() {
  const salesMap = {};
  state.sales.forEach((sale) => {
    sale.items.forEach((item) => {
      if (!salesMap[item.name]) {
        salesMap[item.name] = { name: item.name, qty: 0, revenue: 0 };
      }
      salesMap[item.name].qty += item.qty;
      salesMap[item.name].revenue += (item.unitNet || item.basePrice || 0) * item.qty;
    });
  });

  return Object.values(salesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
}

function calculateSuggestedPrice(cost) {
  return roundToThousands((Number(cost) + priceFormulaState.baseExtra) * priceFormulaState.markupMultiplier);
}

function roundToThousands(value) {
  return Math.round((Number(value) || 0) / 1000) * 1000;
}

function getTopRevenueProducts() {
  return getTopProducts()
    .slice()
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}

function getPaymentBreakdown() {
  const paymentMap = {};
  state.sales.forEach((sale) => {
    const key = sale.paymentMethod || "Transferencia";
    if (!paymentMap[key]) {
      paymentMap[key] = { label: getPaymentLabel(key), count: 0, total: 0 };
    }
    paymentMap[key].count += 1;
    paymentMap[key].total += sale.total || 0;
  });

  return Object.values(paymentMap).sort((a, b) => b.total - a.total);
}

function getChannelBreakdown() {
  const channelMap = {};
  state.sales.forEach((sale) => {
    const key = (sale.channel || "Sin canal").trim() || "Sin canal";
    if (!channelMap[key]) {
      channelMap[key] = { channel: key, count: 0, total: 0 };
    }
    channelMap[key].count += 1;
    channelMap[key].total += sale.total || 0;
  });

  return Object.values(channelMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

function getRecentSales(limit = 5) {
  return state.sales
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}

function getRecentExpenses(limit = 5) {
  return state.expenses
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}

function getDashboardSummary() {
  const totalSold = state.sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
  const totalSpent = state.expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
  const initialInvestment = state.history.initialInvestment;
  const totalSubscriptions = state.subscriptions.reduce((sum, item) => sum + (item.amount || 0), 0) + state.history.subscriptionsAmount;
  const totalBankIncomes = state.bankIncomes.reduce((sum, item) => sum + (item.amount || 0), 0) + state.history.bankIncomesAmount;
  const totalWithdrawals = state.withdrawals.reduce((sum, item) => sum + (item.amount || 0), 0) + state.history.withdrawalsAmount;
  const totalDollarPurchasePesos = state.dollarPurchases.reduce((sum, item) => sum + (item.pesosAmount || 0), 0) + state.history.dollarPurchasePesos;
  const totalDollarBoughtUnits = state.dollarPurchases.reduce((sum, item) => sum + (item.dollarsAmount || 0), 0) + state.history.dollarBoughtUnits;
  const totalDollarSpentUnits = state.dollarSpends.reduce((sum, item) => sum + (item.dollarsAmount || 0), 0) + state.history.dollarSpentUnits;
  const totalStockUnits = state.perfumes.reduce((sum, item) => sum + (item.stock || 0), 0);
  const currentSoldUnits = state.sales.reduce(
    (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + (item.qty || 0), 0),
    0
  );
  const bankPesos = totalSold + state.history.salesAmount + initialInvestment + totalBankIncomes - totalSpent - state.history.expensesAmount - totalSubscriptions - totalWithdrawals - totalDollarPurchasePesos;
  const bankDollars = totalDollarBoughtUnits - totalDollarSpentUnits;

  return {
    totalSold: totalSold + state.history.salesAmount,
    totalSpent: totalSpent + state.history.expensesAmount,
    initialInvestment,
    totalSubscriptions,
    totalBankIncomes,
    totalWithdrawals,
    totalDollarPurchasePesos,
    totalDollarBoughtUnits,
    totalDollarSpentUnits,
    totalStockUnits,
    totalSoldUnits: currentSoldUnits + state.history.soldUnits,
    totalBoughtUnits: state.history.boughtUnits,
    bankPesos,
    bankDollars,
    balance: totalSold + state.history.salesAmount + totalBankIncomes - totalSpent - state.history.expensesAmount,
  };
}

function getPaymentsPaidTotal(payments = []) {
  return roundCurrency(payments.reduce((sum, payment) => (
    payment.paid ? sum + (Number(payment.amount) || 0) : sum
  ), 0));
}

function getSalePayments(sale) {
  if (Array.isArray(sale.payments) && sale.payments.length) return sale.payments;
  return normalizeSalePayments(sale, getSaleAgreedTotal(sale), sale.date || new Date().toISOString().slice(0, 10));
}

function getSaleAgreedTotal(sale) {
  return Number(sale.agreedTotal) || Number(sale.total) || 0;
}

function getSaleRemaining(sale) {
  return roundCurrency(Math.max(0, getSaleAgreedTotal(sale) - (Number(sale.total) || 0)));
}

function addMonthsToDate(value, months) {
  const base = value ? new Date(`${value}T00:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) return new Date().toISOString().slice(0, 10);
  const day = base.getDate();
  const result = new Date(base);
  result.setMonth(result.getMonth() + months);
  if (result.getDate() !== day) result.setDate(0);
  return result.toISOString().slice(0, 10);
}

function getPaymentLabel(methodKey) {
  return PAYMENT_METHODS[methodKey]?.label || methodKey || "-";
}

function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function normalizePerfumeGender(value) {
  const normalized = normalizeText(value);
  return PERFUME_GENDER_OPTIONS.find((option) => normalizeText(option) === normalized) || "Sin clasificar";
}

function normalizeScentProfile(value) {
  const normalized = normalizeText(value);
  return PERFUME_PROFILE_OPTIONS.find((option) => normalizeText(option) === normalized) || "Sin clasificar";
}

function normalizeScentTags(tags, fallback) {
  const values = Array.isArray(tags) ? tags : [];
  const normalizedTags = values
    .map(normalizeScentProfile)
    .filter((tag) => tag !== "Sin clasificar")
    .filter((tag, index, allTags) => allTags.indexOf(tag) === index);
  const normalizedFallback = normalizeScentProfile(fallback);
  if (normalizedFallback !== "Sin clasificar" && !normalizedTags.includes(normalizedFallback)) {
    normalizedTags.unshift(normalizedFallback);
  }
  return normalizedTags;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("es-AR").format(date);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
