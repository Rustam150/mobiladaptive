const Storage = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};

const Store = {
  cart: () => Storage.get('hd_cart', []),
  setCart: (items) => {
    Storage.set('hd_cart', items);
    Store.updateBadges();
  },
  favorites: () => Storage.get('hd_favorites', []),
  setFavorites: (ids) => {
    Storage.set('hd_favorites', ids);
    Store.updateBadges();
  },
  user: () => Storage.get('hd_user', null),
  setUser: (u) => Storage.set('hd_user', u),
  orders: () => Storage.get('hd_orders', []),
  addOrder: (order) => {
    const list = Store.orders();
    list.unshift({ ...order, id: Date.now(), date: new Date().toISOString() });
    Storage.set('hd_orders', list);
  },
  compare: () => Storage.get('hd_compare', []),
  setCompare: (ids) => {
    Storage.set('hd_compare', ids.slice(0, 4));
    Store.updateBadges();
  },

  updateBadges() {
    const cart = Store.cart();
    const fav = Store.favorites();
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = cart.length;
      el.hidden = cart.length === 0;
    });
    document.querySelectorAll('[data-fav-count]').forEach((el) => {
      el.textContent = fav.length;
      el.hidden = fav.length === 0;
    });
  },

  toggleFavorite(id) {
    const fav = Store.favorites();
    const i = fav.indexOf(id);
    if (i >= 0) fav.splice(i, 1);
    else fav.push(id);
    Store.setFavorites(fav);
    return fav.includes(id);
  },

  isFavorite(id) {
    return Store.favorites().includes(id);
  },

  addToCart(id, qty = 1) {
    const cart = Store.cart();
    const existing = cart.find((c) => c.id === id);
    if (existing) existing.qty += qty;
    else cart.push({ id, qty });
    Store.setCart(cart);
  },

  removeFromCart(id) {
    Store.setCart(Store.cart().filter((c) => c.id !== id));
  },

  updateCartQty(id, qty) {
    const cart = Store.cart();
    const item = cart.find((c) => c.id === id);
    if (item) {
      item.qty = Math.max(1, qty);
      Store.setCart(cart);
    }
  },

  toggleCompare(id) {
    const list = Store.compare();
    const i = list.indexOf(id);
    if (i >= 0) {
      list.splice(i, 1);
      Store.setCompare(list);
      return false;
    }
    if (list.length >= 4) return false;
    list.push(id);
    Store.setCompare(list);
    return true;
  },

  isInCompare(id) {
    return Store.compare().includes(id);
  },
};

function bindProductImageFallback(img, product) {
  const cat = HERMITAGE.categories.find((c) => c.id === product.category);
  const fallback = cat?.image || product.image;
  img.addEventListener(
    'error',
    () => {
      if (img.src !== fallback) img.src = fallback;
    },
    { once: true }
  );
}

function updateCompareButton(btn, productId) {
  if (Store.isInCompare(productId)) {
    btn.textContent = 'В сравнении';
    btn.classList.add('is-active');
    btn.dataset.mode = 'open';
  } else {
    btn.textContent = 'Сравнить';
    btn.classList.remove('is-active');
    btn.dataset.mode = 'add';
  }
}

function handleCompareClick(btn, productId) {
  if (btn.dataset.mode === 'open') {
    window.location.href = 'compare.html';
    return;
  }
  const added = Store.toggleCompare(productId);
  if (!added && !Store.isInCompare(productId)) {
    alert('Можно сравнить не более 4 товаров. Откройте раздел «Сравнение» и уберите лишнее.');
    return;
  }
  updateCompareButton(btn, productId);
}

function buildWhatsAppUrl(firstName, lastName, phone, items) {
  const lines = items.map((p) => `- ${p.name}${p.qty > 1 ? ` (×${p.qty})` : ''}`);
  const text = `Здравствуйте.

Меня зовут: ${firstName} ${lastName}
Телефон: ${phone}

Меня интересуют следующие товары:

${lines.join('\n')}

Прошу связаться со мной.`;
  return `https://wa.me/${HERMITAGE.whatsapp}?text=${encodeURIComponent(text)}`;
}

function productWhatsAppUrl(product) {
  const text = `Здравствуйте.

Меня интересует товар: ${product.name}
Артикул: ${product.sku}
Цена: ${formatPrice(product.price)}

Прошу связаться со мной.`;
  return `https://wa.me/${HERMITAGE.whatsapp}?text=${encodeURIComponent(text)}`;
}

function renderProductCard(product, opts = {}) {
  const isFav = Store.isFavorite(product.id);
  const badge = product.isNew
    ? '<span class="badge badge--new">Новинка</span>'
    : product.isSale
      ? '<span class="badge badge--sale">Акция</span>'
      : '';
  return `
    <article class="product-card" data-id="${product.id}">
      <a href="product.html?id=${product.id}" class="product-card__media">
        <img src="${product.image}" alt="" loading="lazy" data-product-id="${product.id}" />
        ${badge}
      </a>
      <div class="product-card__body">
        <button type="button" class="product-card__fav ${isFav ? 'is-active' : ''}" data-fav="${product.id}" aria-label="Избранное">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        </button>
        <h3 class="product-card__title"><a href="product.html?id=${product.id}">${product.name}</a></h3>
        <p class="product-card__meta">${product.country} · ${product.factory}</p>
        <p class="product-card__price">${formatPrice(product.price)}</p>
        <a href="product.html?id=${product.id}" class="btn btn--outline btn--sm">Подробнее</a>
      </div>
    </article>`;
}

