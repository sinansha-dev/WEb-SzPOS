/* ==========================================================================
   szPOS SYSTEM — ADVANCED TERMINAL LOGIC & GRAPHICAL CORE ENGINE
   ========================================================================== */

// 1. Initial High Fidelity Product Database Model
const INITIAL_PRODUCTS = [
  { id: 1, name: "Chocolate Cream Cake", category: "Bakery", price: 60.00, stock: 12, maxStock: 20, code: "CC" },
  { id: 2, name: "Espresso Coffee", category: "Beverages", price: 30.00, stock: 18, maxStock: 25, code: "EC" },
  { id: 3, name: "Mango Malai Shake", category: "Snacks", price: 80.00, stock: 8, maxStock: 15, code: "MM" },
  { id: 4, name: "Strawberry Juice", category: "Beverages", price: 60.00, stock: 15, maxStock: 20, code: "SJ" },
  { id: 5, name: "Blueberry Glazed Muffin", category: "Bakery", price: 90.00, stock: 5, maxStock: 10, code: "BM" },
  { id: 6, name: "Premium Masala Chai", category: "Beverages", price: 20.00, stock: 25, maxStock: 35, code: "MC" },
  { id: 7, name: "Grilled Cheese Sandwich", category: "Snacks", price: 70.00, stock: 10, maxStock: 15, code: "CS" },
  { id: 8, name: "Spiced Paneer Puff", category: "Bakery", price: 45.00, stock: 0, maxStock: 12, code: "PP" } // Out of Stock
];

// 2. Core Terminal Application State Management
const szState = {
  products: [...INITIAL_PRODUCTS],
  cart: [],             // Collection: { productId: Number, qty: Number }
  sales: [],            // Session completed sales ledger
  activeTab: 'pos',     // 'pos' | 'inventory' | 'analytics'
  searchQuery: '',
  activeCategory: 'All',
  appliedPromo: null,   // { code: String, percent: Number }
  isOnline: true,
  syncQueue: 0          // Buffers sales spooled while in offline terminal mode
};

// Available Promotion Codes
const PROMO_CODES = {
  "WELCOME10": 10,
  "FUTURISTIC": 20,
  "BIGRETAIL": 15
};

// 3. UI Element Bindings
const DOM = {
  tabs: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  
  // POS Billing Elements
  searchBox: document.getElementById('pos-search'),
  searchClearBtn: document.getElementById('search-clear'),
  categoryChipsWrap: document.getElementById('category-chips'),
  productGrid: document.getElementById('pos-product-grid'),
  cartContainer: document.getElementById('cart-container'),
  catalogCountBadge: document.getElementById('catalog-count'),
  cartCountBadge: document.getElementById('cart-count'),
  
  // Checkout Elements
  customerNameInput: document.getElementById('customer-name'),
  discountCodeInput: document.getElementById('discount-code'),
  applyPromoBtn: document.getElementById('apply-promo'),
  promoStatusLabel: document.getElementById('promo-status'),
  subtotalField: document.getElementById('summary-subtotal'),
  discountRow: document.getElementById('discount-row'),
  discountPercentageLabel: document.getElementById('discount-percentage'),
  discountValueField: document.getElementById('summary-discount'),
  taxField: document.getElementById('summary-tax'),
  totalField: document.getElementById('summary-total'),
  
  // Payment triggers
  payCashBtn: document.getElementById('btn-pay-cash'),
  payUpiBtn: document.getElementById('btn-pay-upi'),
  payCardBtn: document.getElementById('btn-pay-card'),
  
  // Network simulation controls
  networkToggle: document.getElementById('network-toggle'),
  networkStatusLabel: document.getElementById('network-status-text'),
  syncBtn: document.getElementById('btn-manual-sync'),
  syncIcon: document.getElementById('sync-icon-spin'),
  syncText: document.getElementById('sync-btn-text'),
  
  // Inventory Elements
  inventoryTableBody: document.getElementById('inventory-table-body'),
  lowStockBadge: document.getElementById('low-stock-alert-badge'),
  addProductForm: document.getElementById('add-product-form'),
  
  // Analytics Elements
  kpiRevenue: document.getElementById('kpi-revenue'),
  kpiSalesCount: document.getElementById('kpi-sales-count'),
  kpiAov: document.getElementById('kpi-aov'),
  kpiItemsSold: document.getElementById('kpi-items-sold'),
  trendChartWrapper: document.getElementById('trend-chart-wrapper'),
  donutChartWrapper: document.getElementById('donut-chart-wrapper'),
  ledgerTableBody: document.getElementById('ledger-table-body'),
  ledgerEmptyState: document.getElementById('ledger-empty-state'),
  
  // Receipts Emulation Elements
  receiptModal: document.getElementById('receipt-modal'),
  receiptPaper: document.getElementById('receipt-paper'),
  recInvNo: document.getElementById('rec-inv-no'),
  recDate: document.getElementById('rec-date'),
  recCustomer: document.getElementById('rec-customer'),
  recItemsList: document.getElementById('rec-items-list'),
  recSubtotal: document.getElementById('rec-subtotal'),
  recDiscountRow: document.getElementById('rec-discount-row'),
  recDiscount: document.getElementById('rec-discount'),
  recTax: document.getElementById('rec-tax'),
  recTotal: document.getElementById('rec-total'),
  recPaymentMethod: document.getElementById('rec-payment-method'),
  btnPrintReceipt: document.getElementById('btn-print-receipt'),
  btnCloseReceipt: document.getElementById('btn-close-receipt'),
  
  // Alerts Container
  toastContainer: document.getElementById('toast-container')
};

