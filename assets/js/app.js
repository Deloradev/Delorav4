(() => {
  const CART_KEY = 'deloraCart';
  const ACCOUNTS_KEY = 'deloraAccounts';
  const CURRENT_USER_KEY = 'deloraCurrentUser';

  const cartButton = document.getElementById('cartButton');
  const miniCart = document.getElementById('miniCart');
  const miniCartClose = document.getElementById('miniCartClose');
  const cartCountBadges = document.querySelectorAll('[data-cart-count]');
  const accountButton = document.getElementById('accountButton');
  const accountModal = document.getElementById('accountModal');
  if (accountModal) {
    accountModal.setAttribute('tabindex', '-1');
  }
  const accountTabs = accountModal?.querySelector('[data-account-tabs]') || null;
  const accountSummary = accountModal?.querySelector('[data-account-summary]') || null;
  const accountNameDisplay = accountModal?.querySelector('[data-account-name]') || null;
  const accountForms = accountModal ? Array.from(accountModal.querySelectorAll('[data-account-form]')) : [];
  const accountMessage = accountModal?.querySelector('[data-account-message]') || null;
  const signOutButton = accountModal?.querySelector('[data-sign-out]') || null;

  const storage = (() => {
    let available = true;
    try {
      const testKey = '__delora_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
    } catch (error) {
      available = false;
    }

    const memory = new Map();

    return {
      get(key, fallback) {
        if (available) {
          const raw = window.localStorage.getItem(key);
          if (!raw) {
            return Array.isArray(fallback) ? [...fallback] : fallback ? { ...fallback } : fallback;
          }
          try {
            return JSON.parse(raw);
          } catch (error) {
            return Array.isArray(fallback) ? [...fallback] : fallback ? { ...fallback } : fallback;
          }
        }
        return memory.has(key) ? memory.get(key) : fallback;
      },
      set(key, value) {
        if (available) {
          window.localStorage.setItem(key, JSON.stringify(value));
        } else {
          memory.set(key, value);
        }
      },
      remove(key) {
        if (available) {
          window.localStorage.removeItem(key);
        } else {
          memory.delete(key);
        }
      },
    };
  })();

  const cart = storage.get(CART_KEY, []);
  const accounts = storage.get(ACCOUNTS_KEY, {});
  let currentUser = storage.get(CURRENT_USER_KEY, null);
  let activeAccountView = currentUser ? 'summary' : 'login';

  function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }

  function persistCart() {
    storage.set(CART_KEY, cart);
  }

  function persistAccounts() {
    storage.set(ACCOUNTS_KEY, accounts);
  }

  function persistCurrentUser() {
    if (currentUser) {
      storage.set(CURRENT_USER_KEY, currentUser);
    } else {
      storage.remove(CURRENT_USER_KEY);
    }
  }

  function getCartTotal() {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  function getCartQuantity() {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }

  function updateCartBadges() {
    const quantity = getCartQuantity();
    cartCountBadges.forEach((badge) => {
      badge.textContent = quantity;
      badge.classList.toggle('is-hidden', quantity === 0);
    });
    if (cartButton) {
      cartButton.classList.toggle('icon-button--has-items', quantity > 0);
    }
  }

  function renderCart() {
    if (!miniCart) {
      updateCartBadges();
      return;
    }

    const container = miniCart.querySelector('[data-cart-items]');
    const totalDisplay = miniCart.querySelector('[data-cart-total]');

    if (!container || !totalDisplay) {
      updateCartBadges();
      return;
    }

    container.innerHTML = '';

    if (cart.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'mini-cart__empty';
      empty.textContent = 'Your cart is empty.';
      container.appendChild(empty);
    } else {
      const fragment = document.createDocumentFragment();
      cart.forEach((item) => {
        const entry = document.createElement('article');
        entry.className = 'mini-cart__item';

        const info = document.createElement('div');
        info.className = 'mini-cart__info';

        const title = document.createElement('h4');
        title.textContent = item.name;
        info.appendChild(title);

        const meta = document.createElement('p');
        meta.textContent = `${formatCurrency(item.price)} · Qty ${item.quantity}`;
        info.appendChild(meta);

        const actions = document.createElement('div');
        actions.className = 'mini-cart__actions';

        const lineTotal = document.createElement('span');
        lineTotal.textContent = formatCurrency(item.price * item.quantity);
        actions.appendChild(lineTotal);

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'mini-cart__remove';
        removeButton.setAttribute('data-remove-item', item.id);
        removeButton.setAttribute('aria-label', `Remove ${item.name} from cart`);
        removeButton.innerHTML = '&times;';
        actions.appendChild(removeButton);

        entry.appendChild(info);
        entry.appendChild(actions);
        fragment.appendChild(entry);
      });

      container.appendChild(fragment);
    }

    totalDisplay.textContent = formatCurrency(getCartTotal());
    updateCartBadges();
  }

  function addToCart(item) {
    const existing = cart.find((entry) => entry.id === item.id);
    if (existing) {
      existing.quantity += item.quantity || 1;
    } else {
      cart.push({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
      });
    }
    persistCart();
    renderCart();
  }

  function removeFromCart(id) {
    const index = cart.findIndex((item) => item.id === id);
    if (index > -1) {
      cart.splice(index, 1);
      persistCart();
      renderCart();
    }
  }

  function openMiniCart() {
    if (!miniCart || !cartButton) {
      return;
    }
    miniCart.hidden = false;
    cartButton.setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-cart-open');
  }

  function closeMiniCart() {
    if (!miniCart || !cartButton) {
      return;
    }
    miniCart.hidden = true;
    cartButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-cart-open');
  }

  function toggleMiniCart() {
    if (!miniCart) {
      return;
    }
    if (miniCart.hidden) {
      openMiniCart();
    } else {
      closeMiniCart();
    }
  }

  function setAccountMessage(message, type) {
    if (!accountMessage) {
      return;
    }
    accountMessage.textContent = message;
    accountMessage.classList.remove('is-error', 'is-success');
    if (type === 'error') {
      accountMessage.classList.add('is-error');
    }
    if (type === 'success') {
      accountMessage.classList.add('is-success');
    }
  }

  function clearAccountMessage() {
    setAccountMessage('', '');
  }

  function getInitials(name) {
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  function updateAccountButton() {
    if (!accountButton) {
      return;
    }
    const isSignedIn = Boolean(currentUser);
    accountButton.classList.toggle('icon-button--has-user', isSignedIn);
    if (isSignedIn) {
      const initials = getInitials(currentUser.name || currentUser.email);
      accountButton.setAttribute('data-initials', initials);
      accountButton.setAttribute('aria-label', `Account for ${currentUser.name}`);
    } else {
      accountButton.removeAttribute('data-initials');
      accountButton.setAttribute('aria-label', 'Account');
    }
  }

  function setActiveAccountView(view) {
    if (!accountModal) {
      return;
    }
    activeAccountView = view;
    if (accountTabs) {
      const tabs = accountTabs.querySelectorAll('[data-account-tab]');
      tabs.forEach((tab) => {
        const isActive = tab.dataset.accountTab === view;
        tab.classList.toggle('is-active', isActive);
      });
      accountTabs.hidden = Boolean(currentUser);
    }
    accountForms.forEach((form) => {
      const formView = form.dataset.accountForm;
      const shouldShow = !currentUser && formView === view;
      form.hidden = !shouldShow;
    });
  }

  function updateAccountSummary() {
    if (!accountSummary || !accountNameDisplay) {
      return;
    }
    const isSignedIn = Boolean(currentUser);
    accountSummary.hidden = !isSignedIn;
    if (isSignedIn) {
      accountNameDisplay.textContent = currentUser.name;
    }
  }

  function updateAccountUI() {
    updateAccountButton();
    updateAccountSummary();
    if (!currentUser) {
      setActiveAccountView(activeAccountView);
    } else {
      setActiveAccountView('summary');
    }
  }

  function openAccountModal(view) {
    if (!accountModal) {
      return;
    }
    if (!currentUser) {
      setActiveAccountView(view || 'login');
    }
    accountModal.hidden = false;
    accountModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('has-modal-open');
    clearAccountMessage();
    if (currentUser) {
      setAccountMessage(`Signed in as ${currentUser.name}`, 'success');
    }
    const focusTarget = accountModal.querySelector('[data-account-form]:not([hidden]) input');
    if (focusTarget) {
      focusTarget.focus();
    } else {
      accountModal.focus?.();
    }
  }

  function closeAccountModal() {
    if (!accountModal) {
      return;
    }
    accountModal.hidden = true;
    accountModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('has-modal-open');
  }

  function registerAccount(form) {
    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim().toLowerCase();
    const password = form.elements.password.value;

    if (!name || !email || !password) {
      setAccountMessage('Please complete every field.', 'error');
      return;
    }
    if (password.length < 6) {
      setAccountMessage('Choose a password with at least 6 characters.', 'error');
      return;
    }
    if (accounts[email]) {
      setAccountMessage('An account with that email already exists. Try signing in.', 'error');
      return;
    }

    accounts[email] = { name, email, password };
    persistAccounts();

    currentUser = { name, email };
    persistCurrentUser();
    updateAccountUI();
    setAccountMessage(`Welcome to Delora, ${name}!`, 'success');
    form.reset();
  }

  function signIn(form) {
    const email = form.elements.email.value.trim().toLowerCase();
    const password = form.elements.password.value;

    if (!email || !password) {
      setAccountMessage('Enter both email and password to continue.', 'error');
      return;
    }
    const account = accounts[email];
    if (!account || account.password !== password) {
      setAccountMessage('Incorrect email or password. Please try again.', 'error');
      return;
    }

    currentUser = { name: account.name, email };
    persistCurrentUser();
    updateAccountUI();
    setAccountMessage(`Signed in as ${account.name}.`, 'success');
    form.reset();
  }

  function signOut() {
    currentUser = null;
    persistCurrentUser();
    setActiveAccountView('login');
    updateAccountUI();
    setAccountMessage('You have been signed out.', 'success');
  }

  if (cartButton && miniCart) {
    cartButton.addEventListener('click', () => {
      toggleMiniCart();
    });

    if (miniCartClose) {
      miniCartClose.addEventListener('click', () => {
        closeMiniCart();
      });
    }

    document.addEventListener('click', (event) => {
      if (miniCart.hidden) {
        return;
      }
      const target = event.target;
      if (miniCart.contains(target) || cartButton.contains(target)) {
        return;
      }
      closeMiniCart();
    });

    miniCart.addEventListener('click', (event) => {
      const removeButton = event.target.closest('[data-remove-item]');
      if (removeButton) {
        const id = removeButton.getAttribute('data-remove-item');
        removeFromCart(id);
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (accountModal && !accountModal.hidden) {
        closeAccountModal();
      }
      if (miniCart && !miniCart.hidden) {
        closeMiniCart();
      }
    }
  });

  if (accountButton && accountModal) {
    accountButton.addEventListener('click', () => {
      openAccountModal(activeAccountView);
    });

    accountModal.addEventListener('click', (event) => {
      if (event.target.matches('[data-account-overlay]')) {
        closeAccountModal();
      }
    });

    const closeAccountButton = accountModal.querySelector('#accountModalClose');
    if (closeAccountButton) {
      closeAccountButton.addEventListener('click', () => {
        closeAccountModal();
      });
    }

    if (accountTabs) {
      accountTabs.addEventListener('click', (event) => {
        const tab = event.target.closest('[data-account-tab]');
        if (!tab || tab.classList.contains('is-active')) {
          return;
        }
        const view = tab.getAttribute('data-account-tab');
        clearAccountMessage();
        setActiveAccountView(view);
      });
    }

    accountForms.forEach((form) => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        clearAccountMessage();
        const view = form.getAttribute('data-account-form');
        if (view === 'login') {
          signIn(form);
        }
        if (view === 'register') {
          registerAccount(form);
        }
      });
    });

    if (signOutButton) {
      signOutButton.addEventListener('click', () => {
        signOut();
      });
    }

    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-open-account]');
      if (!trigger) {
        return;
      }
      event.preventDefault();
      const view = trigger.getAttribute('data-account-action') || 'login';
      openAccountModal(view);
    });

    accountModal.addEventListener('transitionend', () => {
      if (!accountModal.hidden) {
        const focusTarget = accountModal.querySelector('[data-account-form]:not([hidden]) input');
        focusTarget?.focus();
      }
    });

    if (accountModal.querySelector('[data-account-form="register"]')) {
      const switchLinks = accountModal.querySelectorAll('[data-switch-view]');
      switchLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
          event.preventDefault();
          const view = link.getAttribute('data-switch-view');
          clearAccountMessage();
          setActiveAccountView(view);
          const focusTarget = accountModal.querySelector('[data-account-form]:not([hidden]) input');
          focusTarget?.focus();
        });
      });
    }
  }

  const addToCartButtons = document.querySelectorAll('[data-add-to-cart]');
  addToCartButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const card = button.closest('[data-product-id]');
      const id = card?.getAttribute('data-product-id') || button.dataset.productId || button.dataset.productName;
      const name = button.dataset.productName || card?.querySelector('h3')?.textContent || 'Delora Product';
      const price = Number(button.dataset.productPrice || card?.getAttribute('data-product-price') || 0);
      if (!id || Number.isNaN(price) || price <= 0) {
        return;
      }
      addToCart({ id, name, price, quantity: 1 });
      openMiniCart();
    });
  });

  const miniCartCheckout = miniCart?.querySelector('[data-checkout]') || null;
  if (miniCartCheckout) {
    miniCartCheckout.addEventListener('click', () => {
      if (cart.length === 0) {
        setAccountMessage('Add an item to your cart to continue.', 'error');
        openMiniCart();
        return;
      }
      openAccountModal(currentUser ? 'summary' : 'login');
      closeMiniCart();
    });
  }

  const productGrid = document.querySelector('[data-product-grid]');
  const categoryFilter = document.querySelector('[data-filter-category]');
  const sortSelect = document.querySelector('[data-sort-products]');
  const categoryPills = document.querySelectorAll('[data-category-pill]');

  if (productGrid) {
    const productCards = Array.from(productGrid.querySelectorAll('.product-card'));
    const baseOrder = new Map(productCards.map((card, index) => [card, index]));
    const emptyState = document.createElement('p');
    emptyState.className = 'product-grid__empty';
    emptyState.textContent = 'No products match your filters yet. Adjust your filters to find more options.';

    const syncCategoryPills = (value) => {
      if (!categoryPills.length) {
        return;
      }
      categoryPills.forEach((pill) => {
        const pillValue = pill.getAttribute('data-category-pill') || 'all';
        pill.classList.toggle('is-active', pillValue === value);
      });
    };

    function getPrice(card) {
      const button = card.querySelector('[data-add-to-cart]');
      const value = Number(button?.dataset.productPrice || 0);
      return Number.isNaN(value) ? 0 : value;
    }

    function applyProductLayout() {
      const filterValue = categoryFilter?.value || 'all';
      const sortValue = sortSelect?.value || 'featured';

      syncCategoryPills(filterValue);

      const filtered = productCards.filter((card) => {
        if (filterValue === 'all') {
          return true;
        }
        return card.dataset.productCategory === filterValue;
      });

      let ordered = filtered.slice();
      if (sortValue === 'price-asc') {
        ordered.sort((a, b) => getPrice(a) - getPrice(b));
      } else if (sortValue === 'price-desc') {
        ordered.sort((a, b) => getPrice(b) - getPrice(a));
      } else {
        ordered.sort((a, b) => baseOrder.get(a) - baseOrder.get(b));
      }

      productGrid.innerHTML = '';
      if (ordered.length === 0) {
        productGrid.appendChild(emptyState);
      } else {
        ordered.forEach((card) => productGrid.appendChild(card));
      }
    }

    applyProductLayout();

    categoryFilter?.addEventListener('change', applyProductLayout);
    sortSelect?.addEventListener('change', applyProductLayout);

    if (categoryPills.length) {
      categoryPills.forEach((pill) => {
        pill.addEventListener('click', () => {
          const value = pill.getAttribute('data-category-pill') || 'all';
          if (categoryFilter && categoryFilter.value !== value) {
            categoryFilter.value = value;
          }
          applyProductLayout();
        });
      });
    }
  }
  renderCart();
  updateAccountUI();
})();