function closeMobileNav() {
  const nav = document.querySelector('.site-nav');
  const toggle = document.querySelector('.nav-toggle');
  if (!nav) return;
  nav.classList.remove('is-open');
  document.body.classList.remove('nav-open');
  toggle?.setAttribute('aria-expanded', 'false');
}

function getNavStack() {
  try {
    return JSON.parse(sessionStorage.getItem('hd_nav_stack') || '[]');
  } catch {
    return [];
  }
}

function setNavStack(stack) {
  sessionStorage.setItem('hd_nav_stack', JSON.stringify(stack.slice(-30)));
}

function trackInternalNavigation() {
  const path = location.pathname + location.search;
  let stack = getNavStack();

  if (sessionStorage.getItem('hd_back_nav') === '1') {
    sessionStorage.removeItem('hd_back_nav');
    if (!stack.length || stack[stack.length - 1] !== path) stack.push(path);
    setNavStack(stack);
    return;
  }

  if (stack[stack.length - 1] !== path) stack.push(path);
  setNavStack(stack);
}

function resolveBackUrl(fallback) {
  const stack = getNavStack();
  const here = location.pathname + location.search;
  let idx = stack.length - 1;
  if (idx >= 0 && stack[idx] === here) idx -= 1;
  if (idx >= 0) return stack[idx];
  return fallback;
}

function navigateBack(fallback) {
  sessionStorage.setItem('hd_back_nav', '1');
  const stack = getNavStack();
  const here = location.pathname + location.search;
  if (stack.length && stack[stack.length - 1] === here) stack.pop();
  const prev = stack.length ? stack[stack.length - 1] : null;
  setNavStack(stack);
  window.location.href = prev || fallback;
}

function renderCatalogCategories(activeCategory = '') {
  const chips = [
    { id: '', name: 'Все', href: 'catalog.html' },
    ...HERMITAGE.categories.map((c) => ({
      id: c.id,
      name: c.name,
      href: `catalog.html?category=${c.id}`,
    })),
  ];
  return `
    <div class="catalog-categories" role="navigation" aria-label="Комнаты">
      <p class="catalog-categories__label">Комнаты</p>
      <div class="catalog-categories__scroll">
        ${chips
          .map(
            (c) =>
              `<a href="${c.href}" class="catalog-chip${activeCategory === c.id ? ' is-active' : ''}">${c.name}</a>`
          )
          .join('')}
      </div>
    </div>`;
}

function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const toggle = header.querySelector('.nav-toggle');
  const nav = header.querySelector('.site-nav');
  if (toggle && nav) {
    if (!nav.querySelector('.nav-close')) {
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'nav-close';
      closeBtn.setAttribute('aria-label', 'Закрыть меню');
      closeBtn.textContent = '✕';
      nav.insertBefore(closeBtn, nav.firstChild);
    }

    const openNav = () => {
      nav.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('nav-open');
    };

    toggle.addEventListener('click', () => {
      if (nav.classList.contains('is-open')) closeMobileNav();
      else openNav();
    });

    nav.querySelector('.nav-close')?.addEventListener('click', closeMobileNav);
    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMobileNav);
    });

    document.addEventListener('click', (e) => {
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(e.target) || toggle.contains(e.target)) return;
      closeMobileNav();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMobileNav();
    });
  }

  const searchBtn = header.querySelector('[data-search-open]');
  const searchPanel = document.querySelector('.search-panel');
  const searchClose = document.querySelector('[data-search-close]');
  const closeSearch = () => {
    searchPanel?.classList.remove('is-open');
    document.body.classList.remove('search-open');
  };
  if (searchBtn && searchPanel) {
    searchBtn.addEventListener('click', () => {
      searchPanel.classList.add('is-open');
      document.body.classList.add('search-open');
      searchPanel.querySelector('input')?.focus();
    });
    searchClose?.addEventListener('click', closeSearch);
    searchPanel.addEventListener('click', (e) => {
      if (e.target === searchPanel) closeSearch();
    });
  }

  const onScroll = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 24);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  Store.updateBadges();
}

function initMobilePageChrome() {
  const fallback = document.body.dataset.pageBack;
  if (!fallback) return;

  document.body.classList.add('page-inner');

  const toolbar = document.createElement('nav');
  toolbar.className = 'page-toolbar';
  toolbar.setAttribute('aria-label', 'Навигация по странице');
  toolbar.innerHTML = `
    <div class="page-toolbar__inner container">
      <a href="${resolveBackUrl(fallback)}" class="page-back" data-back-link>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
        <span>Назад</span>
      </a>
    </div>`;

  const header = document.querySelector('.site-header');
  header?.after(toolbar);

  const backLink = toolbar.querySelector('[data-back-link]');
  backLink?.addEventListener('click', (e) => {
    e.preventDefault();
    navigateBack(fallback);
  });
}