// ==========================================================================
// 4. TAB & CATEGORY Pill ROUTERS
// ==========================================================================

function initTabControls() {
  DOM.tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      DOM.tabs.forEach(t => t.classList.remove('active'));
      DOM.tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const targetTab = btn.getAttribute('data-tab');
      szState.activeTab = targetTab;
      
      const targetContent = document.getElementById(`tab-${targetTab}`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
      
      // Perform focused render actions based on tab
      if (targetTab === 'inventory') {
        renderInventoryTab();
      } else if (targetTab === 'analytics') {
        renderAnalyticsTab();
      } else if (targetTab === 'pos') {
        renderProductCatalog();
      }
    });
  });
}

function initCategoryChips() {
  // Deduplicate categories from active state products
  const categories = ['All', ...new Set(szState.products.map(p => p.category))];
  DOM.categoryChipsWrap.innerHTML = '';
  
  categories.forEach(cat => {
    const chip = document.createElement('span');
    chip.className = `chip ${szState.activeCategory === cat ? 'active' : ''}`;
    chip.setAttribute('data-cat', cat);
    chip.textContent = cat;
    
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      szState.activeCategory = cat;
      renderProductCatalog();
    });
    DOM.categoryChipsWrap.appendChild(chip);
  });
}

// ==========================================================================
// 5. TOAST NOTIFICATION UTILITY SYSTEM
// ==========================================================================

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '⚡';
  if (type === 'success') icon = '🟢';
  else if (type === 'error') icon = '🔴';
  else if (type === 'warning') icon = '⚠️';
  else if (type === 'info') icon = 'ℹ️';
  
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" aria-label="Dismiss">×</button>
  `;
  
  DOM.toastContainer.appendChild(toast);
  
  // Force visual repaint before adding class to animate slide-in
  toast.offsetHeight;
  toast.classList.add('show');
  
  const dismissToast = () => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove());
  };
  
  toast.querySelector('.toast-close').addEventListener('click', dismissToast);
  
  // Auto destruct after 3.8s
  setTimeout(dismissToast, 3800);
}

// ==========================================================================
// 6. POS CORE CATALOG & SHOPPING CART RENDERING
// ==========================================================================

function renderProductCatalog() {
  DOM.productGrid.innerHTML = '';
  
  // Filter products by search matching AND category choice
  const filtered = szState.products.filter(p => {
    const matchesCat = szState.activeCategory === 'All' || p.category === szState.activeCategory;
    const cleanSearch = szState.searchQuery.trim().toLowerCase();
    const matchesSearch = cleanSearch === '' || 
                          p.name.toLowerCase().includes(cleanSearch) || 
                          p.code.toLowerCase().includes(cleanSearch);
    return matchesCat && matchesSearch;
  });
  
  // Update UI indicators
  DOM.catalogCountBadge.textContent = `${filtered.length} Items`;
  
  if (filtered.length === 0) {
    DOM.productGrid.innerHTML = `
      <div style="grid-column: span 2; text-align:center; padding: 3rem 1rem; color: var(--text-muted);">
        <p style="font-size:1.4rem;">🔍</p>
        <p style="font-weight:600; margin-top:0.4rem;">No matching products found</p>
        <small>Try broadening your query terms.</small>
      </div>
    `;
    return;
  }
  
  filtered.forEach(p => {
    const card = document.createElement('div');
    const isOutOfStock = p.stock <= 0;
    
    // Check if item is already added to cart to render specialized counters
    const cartItem = szState.cart.find(c => c.productId === p.id);
    const inCartQty = cartItem ? cartItem.qty : 0;
    
    card.className = `p-card ${inCartQty > 0 ? 'selected' : ''} ${isOutOfStock ? 'out-of-stock' : ''}`;
    
    // Determine Stock levels for visual warnings
    let stockBadgeHTML = '';
    if (isOutOfStock) {
      stockBadgeHTML = `<span class="stock-badge out">SOLD OUT</span>`;
    } else if (p.stock < 5) {
      stockBadgeHTML = `<span class="stock-badge low">LOW: ${p.stock}</span>`;
    } else {
      stockBadgeHTML = `<span class="stock-badge ok">In Stock: ${p.stock}</span>`;
    }
    
    card.innerHTML = `
      ${inCartQty > 0 ? `<div class="p-selected-badge">${inCartQty}</div>` : ''}
      <div class="p-thumb">${p.code}</div>
      <div class="p-info">
        <h4>${p.name}</h4>
        <div style="display:flex; gap: 0.4rem; align-items:center; margin-top:0.15rem;">
          ${stockBadgeHTML}
          <span style="font-size:0.7rem; color:var(--text-muted); font-weight:600;">${p.category}</span>
        </div>
      </div>
      <div class="p-card-footer">
        <span class="p-price">₹${p.price.toFixed(2)}</span>
        <button class="p-add-btn" aria-label="Add to cart">+</button>
      </div>
    `;
    
    // Event bindings: Clicking anywhere on card adds/increments item
    card.addEventListener('click', (e) => {
      if (isOutOfStock) return;
      
      // Stop button bubbling to trigger cart increment twice
      if (e.target.classList.contains('p-add-btn')) {
        e.stopPropagation();
      }
      
      addToCart(p.id);
    });
    
    DOM.productGrid.appendChild(card);
  });
}

function addToCart(productId) {
  const product = szState.products.find(p => p.id === productId);
  if (!product) return;
  
  if (product.stock <= 0) {
    showToast(`Sorry, ${product.name} is currently out of stock!`, 'error');
    return;
  }
  
  const existing = szState.cart.find(c => c.productId === productId);
  
  if (existing) {
    if (existing.qty >= product.stock) {
      showToast(`Only ${product.stock} items of ${product.name} are available in stock.`, 'warning');
      return;
    }
    existing.qty++;
  } else {
    szState.cart.push({ productId, qty: 1 });
  }
  
  showToast(`Added ${product.name} to cart.`, 'success');
  renderCart();
  renderProductCatalog();
}

function renderCart() {
  DOM.cartContainer.innerHTML = '';
  
  const totalItemCount = szState.cart.reduce((sum, item) => sum + item.qty, 0);
  DOM.cartCountBadge.textContent = `${totalItemCount} ${totalItemCount === 1 ? 'item' : 'items'}`;
  
  if (szState.cart.length === 0) {
    DOM.cartContainer.innerHTML = `
      <div class="empty-cart">
        <div class="empty-icon">🛒</div>
        <p>Shopping Cart is Empty</p>
        <small>Click on items in the product catalog on the left to start billing.</small>
      </div>
    `;
    updateTotals(0);
    return;
  }
  
  szState.cart.forEach(item => {
    const product = szState.products.find(p => p.id === item.productId);
    if (!product) return;
    
    const cartRow = document.createElement('div');
    cartRow.className = 'cart-item';
    
    cartRow.innerHTML = `
      <div class="p-thumb" style="width:36px; height:36px; font-size:0.85rem;">${product.code}</div>
      <div class="cart-item-info">
        <h4>${product.name}</h4>
        <span class="cart-item-price">₹${(product.price * item.qty).toFixed(2)}</span>
      </div>
      <div class="cart-quantity-row">
        <button class="qty-btn dec" aria-label="Decrease quantity">-</button>
        <span class="qty-val">${item.qty}</span>
        <button class="qty-btn inc" aria-label="Increase quantity">+</button>
        <button class="cart-delete-btn" aria-label="Remove item">🗑️</button>
      </div>
    `;
    
    // Bind Qty adjusters & deletes
    cartRow.querySelector('.dec').addEventListener('click', () => adjustQty(item.productId, -1));
    cartRow.querySelector('.inc').addEventListener('click', () => adjustQty(item.productId, 1));
    cartRow.querySelector('.cart-delete-btn').addEventListener('click', () => removeFromCart(item.productId));
    
    DOM.cartContainer.appendChild(cartRow);
  });
  
  const subtotal = szState.cart.reduce((sum, item) => {
    const product = szState.products.find(p => p.id === item.productId);
    return sum + (product ? product.price * item.qty : 0);
  }, 0);
  
  updateTotals(subtotal);
}

function adjustQty(productId, amount) {
  const cartItem = szState.cart.find(c => c.productId === productId);
  if (!cartItem) return;
  
  const product = szState.products.find(p => p.id === productId);
  
  if (amount > 0) {
    if (cartItem.qty >= product.stock) {
      showToast(`Cannot add more. Limit reached for remaining stock (${product.stock}).`, 'warning');
      return;
    }
    cartItem.qty++;
  } else {
    cartItem.qty--;
    if (cartItem.qty <= 0) {
      removeFromCart(productId);
      return;
    }
  }
  
  renderCart();
  renderProductCatalog();
}

function removeFromCart(productId) {
  const index = szState.cart.findIndex(c => c.productId === productId);
  if (index !== -1) {
    const product = szState.products.find(p => p.id === productId);
    szState.cart.splice(index, 1);
    if (product) {
      showToast(`Removed ${product.name} from cart.`, 'info');
    }
    renderCart();
    renderProductCatalog();
  }
}

// ==========================================================================
// 7. PRICING CALCULATIONS & DYNAMIC PROMO ENGINE
// ==========================================================================

function updateTotals(subtotal) {
  let discountVal = 0;
  
  if (szState.appliedPromo && subtotal > 0) {
    discountVal = subtotal * (szState.appliedPromo.percent / 100);
    DOM.discountRow.style.display = 'flex';
    DOM.discountPercentageLabel.textContent = szState.appliedPromo.percent;
    DOM.discountValueField.textContent = `-₹${discountVal.toFixed(2)}`;
  } else {
    DOM.discountRow.style.display = 'none';
  }
  
  const netBeforeTax = subtotal - discountVal;
  const taxVal = netBeforeTax * 0.18; // 18% GST
  const grandTotal = netBeforeTax + taxVal;
  
  DOM.subtotalField.textContent = `₹${subtotal.toFixed(2)}`;
  DOM.taxField.textContent = `₹${taxVal.toFixed(2)}`;
  DOM.totalField.textContent = `₹${grandTotal.toFixed(2)}`;
}

function initPromos() {
  DOM.applyPromoBtn.addEventListener('click', () => {
    const code = DOM.discountCodeInput.value.trim().toUpperCase();
    
    if (code === '') {
      szState.appliedPromo = null;
      DOM.promoStatusLabel.className = 'promo-status';
      DOM.promoStatusLabel.textContent = '';
      renderCart();
      return;
    }
    
    if (PROMO_CODES.hasOwnProperty(code)) {
      const discountPercent = PROMO_CODES[code];
      szState.appliedPromo = { code: code, percent: discountPercent };
      
      DOM.promoStatusLabel.className = 'promo-status success';
      DOM.promoStatusLabel.textContent = `✓ Promo ${code} Applied! (${discountPercent}% Off)`;
      showToast(`Promo ${code} applied successfully.`, 'success');
      renderCart();
    } else {
      szState.appliedPromo = null;
      DOM.promoStatusLabel.className = 'promo-status error';
      DOM.promoStatusLabel.textContent = '✗ Invalid Promotion Code';
      showToast('Entered promo code is invalid.', 'error');
      renderCart();
    }
  });
}

// ==========================================================================
// 8. CHECKOUT EXECUTION & THERMAL RECEIPT DISPLAY
// ==========================================================================

function initCheckoutListeners() {
  DOM.payCashBtn.addEventListener('click', () => executeCheckout('CASH'));
  DOM.payUpiBtn.addEventListener('click', () => executeCheckout('UPI'));
  DOM.payCardBtn.addEventListener('click', () => executeCheckout('CARD'));
}

function executeCheckout(method) {
  if (szState.cart.length === 0) {
    showToast("Transaction aborted. The checkout cart is empty!", "error");
    return;
  }
  
  // double check inventory levels before billing
  for (const item of szState.cart) {
    const product = szState.products.find(p => p.id === item.productId);
    if (!product || product.stock < item.qty) {
      showToast(`Checkout failed. Stock for ${product ? product.name : 'Unknown'} was depleted!`, 'error');
      return;
    }
  }
  
  // 1. Decrement Store Inventory stocks
  szState.cart.forEach(item => {
    const product = szState.products.find(p => p.id === item.productId);
    product.stock -= item.qty;
  });
  
  // 2. Perform financial calculations
  const subtotal = szState.cart.reduce((sum, item) => {
    const product = szState.products.find(p => p.id === item.productId);
    return sum + (product ? product.price * item.qty : 0);
  }, 0);
  
  const discountVal = szState.appliedPromo ? subtotal * (szState.appliedPromo.percent / 100) : 0;
  const netBeforeTax = subtotal - discountVal;
  const taxVal = netBeforeTax * 0.18;
  const grandTotal = netBeforeTax + taxVal;
  
  const invoiceId = `INV-${Math.floor(10000 + Math.random() * 90000)}`;
  const timestamp = new Date().toLocaleString();
  const customer = DOM.customerNameInput.value.trim() || 'Walk-in Customer';
  
  // 3. Compile Transaction metadata
  const completedSale = {
    id: invoiceId,
    timestamp: timestamp,
    customerName: customer,
    items: szState.cart.map(item => {
      const product = szState.products.find(p => p.id === item.productId);
      return {
        name: product.name,
        price: product.price,
        qty: item.qty
      };
    }),
    subtotal: subtotal,
    discount: discountVal,
    tax: taxVal,
    total: grandTotal,
    method: method
  };
  
  szState.sales.push(completedSale);
  
  // Trigger Offline Queue calculations
  if (!szState.isOnline) {
    szState.syncQueue++;
    DOM.syncBtn.style.display = 'flex';
    DOM.syncBtn.classList.add('pulse');
    DOM.syncText.textContent = `Sync Spool (${szState.syncQueue})`;
    showToast(`Saved locally! Invoice spooled in offline queue.`, 'warning');
  } else {
    showToast(`Payment processed successfully via ${method}!`, 'success');
  }
  
  // 4. Fire Thermal Receipt Emulator
  openReceiptEmulator(completedSale);
  
  // 5. Clean state fields
  szState.cart = [];
  szState.appliedPromo = null;
  DOM.customerNameInput.value = '';
  DOM.discountCodeInput.value = '';
  DOM.promoStatusLabel.textContent = '';
  
  // 6. Refresh Billing workstations
  renderCart();
  renderProductCatalog();
}

function openReceiptEmulator(sale) {
  DOM.recInvNo.textContent = sale.id;
  DOM.recDate.textContent = sale.timestamp;
  DOM.recCustomer.textContent = sale.customerName;
  
  DOM.recItemsList.innerHTML = '';
  sale.items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'rec-item';
    row.innerHTML = `
      <span class="rec-item-name">${item.name}</span>
      <span class="rec-item-math">${item.qty} x ₹${item.price.toFixed(2)}</span>
    `;
    DOM.recItemsList.appendChild(row);
  });
  
  DOM.recSubtotal.textContent = `₹${sale.subtotal.toFixed(2)}`;
  
  if (sale.discount > 0) {
    DOM.recDiscountRow.style.display = 'flex';
    DOM.recDiscount.textContent = `-₹${sale.discount.toFixed(2)}`;
  } else {
    DOM.recDiscountRow.style.display = 'none';
  }
  
  DOM.recTax.textContent = `₹${sale.tax.toFixed(2)}`;
  DOM.recTotal.textContent = `₹${sale.total.toFixed(2)}`;
  DOM.recPaymentMethod.textContent = sale.method;
  
  DOM.receiptModal.classList.add('open');
}

function initReceiptActions() {
  DOM.btnCloseReceipt.addEventListener('click', () => {
    DOM.receiptModal.classList.remove('open');
  });
  
  DOM.btnPrintReceipt.addEventListener('click', () => {
    window.print();
  });
  
  // Click outside to close modal
  DOM.receiptModal.addEventListener('click', (e) => {
    if (e.target === DOM.receiptModal) {
      DOM.receiptModal.classList.remove('open');
    }
  });
}

// ==========================================================================
// 9. NETWORK SIMULATION & MANUAL SYNC SPOOLER
// ==========================================================================

function initNetworkToggle() {
  DOM.networkToggle.addEventListener('click', () => {
    szState.isOnline = !szState.isOnline;
    
    const indicator = DOM.networkToggle.querySelector('.status-indicator');
    
    if (szState.isOnline) {
      indicator.className = 'status-indicator online';
      DOM.networkStatusLabel.textContent = 'Online Terminal';
      showToast("Terminal online. Auto-synchronizing active.", "info");
      
      // Auto flush queue if online restored
      if (szState.syncQueue > 0) {
        triggerSyncSpool();
      }
    } else {
      indicator.className = 'status-indicator offline';
      DOM.networkStatusLabel.textContent = 'Offline Terminal';
      showToast("Terminal switched to Offline Mode.", "warning");
    }
  });
  
  DOM.syncBtn.addEventListener('click', () => {
    if (szState.syncQueue === 0) {
      showToast("Spooler queue is empty. No pending local records.", "info");
      return;
    }
    triggerSyncSpool();
  });
}

function triggerSyncSpool() {
  DOM.syncIcon.classList.add('sync-spin-animation');
  DOM.syncBtn.disabled = true;
  DOM.syncText.textContent = "Uploading sales...";
  
  // Simulate network roundtrip latency
  setTimeout(() => {
    DOM.syncIcon.classList.remove('sync-spin-animation');
    DOM.syncBtn.disabled = false;
    
    showToast(`Successfully synced ${szState.syncQueue} spooled logs to cloud registry!`, 'success');
    szState.syncQueue = 0;
    DOM.syncBtn.style.display = 'none';
    
    // Render analytics just in case they were looking at it
    if (szState.activeTab === 'analytics') {
      renderAnalyticsTab();
    }
  }, 1600);
}

// ==========================================================================
// 10. TAB 2: INVENTORY & STOCK MANAGER RENDER
// ==========================================================================

function renderInventoryTab() {
  DOM.inventoryTableBody.innerHTML = '';
  
  szState.products.forEach(p => {
    const row = document.createElement('tr');
    
    // Calculate stock levels percentages
    const percent = Math.min(100, Math.floor((p.stock / p.maxStock) * 100));
    
    let colorClass = 'green';
    if (p.stock <= 0) colorClass = 'red';
    else if (p.stock < 5) colorClass = 'amber';
    
    row.innerHTML = `
      <td><span class="sku-badge">${p.code}</span></td>
      <td style="font-weight:600;">${p.name}</td>
      <td>${p.category}</td>
      <td class="text-right" style="font-weight:700; color: var(--cyan-glow);">₹${p.price.toFixed(2)}</td>
      <td>
        <div class="stock-progress-wrap">
          <div class="stock-meta-row">
            <span style="color: ${p.stock <= 0 ? 'var(--danger)' : p.stock < 5 ? 'var(--warning)' : 'var(--success)'}; font-weight:700;">
              ${p.stock} units
            </span>
            <span style="opacity:0.65;">Max: ${p.maxStock}</span>
          </div>
          <div class="stock-progress-bar">
            <div class="stock-progress-fill ${colorClass}" style="width: ${percent}%;"></div>
          </div>
        </div>
      </td>
      <td class="text-center">
        <div class="restock-input-group">
          <input type="number" class="restock-qty-input" min="1" max="100" value="5" data-id="${p.id}" aria-label="Restock quantity" />
          <button class="btn-restock-action" data-id="${p.id}">Restock</button>
        </div>
      </td>
    `;
    
    // Bind click trigger for restocking
    row.querySelector('.btn-restock-action').addEventListener('click', () => {
      const input = row.querySelector('.restock-qty-input');
      const qty = parseInt(input.value) || 0;
      executeRestock(p.id, qty);
    });
    
    DOM.inventoryTableBody.appendChild(row);
  });
  
  // Render low stock warning badges
  const lowCount = szState.products.filter(p => p.stock < 5).length;
  if (lowCount > 0) {
    DOM.lowStockBadge.textContent = `⚠️ ${lowCount} ${lowCount === 1 ? 'item is' : 'items are'} low on stock`;
    DOM.lowStockBadge.style.display = 'inline-block';
  } else {
    DOM.lowStockBadge.style.display = 'none';
  }
}

function executeRestock(productId, qty) {
  if (qty <= 0) {
    showToast("Restock quantities must be greater than zero.", "error");
    return;
  }
  
  const product = szState.products.find(p => p.id === productId);
  if (product) {
    product.stock += qty;
    // Boost maxStock threshold if stock overflows
    if (product.stock > product.maxStock) {
      product.maxStock = product.stock;
    }
    showToast(`Restocked ${qty} units of ${product.name}!`, 'success');
    renderInventoryTab();
  }
}

function initAddProductForm() {
  DOM.addProductForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('new-product-name').value.trim();
    const category = document.getElementById('new-product-category').value;
    const code = document.getElementById('new-product-code').value.trim().toUpperCase();
    const price = parseFloat(document.getElementById('new-product-price').value) || 0;
    const stock = parseInt(document.getElementById('new-product-stock').value) || 0;
    
    // Validate duplicates SKU
    if (szState.products.some(p => p.code === code)) {
      showToast(`A product with SKU Code "${code}" already exists!`, 'error');
      return;
    }
    
    const newId = szState.products.length > 0 ? Math.max(...szState.products.map(p => p.id)) + 1 : 1;
    
    const newProduct = {
      id: newId,
      name: name,
      category: category,
      price: price,
      stock: stock,
      maxStock: stock > 10 ? stock : 15,
      code: code
    };
    
    szState.products.push(newProduct);
    showToast(`Successfully added "${name}" to product catalog!`, 'success');
    
    // Reset fields
    DOM.addProductForm.reset();
    
    // Refresh lists
    initCategoryChips();
    renderInventoryTab();
  });
}

// ==========================================================================
// 11. TAB 3: DYNAMIC METRICS SUMMARY & DYNAMIC SVG CHARTING
// ==========================================================================

function renderAnalyticsTab() {
  const completedSalesCount = szState.sales.length;
  
  // 1. Calculate KPI Values
  const grossRevenue = szState.sales.reduce((sum, s) => sum + s.total, 0);
  const itemsSold = szState.sales.reduce((sum, s) => {
    return sum + s.items.reduce((iSum, i) => iSum + i.qty, 0);
  }, 0);
  const aov = completedSalesCount > 0 ? grossRevenue / completedSalesCount : 0;
  
  DOM.kpiRevenue.textContent = `₹${grossRevenue.toFixed(2)}`;
  DOM.kpiSalesCount.textContent = completedSalesCount;
  DOM.kpiAov.textContent = `₹${aov.toFixed(2)}`;
  DOM.kpiItemsSold.textContent = itemsSold;
  
  // 2. Render Invoices Audit trail
  DOM.ledgerTableBody.innerHTML = '';
  
  if (completedSalesCount === 0) {
    DOM.ledgerEmptyState.style.display = 'table-row';
  } else {
    DOM.ledgerEmptyState.style.display = 'none';
    
    // Render descending (newest first)
    [...szState.sales].reverse().forEach(sale => {
      const row = document.createElement('tr');
      const itemsSummaryText = sale.items.map(i => `${i.name} (${i.qty})`).join(', ');
      
      let payClass = 'cash';
      if (sale.method === 'UPI') payClass = 'upi';
      else if (sale.method === 'CARD') payClass = 'card';
      
      row.innerHTML = `
        <td><span class="invoice-code">${sale.id}</span></td>
        <td style="font-size:0.75rem; white-space:nowrap;">${sale.timestamp.split(', ')[1] || sale.timestamp}</td>
        <td style="font-weight:600;">${sale.customerName}</td>
        <td style="font-size:0.8rem; opacity:0.8; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${itemsSummaryText}">
          ${itemsSummaryText}
        </td>
        <td class="text-right" style="font-weight:700; color:var(--cyan-glow);">₹${sale.total.toFixed(2)}</td>
        <td><span class="status-indicator ${payClass}" style="width:6px; height:6px; margin-right:4px;"></span>${sale.method}</td>
        <td class="text-center">
          <button class="receipt-trigger-btn" data-id="${sale.id}">🖨️</button>
        </td>
      `;
      
      // Bind action to re-print receipt
      row.querySelector('.receipt-trigger-btn').addEventListener('click', () => {
        openReceiptEmulator(sale);
      });
      
      DOM.ledgerTableBody.appendChild(row);
    });
  }
  
  // 3. Render Custom Responsive SVGs
  generateTrendLineChart();
  generateDonutChart();
}

/**
 * Renders Today's Revenue Velocity over Completed Transactions
 */
function generateTrendLineChart() {
  DOM.trendChartWrapper.innerHTML = '';
  
  const w = 400;
  const h = 180;
  
  // Create dynamic grid data
  const data = szState.sales.map((s, index) => ({ x: index, y: s.total }));
  
  if (data.length === 0) {
    DOM.trendChartWrapper.innerHTML = `
      <div class="text-center text-muted py-4">
        <p>📊</p>
        <p style="font-size:0.8rem; font-weight:600; margin-top:0.3rem;">No Transaction Trends Yet</p>
        <small>Trends plot once invoices are spooled.</small>
      </div>
    `;
    return;
  }
  
  // Pad with an initial point if there is only 1 checkout for beautiful line rendering
  const chartData = data.length === 1 ? [{ x: -0.5, y: 0 }, ...data] : data;
  
  const maxX = chartData.length - 1;
  const maxY = Math.max(...chartData.map(d => d.y), 100) * 1.15;
  const minX = 0;
  const minY = 0;
  
  // Scale functions
  const scaleX = (x) => 40 + ((x - minX) / (maxX - minX)) * 340;
  const scaleY = (y) => h - 25 - ((y - minY) / (maxY - minY)) * 135;
  
  let svgContent = `
    <svg class="chart-svg" viewBox="0 0 ${w} ${h}">
      <defs>
        <linearGradient id="cyan-blue-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#43f2ff"/>
          <stop offset="100%" stop-color="#3b82f6"/>
        </linearGradient>
        <linearGradient id="cyan-blue-area-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#43f2ff" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
        </linearGradient>
      </defs>
      
      <!-- Horizontal gridlines -->
      <line class="chart-grid-line" x1="30" y1="${scaleY(maxY * 0.25)}" x2="390" y2="${scaleY(maxY * 0.25)}" />
      <line class="chart-grid-line" x1="30" y1="${scaleY(maxY * 0.5)}" x2="390" y2="${scaleY(maxY * 0.5)}" />
      <line class="chart-grid-line" x1="30" y1="${scaleY(maxY * 0.75)}" x2="390" y2="${scaleY(maxY * 0.75)}" />
      
      <!-- Axis Lines -->
      <line class="chart-axis-line" x1="35" y1="10" x2="35" y2="${h - 20}" />
      <line class="chart-axis-line" x1="35" y1="${h - 20}" x2="390" y2="${h - 20}" />
      
      <!-- Y-Axis labels -->
      <text class="chart-text" x="8" y="${scaleY(maxY * 0.25) + 3}">₹${Math.floor(maxY * 0.25)}</text>
      <text class="chart-text" x="8" y="${scaleY(maxY * 0.5) + 3}">₹${Math.floor(maxY * 0.5)}</text>
      <text class="chart-text" x="8" y="${scaleY(maxY * 0.75) + 3}">₹${Math.floor(maxY * 0.75)}</text>
  `;
  
  // Calculate path point strings
  let pathStr = '';
  let areaStr = `M ${scaleX(chartData[0].x)} ${h - 20} `;
  
  chartData.forEach((pt, i) => {
    const cx = scaleX(pt.x);
    const cy = scaleY(pt.y);
    
    if (i === 0) {
      pathStr += `M ${cx} ${cy} `;
    } else {
      pathStr += `L ${cx} ${cy} `;
    }
    areaStr += `L ${cx} ${cy} `;
  });
  
  areaStr += `L ${scaleX(chartData[chartData.length - 1].x)} ${h - 20} Z`;
  
  // Draw area & line path
  svgContent += `
      <path class="chart-trend-area" d="${areaStr}" />
      <path class="chart-trend-path" d="${pathStr}" />
  `;
  
  // Draw coordinates circles dots
  chartData.forEach((pt, i) => {
    // Skip placeholder coordinate
    if (pt.x < 0) return;
    
    const cx = scaleX(pt.x);
    const cy = scaleY(pt.y);
    svgContent += `
      <circle class="chart-dot" cx="${cx}" cy="${cy}" r="4.5" title="Order ${i}: ₹${pt.y.toFixed(2)}">
        <title>Invoice: ₹${pt.y.toFixed(2)}</title>
      </circle>
    `;
  });
  
  // Append X Axis indicators
  svgContent += `
      <text class="chart-text" x="40" y="${h - 6}">Start</text>
      <text class="chart-text" x="350" y="${h - 6}">Newest</text>
    </svg>
  `;
  
  DOM.trendChartWrapper.innerHTML = svgContent;
}

/**
 * Renders Category distribution breakdown via dynamic SVG Donut
 */
function generateDonutChart() {
  DOM.donutChartWrapper.innerHTML = '';
  
  // Group sales items by Category
  const catSums = { Beverages: 0, Snacks: 0, Bakery: 0 };
  let grandTotal = 0;
  
  szState.sales.forEach(sale => {
    sale.items.forEach(item => {
      // Lookup product categories dynamically
      const ref = szState.products.find(p => p.name === item.name);
      const cat = ref ? ref.category : 'Snacks';
      
      const priceSum = item.price * item.qty;
      catSums[cat] = (catSums[cat] || 0) + priceSum;
      grandTotal += priceSum;
    });
  });
  
  if (grandTotal === 0) {
    DOM.donutChartWrapper.innerHTML = `
      <div class="text-center text-muted py-4">
        <p>🍩</p>
        <p style="font-size:0.8rem; font-weight:600; margin-top:0.3rem;">No Department Shares</p>
        <small>Department metrics updates dynamically on invoice checkouts.</small>
      </div>
    `;
    return;
  }
  
  // Map dimensions
  const cx = 100;
  const cy = 90;
  const r = 50;
  const strokeW = 16;
  const circumference = 2 * Math.PI * r;
  
  const colors = {
    Beverages: '#43f2ff', // Cyan
    Snacks: '#8b5cf6',    // Violet
    Bakery: '#fbbf24'     // Amber
  };
  
  let accumulatedPercent = 0;
  let donutsHTML = '';
  
  for (const [cat, value] of Object.entries(catSums)) {
    if (value <= 0) continue;
    
    const pct = value / grandTotal;
    const strokeDash = pct * circumference;
    const offset = circumference - (accumulatedPercent * circumference);
    
    donutsHTML += `
      <circle class="donut-segment" cx="${cx}" cy="${cy}" r="${r}" 
              stroke="${colors[cat]}" stroke-width="${strokeW}"
              stroke-dasharray="${strokeDash} ${circumference - strokeDash}" 
              stroke-dashoffset="${offset}"
              transform="rotate(-90 ${cx} ${cy})">
        <title>${cat}: ₹${value.toFixed(2)} (${Math.round(pct * 100)}%)</title>
      </circle>
    `;
    
    accumulatedPercent += pct;
  }
  
  // Render structure
  let svgContent = `
    <div style="display:flex; flex-direction:column; align-items:center; width:100%;">
      <svg class="chart-svg" viewBox="0 0 200 180" style="max-height:180px; max-width:200px;">
        ${donutsHTML}
        <!-- Donut center total text -->
        <text x="${cx}" y="${cy + 5}" text-anchor="middle" class="donut-center-text-val">
          ₹${Math.round(grandTotal)}
        </text>
        <text x="${cx}" y="${cy + 18}" text-anchor="middle" class="donut-center-text-lbl">
          Sales
        </text>
      </svg>
      
      <!-- Legends wrapper -->
      <div class="donut-legends">
  `;
  
  for (const [cat, value] of Object.entries(catSums)) {
    if (value <= 0) continue;
    const pct = Math.round((value / grandTotal) * 100);
    svgContent += `
        <div class="legend-item">
          <span class="legend-indicator" style="background: ${colors[cat]};"></span>
          <span>${cat}: ${pct}%</span>
        </div>
    `;
  }
  
  svgContent += `
      </div>
    </div>
  `;
  
  DOM.donutChartWrapper.innerHTML = svgContent;
}

// ==========================================================================
// 12. RUN INITIALIZATIONS & BOOTSTRAPS
// ==========================================================================

function initMarketingReveals() {
  const reveals = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
      }
    });
  }, { threshold: 0.12 });
  
  reveals.forEach((el) => observer.observe(el));
}

function initBackgroundParticles() {
  const canvas = document.getElementById("particles");
  if (!canvas) return;
  
  const ctx = canvas.getContext("2d");
  const particles = [];
  
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  
  function init() {
    particles.length = 0;
    const count = Math.min(100, Math.floor(window.innerWidth / 12));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.6 + 0.5
      });
    }
  }
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(67, 242, 255, 0.4)";
    
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(animate);
  }
  
  window.addEventListener("resize", () => {
    resize();
    init();
  });
  
  resize();
  init();
  animate();
}

function initSystemClock() {
  const yearSpan = document.getElementById("year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
}

// Global Billing Search inputs triggers
function initSearchField() {
  DOM.searchBox.addEventListener('input', (e) => {
    szState.searchQuery = e.target.value;
    
    if (szState.searchQuery.trim() !== '') {
      DOM.searchClearBtn.style.display = 'block';
    } else {
      DOM.searchClearBtn.style.display = 'none';
    }
    
    renderProductCatalog();
  });
  
  DOM.searchClearBtn.addEventListener('click', () => {
    DOM.searchBox.value = '';
    szState.searchQuery = '';
    DOM.searchClearBtn.style.display = 'none';
    renderProductCatalog();
    DOM.searchBox.focus();
  });
}

// Master Bootloader
window.addEventListener('DOMContentLoaded', () => {
  initSystemClock();
  initMarketingReveals();
  initBackgroundParticles();
  
  // Dashboard setups
  initTabControls();
  initCategoryChips();
  initSearchField();
  initPromos();
  initCheckoutListeners();
  initReceiptActions();
  initNetworkToggle();
  initAddProductForm();
  
  // Pre-seed render cycles
  renderProductCatalog();
  renderCart();
});