function initProductCardImages(root = document) {
  root.querySelectorAll('.product-card__media img[data-product-id]').forEach((img) => {
    const product = getProduct(img.dataset.productId);
    if (product) bindProductImageFallback(img, product);
  });
}

function setPageToolbarTitle(text) {
  const heading = document.querySelector('.page-header h1, #page-title');
  if (heading && text) heading.textContent = text;
}

function initCatalogFilters() {
  const panel = document.getElementById('filters-panel');
  if (!panel) return;

  let backdrop = document.querySelector('.filters-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'filters-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);
  }

  const close = () => {
    panel.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    document.body.classList.remove('filters-open');
  };

  const open = () => {
    panel.classList.add('is-open');
    backdrop.classList.add('is-open');
    document.body.classList.add('filters-open');
  };

  document.getElementById('filters-open')?.addEventListener('click', open);
  document.getElementById('filters-close')?.addEventListener('click', close);
  backdrop.addEventListener('click', close);
}


function initFavButtons(root = document) {
  root.querySelectorAll('[data-fav]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.fav;
      const active = Store.toggleFavorite(id);
      btn.classList.toggle('is-active', active);
      const svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', active ? 'currentColor' : 'none');
    });
  });
}

function initSliders() {
  document.querySelectorAll('[data-slider]').forEach((slider) => {
    const track = slider.querySelector('.slider__track');
    const prev = slider.querySelector('[data-slider-prev]');
    const next = slider.querySelector('[data-slider-next]');
    if (!track) return;

    const step = () => {
      const card = track.querySelector('.product-card, .slider__item');
      return card ? card.offsetWidth + 16 : 280;
    };

    prev?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    next?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  });

  const brandsTrack = document.querySelector('.brands-track');
  if (brandsTrack) {
    let pos = 0;
    setInterval(() => {
      pos += 1;
      if (pos >= brandsTrack.scrollWidth / 2) pos = 0;
      brandsTrack.scrollLeft = pos;
    }, 30);
  }
}

function filterProducts(filters, sort) {
  let list = [...HERMITAGE.products];

  if (filters.category) list = list.filter((p) => p.category === filters.category);
  if (filters.country) list = list.filter((p) => p.country === filters.country);
  if (filters.factory) list = list.filter((p) => p.factory === filters.factory);
  if (filters.color) list = list.filter((p) => p.color === filters.color);
  if (filters.material) list = list.filter((p) => p.material.includes(filters.material));
  if (filters.inStock === 'yes') list = list.filter((p) => p.inStock);
  if (filters.inStock === 'no') list = list.filter((p) => !p.inStock);
  if (filters.new) list = list.filter((p) => p.isNew);
  if (filters.sale) list = list.filter((p) => p.isSale);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.factory.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q)
    );
  }
  if (filters.minPrice) list = list.filter((p) => p.price >= Number(filters.minPrice));
  if (filters.maxPrice) list = list.filter((p) => p.price <= Number(filters.maxPrice));

  if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
  else if (sort === 'new') list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
  else list.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));

  return list;
}

function getQueryParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search));
}

function initAuthForms() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const profileForm = document.getElementById('profile-form');

  registerForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(registerForm);
    const user = {
      email: fd.get('email'),
      password: fd.get('password'),
      firstName: fd.get('firstName'),
      lastName: fd.get('lastName'),
      phone: fd.get('phone'),
    };
    Storage.set('hd_users', [...Storage.get('hd_users', []), user]);
    Store.setUser({ email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone });
    window.location.hash = 'profile';
    location.reload();
  });

  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(loginForm);
    const users = Storage.get('hd_users', []);
    const found = users.find((u) => u.email === fd.get('email') && u.password === fd.get('password'));
    if (found) {
      Store.setUser({
        email: found.email,
        firstName: found.firstName,
        lastName: found.lastName,
        phone: found.phone,
      });
      window.location.hash = 'profile';
      location.reload();
    } else {
      alert('Неверный email или пароль');
    }
  });

  profileForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(profileForm);
    const user = Store.user();
    if (!user) return;
    const updated = {
      ...user,
      firstName: fd.get('firstName'),
      lastName: fd.get('lastName'),
      phone: fd.get('phone'),
    };
    Store.setUser(updated);
    const users = Storage.get('hd_users', []);
    const i = users.findIndex((u) => u.email === user.email);
    if (i >= 0) {
      users[i] = { ...users[i], ...updated };
      Storage.set('hd_users', users);
    }
    alert('Данные сохранены');
  });

  document.querySelector('[data-logout]')?.addEventListener('click', () => {
    Store.setUser(null);
    location.reload();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  trackInternalNavigation();
  initHeader();
  initMobilePageChrome();
  initCatalogFilters();
  initFavButtons();
  initProductCardImages();
  initSliders();
  initAuthForms();
  Store.updateBadges();
});
