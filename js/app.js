// Jednostavni SPA router bez React Router DOM kompleksnosti
const MAX_CART_QUANTITY = 99;

const APP = {
  init() {
    this.scheduleAuthExpiration();
    this.render();
    this.setupNavigation();
    window.addEventListener('popstate', () => this.render());
    window.addEventListener('cart:updated', () => this.updateCartBadge(true));
    window.addEventListener('cart:item-removing', () => this.animateCartEject());
    window.addEventListener('storage', event => {
      if (event.key === null || event.key === 'cartItems') this.updateCartBadge();
    });
  },

  clearAuthSession() {
    ['authToken', 'authExpiresAt', 'authUsername'].forEach(key => sessionStorage.removeItem(key));
  },

  scheduleAuthExpiration() {
    const token = sessionStorage.getItem('authToken');
    if (!token) return;

    const expiresAt = sessionStorage.getItem('authExpiresAt');
    const expirationTime = Date.parse(expiresAt || '');
    const timeLeft = expirationTime - Date.now();
    if (!expiresAt || !Number.isFinite(expirationTime) || timeLeft <= 0) {
      this.clearAuthSession();
      return;
    }

    window.setTimeout(() => {
      if (sessionStorage.getItem('authToken') !== token ||
          sessionStorage.getItem('authExpiresAt') !== expiresAt) {
        return;
      }
      this.clearAuthSession();
      this.render();
    }, timeLeft);
  },

  render() {
    if (this.pageController) this.pageController.abort();
    this.pageController = new AbortController();

    const path = window.location.pathname;
    const root = document.getElementById('root');
    root.innerHTML = '';

    const content = this.getRouteContent(path);
    root.appendChild(content);
    this.updateCartBadge();

    // Ponovo podesi slušaoce događaja nakon renderovanja
    this.setupNavigation();
  },

  getRouteContent(path) {
    const container = document.createElement('div');

    // Dodaj navigacionu traku
    container.appendChild(this.createNavBar());

    const contentDiv = document.createElement('div');
    contentDiv.className = 'content-area';

    if (path === '/' || path === '') {
      contentDiv.appendChild(this.HomePage());
    } else if (path === '/products' || path.startsWith('/products')) {
      const match = path.match(/^\/products\/(\d+)/);
      if (match) {
        // Detail stranica je async (fetch) — prikaci placeholder pa zameni gotovim sadrzajem
        const detailPlaceholder = document.createElement('div');
        detailPlaceholder.textContent = 'Učitavanje proizvoda...';
        contentDiv.appendChild(detailPlaceholder);
        const signal = this.pageController.signal;
        Promise.resolve(this.ProductDetailPage(match[1], signal)).then(detailDiv => {
          if (signal.aborted || !detailPlaceholder.isConnected) return;
          if (detailDiv instanceof Node) detailPlaceholder.replaceWith(detailDiv);
          this.setupNavigation();
        }).catch(err => {
          if (signal.aborted) return;
          detailPlaceholder.textContent = 'Došlo je do greške pri učitavanju proizvoda.';
          console.error(err);
        });
      } else {
        const category = new URLSearchParams(window.location.search).get('category');
        // Shop je async (fetch) — prikaci placeholder pa zameni gotovim sadrzajem
        const shopPlaceholder = document.createElement('div');
        shopPlaceholder.textContent = 'Učitavanje proizvoda...';
        contentDiv.appendChild(shopPlaceholder);
        const signal = this.pageController.signal;
        Promise.resolve(this.Shop(category, signal)).then(shopDiv => {
          if (signal.aborted || !shopPlaceholder.isConnected) return;
          if (shopDiv instanceof Node) shopPlaceholder.replaceWith(shopDiv);
          this.setupNavigation();
        }).catch(err => {
          if (signal.aborted) return;
          shopPlaceholder.textContent = 'Došlo je do greške pri učitavanju proizvoda.';
          console.error(err);
        });
      }
    } else if (path === '/login') {
      contentDiv.appendChild(this.LoginPage());
    } else if (path === '/register') {
      contentDiv.appendChild(this.RegisterPage());
    } else if (path === '/cart') {
      contentDiv.appendChild(this.CartPage());
    } else if (path === '/checkout') {
      contentDiv.appendChild(this.CheckoutPage());
    } else if (path === '/aboutUs') {
      contentDiv.appendChild(this.AboutUsPage());
    } else if (path === '/contact') {
      contentDiv.appendChild(this.ContactPage());
    } else {
      contentDiv.appendChild(this.NotFoundPage());
    }

    container.appendChild(contentDiv);
    container.insertAdjacentHTML('beforeend', this.createFooter());
    return container;
  },

  createFooter() {
    return `
      <div class="footer">
          <div class="inner container">
             <div class="footer-columns">
                 <div class="footer-col">
                      <h4>Kategorije</h4>
                      <ul>
                          <li><a href="#" data-navigate="/products?category=Phones">Telefoni</a></li>
                          <li><a href="#" data-navigate="/products?category=Laptops">Laptopovi</a></li>
                          <li><a href="#" data-navigate="/products?category=Tablets">Tableti</a></li>
                          <li><a href="#" data-navigate="/products?category=Accessories">Oprema</a></li>
                      </ul>
                 </div>
                  <div class="footer-col">
                      <h4>Informacije</h4>
                      <ul>
                          <li><a href="#" data-navigate="/aboutUs">O nama</a></li>
                          <li><a href="#" data-navigate="/contact">Kontakt</a></li>
                          <li><a href="#">Politika privatnosti</a></li>
                          <li><a href="#">Uslovi korišćenja</a></li>
                      </ul>
                  </div>
                  <div class="footer-col">
                      <h4>Korisnička Podrška</h4>
                      <ul>
                          <li><a href="#">Česta pitanja</a></li>
                          <li><a href="#">Vodiči za kupovinu</a></li>
                          <li><a href="#">Garancija i povraćaj</a></li>
                          <li><a href="#">Praćenje porudžbine</a></li>
                      </ul>
                  </div>
                  <div class="social">
                      <p>Pratite nas:</p>
                      <div class="social-links">
                          <a href="#"><img src="/slike/facebook-app-symbol.png" alt="Facebook"></a>
                          <a href="#"><img src="/slike/twitter.png" alt="Twitter"></a>
                          <a href="#"><img src="/slike/instagram.png" alt="Instagram"></a>
                          <a href="#"><img src="/slike/linkedin-big-logo.png" alt="LinkedIn"></a>
                      </div>
                  </div>
              </div>
              <div class="footer-bottom">
                  <p class="social-caption">Tehnosen — tehnologija koja vas povezuje sa onim što volite.</p>
              </div>
          </div>
      </div>
    `;
  },

  navigate(path, e) {
    if (e) e.preventDefault();
    window.history.pushState({}, '', path);
    this.render();
  },

  setupNavigation() {
    document.querySelectorAll('[data-navigate]').forEach(link => {
      if (link.dataset.bound) return; // spreči duplu registraciju listenera
      link.dataset.bound = '1';
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(link.getAttribute('data-navigate'));
      });
    });
  },

  createNavBar() {
    const nav = document.createElement('div');
    nav.className = 'navbar';
    nav.innerHTML = `
      <h1 class="brand" translate="no">Tehnosen</h1>
      <button type="button" class="toggle" aria-label="Prikaži navigaciju" aria-expanded="false" aria-controls="primary-navigation">
        <span class="top_line common"></span>
        <span class="middle_line common"></span>
        <span class="bottom_line common"></span>
      </button>
      <nav class="primary-nav" id="primary-navigation">
        <div class="primary-nav_item">
          <a href="#" data-navigate="/" title="Početna stranica">Početna</a>
        </div>
        <div class="primary-nav_divider"></div>
        <div class="primary-nav_item">
          <a href="#" data-navigate="/products" title="Stranica proizvoda">Proizvodi</a>
        </div>
        <div class="primary-nav_divider"></div>
        <div class="primary-nav_item">
          <a href="#" data-navigate="/contact" title="Kontakt">Kontakt</a>
        </div>
        <div class="primary-nav_divider"></div>
        <div class="primary-nav_item">
          <a href="#" data-navigate="/aboutUs" title="O nama">O nama</a>
        </div>
        <div class="primary-nav_divider"></div>
        <div class="primary-nav_item">
          <a href="#" data-navigate="/location" title="Stranica lokacije">Lokacija</a>
        </div>
        <form class="catalog-search" role="search">
            <input type="search" placeholder="Pretražite proizvode" class="search-box" aria-label="Pretražite proizvode" aria-autocomplete="list" aria-controls="search-suggestions" aria-expanded="false" autocomplete="off"/>
          <button type="submit" class="search-box-icon" aria-label="Pokreni pretragu">
            <span class="material-symbols-outlined notranslate" translate="no" aria-hidden="true">search</span>
          </button>
            <div class="search-suggestions" id="search-suggestions" role="listbox" hidden></div>
          </form>
        <div class="action-item">
          ${this.isLoggedIn()
          ? '<a href="#" id="logout-link" title="Odjava"><span class="material-symbols-outlined action-item-icon notranslate" translate="no" aria-hidden="true">account_box</span></a>'
        : `<a href="#" data-navigate="/login" title="Nalog"><span class="material-symbols-outlined action-item-icon notranslate" translate="no" aria-hidden="true">account_box</span></a>`}
        </div>
        <div class="action-item cart-action-item">
          <a href="#" data-navigate="/cart" title="Korpa" aria-label="Korpa">
            <span class="cart-icon-wrap">
              <span class="material-symbols-outlined action-item-icon notranslate" translate="no" aria-hidden="true">shopping_cart</span>
              <span id="cart-badge" class="cart-count-badge" aria-live="polite" hidden></span>
            </span>
          </a>
        </div>
      </nav>
    `;

    const navToggle = nav.querySelector('.toggle');
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') !== 'true';
      navToggle.setAttribute('aria-expanded', String(expanded));
      navToggle.setAttribute('aria-label', expanded ? 'Sakrij navigaciju' : 'Prikaži navigaciju');
    });
    nav.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Prikaži navigaciju');
      }
    });

    nav.querySelectorAll('[data-navigate]').forEach(link => {
      if (link.dataset.bound) return;
      link.dataset.bound = '1';
      link.addEventListener('click', (e) => {
        e.preventDefault();
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Prikaži navigaciju');
        this.navigate(link.getAttribute('data-navigate'));
      });
    });

    const searchForm = nav.querySelector('.catalog-search');
    const searchInput = searchForm.querySelector('.search-box');
    const suggestions = searchForm.querySelector('.search-suggestions');
    let searchProductsPromise;
    let activeSuggestion = -1;

    const closeSuggestions = () => {
      suggestions.hidden = true;
      suggestions.replaceChildren();
      searchInput.setAttribute('aria-expanded', 'false');
      searchInput.removeAttribute('aria-activedescendant');
      activeSuggestion = -1;
    };

    const navigateToProduct = product => {
      closeSuggestions();
      this.navigate('/products/' + encodeURIComponent(product.id));
    };

    const renderSuggestions = async () => {
      const query = searchInput.value.trim();

      activeSuggestion = -1;
      searchInput.removeAttribute('aria-activedescendant');
      searchInput.setAttribute('aria-expanded', 'true');
      suggestions.hidden = false;
      suggestions.replaceChildren();
      const loading = document.createElement('p');
      loading.className = 'search-suggestion-status';
      loading.textContent = 'Pretraživanje...';
      suggestions.appendChild(loading);

      try {
        searchProductsPromise ||= window.apiClient.getProducts();
        const products = await searchProductsPromise;
        if (!searchForm.isConnected || searchInput.value.trim() !== query) return;

        const translateCategory = value => window.prevodi.translateCategory(value);
        const translateColor = value => window.prevodi.translateColor(value);
        const normalizedQuery = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('sr');
        const matches = products.filter(product => [
          product.title,
          product.brand,
          product.category,
          translateCategory(product.category),
          product.color,
          translateColor(product.color)
        ].some(value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('sr').includes(normalizedQuery))).slice(0, 6);

        suggestions.replaceChildren();
        if (matches.length === 0) {
          const empty = document.createElement('p');
          empty.className = 'search-suggestion-status';
          empty.textContent = 'Nema pronađenih proizvoda.';
          suggestions.appendChild(empty);
          return;
        }

        matches.forEach((product, index) => {
          const option = document.createElement('button');
          option.type = 'button';
          option.className = 'search-suggestion';
          option.id = 'search-suggestion-' + index;
          option.setAttribute('role', 'option');
          option.setAttribute('aria-selected', 'false');

          const image = document.createElement('img');
          image.src = window.apiClient.getImageUrl(product.image);
          image.alt = '';

          const details = document.createElement('span');
          details.className = 'search-suggestion-details';
          const title = document.createElement('span');
          title.className = 'search-suggestion-title';
          title.textContent = product.title;
          const meta = document.createElement('span');
          meta.className = 'search-suggestion-meta';
          meta.textContent = Number(product.price).toFixed(2) + ' € · ' + translateCategory(product.category);
          details.append(title, meta);
          option.append(image, details);
          option.addEventListener('click', () => navigateToProduct(product));
          suggestions.appendChild(option);
        });

        const allResults = document.createElement('button');
        allResults.type = 'submit';
        allResults.className = 'search-suggestions-all';
        allResults.textContent = 'Prikaži sve rezultate';
        suggestions.appendChild(allResults);
      } catch (error) {
        searchProductsPromise = null;
        if (!searchForm.isConnected || searchInput.value.trim() !== query) return;
        suggestions.replaceChildren();
        const status = document.createElement('p');
        status.className = 'search-suggestion-status search-suggestion-error';
        status.textContent = error.message || 'Pretraga trenutno nije dostupna.';
        suggestions.appendChild(status);
      }
    };

    searchInput.addEventListener('input', renderSuggestions);
    searchInput.addEventListener('keydown', event => {
      const options = [...suggestions.querySelectorAll('.search-suggestion')];
      if (event.key === 'Escape') {
        closeSuggestions();
        return;
      }
      if (event.key === 'ArrowDown' && options.length) {
        event.preventDefault();
        activeSuggestion = (activeSuggestion + 1) % options.length;
      } else if (event.key === 'ArrowUp' && options.length) {
        event.preventDefault();
        activeSuggestion = (activeSuggestion - 1 + options.length) % options.length;
      } else if (event.key === 'Enter' && activeSuggestion >= 0 && options[activeSuggestion]) {
        event.preventDefault();
        options[activeSuggestion].click();
        return;
      } else {
        return;
      }

      options.forEach((option, index) => {
        option.setAttribute('aria-selected', index === activeSuggestion ? 'true' : 'false');
      });
      searchInput.setAttribute('aria-activedescendant', options[activeSuggestion].id);
    });
    searchInput.addEventListener('blur', () => {
      window.setTimeout(() => {
        if (!searchForm.contains(document.activeElement)) closeSuggestions();
      }, 150);
    });

    searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const query = searchInput.value.trim();
      closeSuggestions();
      this.navigate(query ? '/products?q=' + encodeURIComponent(query) : '/products');
    });

    // Odjava (ikonica naloga) — briše podatke o prijavljenom korisniku iz sessionStorage
    const logoutLink = nav.querySelector('#logout-link');
    if (logoutLink) {
      const username = sessionStorage.getItem('authUsername');
      if (username) logoutLink.title = 'Odjava (' + username + ')';
      logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.clearAuthSession();
        this.render();
      });
    }

    return nav;
  },

  HomePage() {
    const div = document.createElement('div');
    div.style.cssText = 'padding: 0;';
    div.innerHTML = `
      <section class="seasonal-hero">
        <div class="seasonal-hero-glow" aria-hidden="true"></div>
        <div class="seasonal-hero-copy">
          <p class="seasonal-eyebrow"><span class="seasonal-eyebrow-dot" aria-hidden="true"></span><span class="seasonal-eyebrow-text">Jesenja akcija · do 31. oktobra</span></p>
          <h2><span class="seasonal-heading-line">Nova sezona.</span><span class="seasonal-heading-line seasonal-heading-accent">Nova tehnologija.</span></h2>
          <p class="seasonal-description">Uštedi 20% na Samsung Galaxy S25 telefonima i 10% na MacBook Pro laptopu.</p>
          <a href="#" data-navigate="/products" class="seasonal-cta">Istraži ponudu <span aria-hidden="true">→</span></a>
          <p class="seasonal-note">Ponuda važi do 31. oktobra 2026.</p>
        </div>
        <div class="seasonal-hero-products" aria-label="Izdvajamo iz jesenje ponude">
          <a href="#" data-navigate="/products/10400" class="seasonal-product seasonal-product-phone">
            <img src="slike/image67d92ef46a0b1.jpg.webp" alt="Samsung Galaxy S25">
            <span class="seasonal-product-label">Galaxy S25</span>
            <span class="seasonal-product-badge">20% POPUSTA</span>
          </a>
          <a href="#" data-navigate="/products/30500" class="seasonal-product seasonal-product-laptop">
            <img src="slike/black2_11.jpg.webp" alt="Apple MacBook Pro">
            <span class="seasonal-product-label">MacBook Pro</span>
            <span class="seasonal-product-badge">10% POPUSTA</span>
          </a>
        </div>
      </section>

      <div style="padding: 60px 20px; text-align: center;">
        <h1 style="font-size: 2.5rem; margin-bottom: 20px; color: #333;">Dobrodošli na Tehnosen</h1>
        <p style="font-size: 1.2rem; margin-bottom: 40px; color: #666;">Najbolja tehnička rešenja za vaše potrebe</p>
        <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 250px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
            <img src="slike/images.jpg" alt="Telefoni" style="width: 100%; height: 150px; object-fit: contain; background: #f7f9fb; border-radius: 4px;">
            <h3 style="color: #333;">Telefoni</h3>
            <a href="#" data-navigate="/products?category=Phones" class="product-view-btn">Pogledaj</a>
          </div>
          <div style="flex: 1; min-width: 250px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
            <img src="slike/images (1)-Photoroom.png" alt="Laptopovi" style="width: 100%; height: 150px; object-fit: contain; background: #f7f9fb; border-radius: 4px;">
            <h3 style="color: #333;">Laptopovi</h3>
            <a href="#" data-navigate="/products?category=Laptops" class="product-view-btn">Pogledaj</a>
          </div>
          <div style="flex: 1; min-width: 250px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
            <img src="slike/images (2)-Photoroom.png" alt="Tableti" style="width: 100%; height: 150px; object-fit: contain; background: #f7f9fb; border-radius: 4px;">
            <h3 style="color: #333;">Tableti</h3>
            <a href="#" data-navigate="/products?category=Tablets" class="product-view-btn">Pogledaj</a>
          </div>
        </div>
      </div>
    `;
    return div;
  },

  // --- sessionStorage helperi: podaci važe samo tokom trenutne sesije taba ---

  // Informacija da je korisnik prijavljen (token postoji u sessionStorage-u)
  isLoggedIn() {
    return Boolean(sessionStorage.getItem('authToken'));
  },

  // Podaci o trenutno prijavljenom korisniku (token, username, userId)
  getCurrentUser() {
    if (!this.isLoggedIn()) return null;
    return {
      token: sessionStorage.getItem('authToken'),
      username: sessionStorage.getItem('authUsername'),
      expiresAt: sessionStorage.getItem('authExpiresAt')
    };
  },

  // Privremeni podaci iz forme — čuvaju se u sessionStorage dok sesija traje
  saveFormDraft(key, formData) {
    try {
      sessionStorage.setItem('formDraft_' + key, JSON.stringify(formData));
    } catch (_) { /* sessionStorage nije dostupan */ }
  },

  loadFormDraft(key) {
    try {
      return JSON.parse(sessionStorage.getItem('formDraft_' + key) || 'null');
    } catch (_) {
      return null;
    }
  },

  clearFormDraft(key) {
    sessionStorage.removeItem('formDraft_' + key);
  },

  // State korpe — čuva se u localStorage da bi preživeo zatvaranje taba i refresh
  cart: [],

  loadCart() {
    try {
      this.cart = JSON.parse(localStorage.getItem('cartItems') || '[]');
      if (!Array.isArray(this.cart)) this.cart = [];
    } catch (_) {
      this.cart = [];
    }
  },

  saveCart() {
    try {
      localStorage.setItem('cartItems', JSON.stringify(this.cart));
      return true;
    } catch (_) {
      return false;
    }
  },

  addToCart(product, size) {
    this.loadCart();
    const previousCart = this.cart;
    this.cart = this.cart.map(item => ({ ...item }));
    const existing = this.cart.find(item =>
      item.id === product.id && (item.size || null) === (size || null)
    );
    if (existing) {
      if (existing.quantity >= MAX_CART_QUANTITY) return false;
      existing.quantity += 1;
    } else {
      this.cart.push({
        id: product.id,
        title: product.title,
        price: product.price,
        originalPrice: product.originalPrice,
        discountPercent: product.discountPercent,
        image: product.image,
        category: product.category,
        size: size || null,
        quantity: 1
      });
    }
    if (!this.saveCart()) {
      this.cart = previousCart;
      return 'storage-error';
    }
    this.updateCartBadge(true);
    return true;
  },

  updateCartBadge(animate = false) {
    const badge = document.getElementById('cart-badge');
    if (badge) {
      this.loadCart();
      const total = this.cart.reduce((sum, item) => sum + item.quantity, 0);
      badge.textContent = total;
      badge.hidden = total === 0;
      const cartLink = badge.closest('a');
      if (cartLink) {
        cartLink.setAttribute('aria-label', total === 1 ? 'Korpa, 1 proizvod' : 'Korpa, ' + total + ' proizvoda');
        cartLink.title = total === 1 ? 'Korpa, 1 proizvod' : 'Korpa, ' + total + ' proizvoda';
      }
      if (animate && total > 0) {
        const icon = badge.closest('.cart-icon-wrap');
        if (icon) {
          icon.classList.remove('cart-icon-wrap--added');
          badge.classList.remove('cart-count-badge--updated');
          void icon.offsetWidth;
          icon.classList.add('cart-icon-wrap--added');
          badge.classList.add('cart-count-badge--updated');
        }
      }
    }
  },

  animateCartEject() {
    const icon = document.querySelector('.cart-icon-wrap');
    if (!icon) return;

    icon.classList.remove('cart-icon-wrap--eject');
    void icon.offsetWidth;
    icon.classList.add('cart-icon-wrap--eject');
  },

  async Shop(category, signal) {
    const div = document.createElement('div');
    div.style.cssText = 'padding: 40px 20px; max-width: 1200px; margin: 0 auto;';
    const params = new URLSearchParams(window.location.search);
    const initialCategory = category || params.get('category') || '';
    const initialQuery = params.get('q') || '';

    div.innerHTML = `
      <h1 style="margin-bottom: 24px; color: #333;">Proizvodi</h1>
      <div class="product-filters">
        <label class="product-filter-field">
          <span>Pretraga</span>
          <input id="product-search" type="search" value="${initialQuery.replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]))}" placeholder="Naziv, brend ili boja">
        </label>
        <label class="product-filter-field">
          <span>Kategorija</span>
          <select id="product-category">
            <option value="">Sve kategorije</option>
          </select>
        </label>
        <label class="product-filter-field">
          <span>Dostupnost</span>
          <select id="product-stock">
            <option value="all">Svi proizvodi</option>
            <option value="available">Na stanju</option>
            <option value="unavailable">Nisu na stanju</option>
          </select>
        </label>
        <label class="product-filter-field">
          <span>Sortiranje</span>
          <select id="product-sort">
            <option value="featured">Preporučeno</option>
            <option value="price-asc">Cena: od niže ka višoj</option>
            <option value="price-desc">Cena: od više ka nižoj</option>
            <option value="name-asc">Naziv: A–Z</option>
          </select>
        </label>
        <button id="clear-product-filters" class="clear-product-filters" type="button">Obriši filtere</button>
      </div>
      <p id="product-result-count" class="product-result-count" aria-live="polite"></p>
      <div id="shop-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px;">
        <p style="grid-column: 1 / -1; color: #666;">Učitavanje proizvoda...</p>
      </div>
    `;

    const grid = div.querySelector('#shop-grid');

    try {
      const products = await window.apiClient.getProducts({ signal });
      const translateCategory = value => window.prevodi.translateCategory(value);
      const translateColor = value => window.prevodi.translateColor(value);
      const categoryFilter = div.querySelector('#product-category');
      const categories = [...new Set(products.map(product => product.category).filter(Boolean))]
        .sort((first, second) => translateCategory(first).localeCompare(translateCategory(second), 'sr'));
      categories.forEach(productCategory => {
        const option = document.createElement('option');
        option.value = productCategory;
        option.textContent = translateCategory(productCategory);
        categoryFilter.appendChild(option);
      });
      if (categories.includes(initialCategory)) {
        categoryFilter.value = initialCategory;
      }

      const searchFilter = div.querySelector('#product-search');
      const stockFilter = div.querySelector('#product-stock');
      const sortFilter = div.querySelector('#product-sort');
      const resultCount = div.querySelector('#product-result-count');

      const normalize = value => String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('sr');

      const renderFilteredProducts = () => {
        const query = normalize(searchFilter.value.trim());
        let filtered = products.filter(product => {
          const matchesQuery = !query || [
            product.title,
            product.brand,
            product.category,
            translateCategory(product.category),
            product.color,
            translateColor(product.color),
            product.description
          ].some(value => normalize(value).includes(query));
          const matchesCategory = !categoryFilter.value || product.category === categoryFilter.value;
          const matchesStock = stockFilter.value === 'all' ||
            (stockFilter.value === 'available' ? product.inStock !== false : product.inStock === false);
          return matchesQuery && matchesCategory && matchesStock;
        });

        if (sortFilter.value === 'price-asc') {
          filtered = filtered.slice().sort((first, second) => Number(first.price) - Number(second.price));
        } else if (sortFilter.value === 'price-desc') {
          filtered = filtered.slice().sort((first, second) => Number(second.price) - Number(first.price));
        } else if (sortFilter.value === 'name-asc') {
          filtered = filtered.slice().sort((first, second) => first.title.localeCompare(second.title, 'sr'));
        }

        resultCount.textContent = 'Prikazano ' + filtered.length + ' od ' + products.length + ' proizvoda';
        grid.replaceChildren();
        if (filtered.length === 0) {
          const empty = document.createElement('p');
          empty.className = 'product-empty-state';
          empty.textContent = 'Nema proizvoda koji odgovaraju izabranim filterima.';
          grid.appendChild(empty);
          return;
        }

        filtered.forEach(p => {
          const card = document.createElement('div');
          card.style.cssText = 'border: 1px solid #ddd; border-radius: 8px; overflow: hidden; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; flex-direction: column;';

          const link = document.createElement('a');
          link.href = '#';
          link.setAttribute('data-navigate', '/products/' + p.id);
          link.style.cssText = 'display: block; text-decoration: none;';
          const img = document.createElement('img');
          img.src = window.apiClient.getImageUrl(p.image);
          img.alt = p.title;
          img.style.cssText = 'width: 100%; height: 200px; padding: 8px; object-fit: contain; display: block; background: #f7f9fb;';
          link.appendChild(img);
          card.appendChild(link);

          const body = document.createElement('div');
          body.style.cssText = 'padding: 15px; display: flex; flex-direction: column; flex: 1;';

          const title = document.createElement('h5');
          title.style.cssText = 'margin: 0 0 10px 0; color: #333; font-size: 1rem;';
          const titleLink = document.createElement('a');
          titleLink.href = '#';
          titleLink.setAttribute('data-navigate', '/products/' + p.id);
          titleLink.textContent = p.title;
          titleLink.style.cssText = 'color: inherit; text-decoration: none;';
          title.appendChild(titleLink);
          body.appendChild(title);

          const category = document.createElement('p');
          category.textContent = translateCategory(p.category);
          category.style.cssText = 'margin: 0 0 6px 0; color: #777; font-size: 0.85rem;';
          body.appendChild(category);

          if (p.color) {
            const color = document.createElement('p');
            color.textContent = 'Boja: ' + translateColor(p.color);
            color.style.cssText = 'margin: 0 0 10px 0; color: #777; font-size: 0.85rem;';
            body.appendChild(color);
          }

          const price = document.createElement('div');
          price.className = 'promotion-price';
          if (p.discountPercent) {
            const currentPrice = document.createElement('span');
            currentPrice.className = 'promotion-current-price';
            currentPrice.textContent = Number(p.price).toFixed(2) + ' €';
            const originalPrice = document.createElement('s');
            originalPrice.className = 'promotion-old-price';
            originalPrice.textContent = Number(p.originalPrice).toFixed(2) + ' €';
            const discountBadge = document.createElement('span');
            discountBadge.className = 'promotion-badge';
            discountBadge.textContent = '-' + p.discountPercent + '%';
            price.append(currentPrice, originalPrice, discountBadge);
          } else {
            price.textContent = Number(p.price).toFixed(2) + ' €';
            price.classList.add('promotion-current-price');
          }
          body.appendChild(price);

          const stock = document.createElement('p');
          stock.textContent = p.inStock === false ? 'Trenutno nije na stanju' : 'Na stanju';
          stock.style.cssText = 'color: ' + (p.inStock === false ? '#a93226' : '#218838') + '; margin: 0 0 12px 0;';
          body.appendChild(stock);

          const btn = document.createElement('button');
          btn.className = 'product-card-add-button';
          btn.type = 'button';
          btn.textContent = p.inStock === false ? 'Nije na stanju' : 'Dodaj u korpu';
          btn.disabled = p.inStock === false;
          btn.style.cssText = 'margin-top: auto; padding: 10px; background: #28a745; color: white; border: none; border-radius: 4px; font-size: 0.95rem; font-weight: bold;';
          if (btn.disabled) {
            btn.style.background = '#888';
          }
          btn.addEventListener('click', () => {
            const result = this.addToCart(p);
            if (result !== true) {
              btn.textContent = result === 'storage-error'
                ? 'Korpa nije mogla da se sačuva'
                : 'Maksimalno 99 komada';
              setTimeout(() => {
                btn.textContent = 'Dodaj u korpu';
              }, 1200);
              return;
            }
            btn.textContent = '✓ Dodato';
            btn.style.background = '#218838';
            setTimeout(() => {
              btn.textContent = 'Dodaj u korpu';
              btn.style.background = '#28a745';
            }, 1200);
          });
          body.appendChild(btn);

          card.appendChild(body);
          grid.appendChild(card);
        });

        this.setupNavigation();
      };

      [searchFilter, categoryFilter, stockFilter, sortFilter].forEach(control => {
        control.addEventListener(control === searchFilter ? 'input' : 'change', renderFilteredProducts);
      });
      div.querySelector('#clear-product-filters').addEventListener('click', () => {
        searchFilter.value = '';
        categoryFilter.value = '';
        stockFilter.value = 'all';
        sortFilter.value = 'featured';
        renderFilteredProducts();
      });
      renderFilteredProducts();

      // Nakon rendera poveži navigaciju na nove linkove
      this.setupNavigation();
    } catch (err) {
      const message = document.createElement('p');
      message.style.cssText = 'grid-column: 1 / -1; color: #c0392b;';
      message.textContent = err.message || 'Došlo je do greške pri učitavanju proizvoda.';
      grid.replaceChildren(message);
    }

    return div;
  },

  ProductsPage() {
    return this.Shop();
  },

  async ProductDetailPage(id, signal) {
    const div = document.createElement('div');
    div.className = 'product-detail-page';
    div.innerHTML = '<p style="color: #666;">Učitavanje proizvoda...</p>';

    try {
      const p = await window.apiClient.getProduct(id, { signal });
      const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[character]));
      const imageUrl = window.apiClient.getImageUrl(p.image);
      const translateCategory = value => window.prevodi.translateCategory(value);
      const translateColor = value => window.prevodi.translateColor(value);
      const memoryMatch = p.title.match(/\b(\d+)\s*\/\s*(\d+)\s*(GB|TB)\b/i);
      const categoryName = translateCategory(p.category);
      const specifications = [
        ['Model', p.title],
        ['Kategorija', categoryName],
        p.brand && ['Brend', p.brand],
        p.size && ['Veličina ekrana', p.size],
        p.color && ['Boja', translateColor(p.color)],
        memoryMatch && ['RAM', memoryMatch[1] + ' GB'],
        memoryMatch && ['Memorija', memoryMatch[2] + ' ' + memoryMatch[3].toUpperCase()],
        ['Dostupnost', p.inStock === false ? 'Trenutno nije na stanju' : 'Na stanju']
      ].filter(Boolean);
      const isLoggedIn = Boolean(sessionStorage.getItem('authToken'));
      div.innerHTML = `
        <section class="product-detail-main">
          <div class="product-detail-image-wrap">
            <img src="${escapeHtml(imageUrl)}" id="detail-image" alt="${escapeHtml(p.title)}">
          </div>
          <div class="product-detail-info">
            <p class="product-detail-category">${escapeHtml(categoryName)}</p>
            <h1>${escapeHtml(p.title)}</h1>
            <div class="promotion-price promotion-detail-price" aria-label="Cena proizvoda">
              ${p.discountPercent ? `<span class="promotion-current-price">${Number(p.price).toFixed(2)} €</span><s class="promotion-old-price">${Number(p.originalPrice).toFixed(2)} €</s><span class="promotion-badge">-${p.discountPercent}%</span>` : `<span class="promotion-current-price">${Number(p.price).toFixed(2)} €</span>`}
            </div>
            <p class="product-detail-description">${escapeHtml(p.description)}</p>
            <div class="product-detail-actions">
              <button id="detail-add-btn" ${p.inStock === false ? 'disabled' : ''}>${p.inStock === false ? 'Nije na stanju' : 'Dodaj u korpu'}</button>
              <a href="#" data-navigate="/products">Nazad na proizvode</a>
            </div>
          </div>
        </section>

        <section class="product-detail-section product-specifications">
          <h2>Specifikacije</h2>
          <dl class="specification-list">
            ${specifications.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}
          </dl>
        </section>

        <section class="product-detail-section product-reviews">
          <div class="product-reviews-heading">
            <div><h2>Recenzije kupaca</h2><p id="review-summary" aria-live="polite">Učitavanje recenzija...</p></div>
          </div>
          <div id="product-review-list" class="product-review-list" aria-live="polite"></div>
          ${isLoggedIn ? `
            <form id="product-review-form" class="product-review-form">
              <h3>Napiši recenziju</h3>
              <label for="review-rating">Ocena</label>
              <select id="review-rating" name="rating" required>
                <option value="5">5 — Odlično</option>
                <option value="4">4 — Veoma dobro</option>
                <option value="3">3 — Dobro</option>
                <option value="2">2 — Može bolje</option>
                <option value="1">1 — Loše</option>
              </select>
              <label for="review-comment">Tvoja recenzija</label>
              <textarea id="review-comment" name="comment" minlength="10" maxlength="1000" rows="4" placeholder="Podeli svoje iskustvo sa ovim proizvodom..." required></textarea>
              <p id="review-form-message" role="status" aria-live="polite"></p>
              <button type="submit">Objavi recenziju</button>
            </form>
          ` : `
            <p class="review-login-prompt">Prijavi se da bi ostavio/la recenziju. <a href="#" data-navigate="/login">Prijava</a></p>
          `}
        </section>

        <section class="product-detail-section similar-products-section">
          <h2>Slični proizvodi</h2>
          <div id="similar-products" class="similar-products-grid"><p>Učitavanje sličnih proizvoda...</p></div>
        </section>
      `;

      const addBtn = div.querySelector('#detail-add-btn');
      if (!addBtn.disabled) addBtn.addEventListener('click', () => {
        const result = this.addToCart(p);
        if (result !== true) {
          addBtn.textContent = result === 'storage-error'
            ? 'Korpa nije mogla da se sačuva'
            : 'Maksimalno 99 komada';
          setTimeout(() => {
            addBtn.textContent = 'Dodaj u korpu';
          }, 1200);
          return;
        }
        addBtn.textContent = '✓ Dodato';
        addBtn.style.background = '#218838';
        setTimeout(() => {
          addBtn.textContent = 'Dodaj u korpu';
          addBtn.style.background = '#28a745';
        }, 1200);
      });

      const reviewSummary = div.querySelector('#review-summary');
      const reviewList = div.querySelector('#product-review-list');
      const renderReviews = reviews => {
        reviewList.replaceChildren();
        if (!reviews.length) {
        reviewSummary.textContent = 'Još nema recenzija za ovaj proizvod.';
        const empty = document.createElement('p');
        empty.className = 'product-review-empty';
        empty.textContent = 'Budi prvi/a koji će podeliti utisak.';
        reviewList.appendChild(empty);
        return;
        }

        const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
        const remainderTen = reviews.length % 10;
        const remainderHundred = reviews.length % 100;
        const reviewNoun = remainderTen === 1 && remainderHundred !== 11
          ? 'recenzija'
          : remainderTen >= 2 && remainderTen <= 4 && (remainderHundred < 12 || remainderHundred > 14)
            ? 'recenzije'
            : 'recenzija';
        reviewSummary.textContent = `${average.toFixed(1)} od 5 · ${reviews.length} ${reviewNoun}`;
        reviews.forEach(review => {
        const article = document.createElement('article');
        article.className = 'product-review';
        const header = document.createElement('div');
        header.className = 'product-review-header';
        const author = document.createElement('strong');
        author.textContent = review.username;
        const date = document.createElement('time');
        date.dateTime = review.createdAt;
        date.textContent = new Date(review.createdAt).toLocaleDateString('sr-RS');
        const rating = document.createElement('p');
        rating.className = 'product-review-stars';
        rating.setAttribute('aria-label', `Ocena: ${review.rating} od 5`);
        rating.textContent = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
        const comment = document.createElement('p');
        comment.className = 'product-review-comment';
        comment.textContent = review.comment;
        header.append(author, date);
        article.append(header, rating, comment);
        reviewList.appendChild(article);
        });
      };

      let reviews = [];
      window.apiClient.getProductReviews(id, { signal }).then(result => {
        if (signal.aborted) return;
        reviews = result;
        renderReviews(reviews);
      }).catch(error => {
        if (signal.aborted) return;
        reviewSummary.textContent = 'Recenzije trenutno nisu dostupne.';
        const message = document.createElement('p');
        message.className = 'product-review-error';
        message.textContent = error.message;
        reviewList.replaceChildren(message);
      });

      const reviewForm = div.querySelector('#product-review-form');
      if (reviewForm) {
        const reviewMessage = div.querySelector('#review-form-message');
        reviewForm.addEventListener('submit', async event => {
        event.preventDefault();
        if (!reviewForm.reportValidity()) return;
        const submitButton = reviewForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Objavljivanje...';
        reviewMessage.textContent = '';
        try {
          const review = await window.apiClient.createProductReview(id, {
            rating: Number(div.querySelector('#review-rating').value),
            comment: div.querySelector('#review-comment').value
          });
          reviews = [review, ...reviews];
          renderReviews(reviews);
          reviewForm.reset();
          reviewMessage.textContent = 'Hvala! Tvoja recenzija je objavljena.';
          reviewMessage.className = 'review-form-success';
        } catch (error) {
          reviewMessage.textContent = error.message || 'Recenziju nije moguće objaviti.';
          reviewMessage.className = 'review-form-error';
        } finally {
          submitButton.disabled = false;
          submitButton.textContent = 'Objavi recenziju';
        }
        });
      }

      const similarProducts = div.querySelector('#similar-products');
      window.apiClient.getProducts({ signal }).then(products => {
        if (signal.aborted) return;
        const matches = products.filter(product => product.id !== p.id && product.category === p.category).slice(0, 6);
        similarProducts.replaceChildren();
        if (!matches.length) {
        similarProducts.textContent = 'Trenutno nema sličnih proizvoda.';
        return;
        }

        matches.forEach(product => {
        const card = document.createElement('article');
        card.className = 'similar-product-card';
        const link = document.createElement('a');
        link.href = '#';
        link.dataset.navigate = '/products/' + product.id;
        const productImage = document.createElement('img');
        productImage.src = window.apiClient.getImageUrl(product.image);
        productImage.alt = product.title;
        const title = document.createElement('h3');
        title.textContent = product.title;
        link.append(productImage, title);
        const price = document.createElement('div');
        price.className = 'promotion-price';
        const currentPrice = document.createElement('strong');
        currentPrice.className = 'promotion-current-price';
        currentPrice.textContent = Number(product.price).toFixed(2) + ' €';
        price.appendChild(currentPrice);
        if (product.discountPercent) {
          const originalPrice = document.createElement('s');
          originalPrice.className = 'promotion-old-price';
          originalPrice.textContent = Number(product.originalPrice).toFixed(2) + ' €';
          const badge = document.createElement('span');
          badge.className = 'promotion-badge';
          badge.textContent = '-' + product.discountPercent + '%';
          price.append(originalPrice, badge);
        }
        const stock = document.createElement('p');
        stock.className = product.inStock === false ? 'similar-product-stock unavailable' : 'similar-product-stock';
        stock.textContent = product.inStock === false ? 'Nije na stanju' : 'Na stanju';
        card.append(link, price, stock);
        similarProducts.appendChild(card);
        });
        this.setupNavigation();
      }).catch(error => {
        if (signal.aborted) return;
        similarProducts.textContent = 'Slične proizvode nije moguće učitati: ' + error.message;
      });

      this.setupNavigation();
    } catch (err) {
      div.innerHTML = `
        <p style="color: #c0392b;">${String(err.message || 'Došlo je do greške pri učitavanju proizvoda.').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]))}</p>
        <a href="#" data-navigate="/products" style="display: inline-block; margin-top: 15px; padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px;">Nazad na proizvode</a>
      `;
      this.setupNavigation();
    }

    return div;
  },

  LoginPage() {
    const div = document.createElement('div');
    div.style.cssText = 'padding: 40px 20px; max-width: 500px; margin: 0 auto;';
    div.innerHTML = `
      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 30px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h3 style="margin-top: 0; color: #333; text-align: center;">Prijava</h3>
        <form id="login-form" novalidate>
          <div style="margin-bottom: 15px;">
            <label for="login-username" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Korisničko ime</label>
            <input type="text" id="login-username" style="width: 100%; padding: 10px; border: 1px solid #cfc8bf; background: #ffead8; border-radius: 4px; box-sizing: border-box; height: 46px;">
          </div>
          <div style="margin-bottom: 20px;">
            <label for="login-password" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Lozinka</label>
            <input type="password" id="login-password" style="width: 100%; padding: 10px; border: 1px solid #cfc8bf; background: #ffead8; border-radius: 4px; box-sizing: border-box; height: 46px;">
          </div>
          <div id="login-message" style="display: none; margin-bottom: 15px; padding: 10px; border-radius: 4px; font-size: 0.9rem;"></div>
          <button type="submit" id="login-btn" style="width: 100%; padding: 10px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; font-weight: bold;">Prijava na nalog</button>
        </form>
        <p style="text-align: center; margin-top: 15px; color: #666;">Nemaš nalog? <a href="#" data-navigate="/register" style="color: #0066cc; text-decoration: none; font-weight: bold;">Registruj se</a></p>
      </div>
    `;

    const form = div.querySelector('#login-form');
    const message = div.querySelector('#login-message');
    const button = div.querySelector('#login-btn');

    const showMessage = (text, isError) => {
      message.textContent = text;
      message.style.display = 'block';
      message.style.background = isError ? '#fdecea' : '#e8f5e9';
      message.style.color = isError ? '#c0392b' : '#1e7e34';
      message.style.border = '1px solid ' + (isError ? '#f5b7ae' : '#a3d9a5');
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = div.querySelector('#login-username');
      const password = div.querySelector('#login-password');

      [username, password].forEach(input => input.style.borderColor = '#cfc8bf');
      message.style.display = 'none';

      // Osnovna validacija
      let valid = true;
      const errors = [];

      if (username.value.trim().length < 3) {
        username.style.borderColor = '#c0392b';
        errors.push('Korisničko ime je obavezno.');
        valid = false;
      }
      if (!password.value) {
        password.style.borderColor = '#c0392b';
        errors.push('Lozinka je obavezna.');
        valid = false;
      }

      if (!valid) {
        showMessage(errors.join(' '), true);
        return;
      }

      // Autentikacija na API
      button.disabled = true;
      button.textContent = 'Prijava u toku...';

      try {
        const data = await window.apiClient.login(
          username.value.trim(),
          password.value
        ).catch((err) => {
          if (err.status === 401 || err.status === 403) {
            throw new Error(err.message || 'Pogrešno korisničko ime ili lozinka.');
          }
          if (err.status === 422) {
            throw new Error(err.message || 'Server je odbio podatke — proverite unete informacije.');
          }
          throw new Error(err.message || 'Prijava nije uspela.');
        });

        // Čuvanje prijavljenog korisnika u sessionStorage
        sessionStorage.setItem('authToken', data.token);
        if (data.expiresAt) {
          sessionStorage.setItem('authExpiresAt', data.expiresAt);
        }
        sessionStorage.setItem('authUsername', username.value.trim());
        this.scheduleAuthExpiration();
        showMessage('Prijavljeni ste.', false);
        setTimeout(() => this.navigate('/'), 800);
      } catch (err) {
        showMessage(err.message || 'Došlo je do greške prilikom prijave.', true);
      } finally {
        button.disabled = false;
        button.textContent = 'Prijava na nalog';
      }
    });

    return div;
  },

  RegisterPage() {
    const div = document.createElement('div');
    div.style.cssText = 'padding: 40px 20px; max-width: 500px; margin: 0 auto;';
    const latestBirthdateForAdult = new Date();
    latestBirthdateForAdult.setFullYear(latestBirthdateForAdult.getFullYear() - 18);
    const latestBirthdateValue = [
      latestBirthdateForAdult.getFullYear(),
      String(latestBirthdateForAdult.getMonth() + 1).padStart(2, '0'),
      String(latestBirthdateForAdult.getDate()).padStart(2, '0')
    ].join('-');
    div.innerHTML = `
      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 30px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h3 style="margin-top: 0; color: #333; text-align: center;">Registracija</h3>
        <form id="register-form" novalidate>
          <div style="margin-bottom: 15px;">
            <label for="reg-username" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Korisničko ime</label>
            <input type="text" id="reg-username" style="width: 100%; padding: 10px; border: 1px solid #cfc8bf; background: #ffead8; border-radius: 4px; box-sizing: border-box; height: 46px;">
          </div>
          <div style="margin-bottom: 15px;">
            <label for="reg-email" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Email</label>
            <input type="email" id="reg-email" style="width: 100%; padding: 10px; border: 1px solid #cfc8bf; background: #ffead8; border-radius: 4px; box-sizing: border-box; height: 46px;" placeholder="ti@gmail.com">
          </div>
          <div style="margin-bottom: 15px;">
            <label for="reg-password" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Lozinka</label>
            <input type="password" id="reg-password" style="width: 100%; padding: 10px; border: 1px solid #cfc8bf; background: #ffead8; border-radius: 4px; box-sizing: border-box; height: 46px;">
          </div>
          <div style="margin-bottom: 20px;">
            <label for="reg-birthdate" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Datum rođenja</label>
            <input type="date" id="reg-birthdate" max="${latestBirthdateValue}" style="width: 100%; padding: 10px; border: 1px solid #cfc8bf; background: #ffead8; border-radius: 4px; box-sizing: border-box; height: 46px;">
            <small style="display: block; margin-top: 5px; color: #666;">Morate imati najmanje 18 godina da biste se registrovali.</small>
          </div>
          <div id="register-message" style="display: none; margin-bottom: 15px; padding: 10px; border-radius: 4px; font-size: 0.9rem;"></div>
          <button type="submit" id="register-btn" style="width: 100%; padding: 10px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; font-weight: bold;">Registruj se</button>
        </form>
      </div>
    `;

    const form = div.querySelector('#register-form');
    const message = div.querySelector('#register-message');
    const button = div.querySelector('#register-btn');

    const showMessage = (text, isError) => {
      message.textContent = text;
      message.style.display = 'block';
      message.style.background = isError ? '#fdecea' : '#e8f5e9';
      message.style.color = isError ? '#c0392b' : '#1e7e34';
      message.style.border = '1px solid ' + (isError ? '#f5b7ae' : '#a3d9a5');
    };

    const setFieldError = (input, hasError) => {
      input.style.borderColor = hasError ? '#c0392b' : '#cfc8bf';
    };

    // Privremeni podaci iz forme: vrati sačuvani nacrt iz ove sesije
    const draft = this.loadFormDraft('register');
    if (draft) {
      div.querySelector('#reg-username').value = draft.username || '';
      div.querySelector('#reg-email').value = draft.email || '';
      div.querySelector('#reg-birthdate').value = draft.birthdate || '';
      // lozinka se namerno ne čuva u sessionStorage
    }

    // Čuvaj nacrt pri svakom unosu (samo tokom sesije)
    ;[div.querySelector('#reg-username'), div.querySelector('#reg-email'), div.querySelector('#reg-birthdate')].forEach(input => {
      input.addEventListener('input', () => {
        this.saveFormDraft('register', {
          username: div.querySelector('#reg-username').value,
          email: div.querySelector('#reg-email').value,
          birthdate: div.querySelector('#reg-birthdate').value
        });
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = div.querySelector('#reg-username');
      const email = div.querySelector('#reg-email');
      const password = div.querySelector('#reg-password');
      const birthdate = div.querySelector('#reg-birthdate');

      [username, email, password, birthdate].forEach(input => setFieldError(input, false));
      message.style.display = 'none';

      // Osnovna validacija
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      let valid = true;
      const errors = [];

      if (username.value.trim().length < 3) {
        setFieldError(username, true);
        errors.push('Korisničko ime mora imati najmanje 3 karaktera.');
        valid = false;
      }
      if (!emailPattern.test(email.value.trim())) {
        setFieldError(email, true);
        errors.push('Unesite ispravnu email adresu.');
        valid = false;
      }
      if (password.value.length < 6) {
        setFieldError(password, true);
        errors.push('Lozinka mora imati najmanje 6 karaktera.');
        valid = false;
      }
      if (!birthdate.value) {
        setFieldError(birthdate, true);
        errors.push('Datum rođenja je obavezan.');
        valid = false;
      }

      if (!valid) {
        showMessage(errors.join(' '), true);
        return;
      }

      // Registracija na API
      button.disabled = true;
      button.textContent = 'Registracija u toku...';

      try {
        await window.apiClient.register({
          username: username.value.trim(),
          email: email.value.trim(),
          password: password.value,
          birthdate: birthdate.value
        }).catch((err) => {
          if (err.status === 409) {
            throw new Error(err.message || 'Korisnik sa ovim korisničkim imenom ili email-om već postoji.');
          }
          if (err.status === 422) {
            throw new Error(err.message || 'Server je odbio podatke — proverite unete informacije.');
          }
          throw new Error(err.message || 'Registracija nije uspela.');
        });

        showMessage('Uspešno ste se registrovali! Sada se prijavite na svoj nalog.', false);
        this.clearFormDraft('register');

        form.reset();
      } catch (err) {
        showMessage(err.message || 'Došlo je do greške prilikom registracije.', true);
      } finally {
        button.disabled = false;
        button.textContent = 'Registruj se';
      }
    });

    return div;
  },

  CartPage() {
    const div = document.createElement('div');
    div.style.cssText = 'padding: 40px 20px; max-width: 800px; margin: 0 auto;';

    div.innerHTML = `
      <h1 style="color: #333; margin-bottom: 30px;">Korpa</h1>
      <div id="cart-root"></div>
      <div style="margin-top: 20px; text-align: right; display: flex; gap: 10px; justify-content: flex-end;">
        <a href="#" data-navigate="/products" id="continue-shopping-btn" class="cart-cta-link cart-cta-link--secondary">Nastavite sa kupovinom</a>
        <a href="#" data-navigate="/checkout" id="finish-shopping-btn" class="cart-cta-link cart-cta-link--primary">Završetak kupovine</a>
      </div>
    `;

    // Montiranje React korpe iz prethodnog assignmenta (js/cart.js)
    window.mountReactCart(div.querySelector('#cart-root'));

    this.setupNavigation();
    return div;
  },

  CheckoutPage() {
    const div = document.createElement('div');
    div.style.cssText = 'padding: 40px 20px; max-width: 800px; margin: 0 auto;';

    div.innerHTML = `
      <h1 style="color: #333; margin-bottom: 30px;">Kupovina</h1>

      <div id="cart-root" style="margin-bottom: 30px;"></div>

      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 30px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <form id="checkout-form" novalidate>
          <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #d9d9d9; border-radius: 8px; background: #f9f9f9;">
            <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">Promo kod (opciono)</label>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <input type="text" id="promo-code" placeholder="Unesite promo kod" style="flex: 1 1 180px; min-width: 180px; padding: 10px; border: 1px solid #cfc8bf; background: #ffead8; border-radius: 4px; box-sizing: border-box; height: 46px;">
              <button type="button" id="apply-promo-btn" style="padding: 0 18px; border: none; border-radius: 4px; color: white; cursor: pointer; height: 46px; font-weight: 600;">Primeni</button>
            </div>
          </div>
          <div id="checkout-summary" style="margin-bottom: 20px; padding: 15px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee; color: #333;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Međuzbir:</span>
              <strong id="checkout-subtotal">€0.00</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #1e7e34;">
              <span>Popust:</span>
              <strong id="checkout-discount">-€0.00</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: bold;">
              <span>Ukupno:</span>
              <strong id="checkout-total">€0.00</strong>
            </div>
          </div>
          <h5 style="color: #333; margin: 0 0 20px 0; font-size: 1.1rem; font-weight: bold;">Podaci za dostavu</h5>
          <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Ime i prezime</label>
            <input type="text" id="checkout-name" style="width: 100%; padding: 10px; border: 1px solid #cfc8bf; background: #ffead8; border-radius: 4px; box-sizing: border-box; height: 46px;" required>
          </div>
          <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Telefon</label>
            <input type="tel" id="checkout-phone" style="width: 100%; padding: 10px; border: 1px solid #cfc8bf; background: #ffead8; border-radius: 4px; box-sizing: border-box; height: 46px;" required>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
            <div>
              <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Država</label>
              <select id="checkout-country" style="width: 100%; padding: 10px; border: 1px solid #cfc8bf; background: #ffead8; border-radius: 4px; box-sizing: border-box; height: 46px;" required>
                <option value="">Izaberite</option>
                <option value="Srbija">Srbija</option>
                <option value="Bosna i Hercegovina">Bosna i Hercegovina</option>
                <option value="Hrvatska">Hrvatska</option>
                <option value="Slovenija">Slovenija</option>
              </select>
            </div>
            <div>
              <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Grad</label>
              <select id="checkout-city" style="width: 100%; padding: 10px; border: 1px solid #cfc8bf; background: #ffead8; border-radius: 4px; box-sizing: border-box; height: 46px;" required disabled>
                <option value="">Prvo izaberite državu</option>
              </select>
            </div>
          </div>
          <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Poštanski broj</label>
            <input type="text" id="checkout-postal-code" style="width: 100%; padding: 10px; border: 1px solid #cfc8bf; background: #ffead8; border-radius: 4px; box-sizing: border-box; height: 46px;" required>
          </div>
          <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Adresa</label>
            <input type="text" id="checkout-address" style="width: 100%; padding: 10px; border: 1px solid #cfc8bf; background: #ffead8; border-radius: 4px; box-sizing: border-box; height: 46px;" required>
          </div>
          <div style="margin-bottom: 15px;">
            <label for="checkout-address-details" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Broj stana, sprat, itd. (opciono)</label>
            <input type="text" id="checkout-address-details" style="width: 100%; padding: 10px; border: 1px solid #cfc8bf; background: #ffead8; border-radius: 4px; box-sizing: border-box; height: 46px;">
          </div>
          <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Napomena (opciono)</label>
            <textarea id="checkout-notes" rows="3" style="width: 100%; padding: 10px; border: 1px solid #cfc8bf; background: #ffead8; border-radius: 4px; box-sizing: border-box; resize: vertical;"></textarea>
          </div>
          <label for="save-contact-info" style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px; color: #333; cursor: pointer;">
            <input type="checkbox" id="save-contact-info" style="width: 18px; height: 18px; margin: 0;">
            <span>Sačuvajte informacije za kontakt</span>
          </label>
          <div style="margin-bottom: 20px;">
            <h5 id="payment-method-heading" style="color: #333; margin: 0 0 12px 0; font-size: 1rem; font-weight: bold;">Način plaćanja</h5>
            <div id="payment-method-options" role="group" aria-labelledby="payment-method-heading" aria-required="true" style="display: flex; gap: 12px; flex-wrap: wrap;">
              <button type="button" class="paypal-btn payment-method-btn" data-payment-method="PayPal" aria-pressed="false" style="flex: 1 1 180px; min-width: 180px; padding: 12px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">PayPal</button>
              <button type="button" class="cash-btn payment-method-btn" data-payment-method="Gotovina" aria-pressed="false" style="flex: 1 1 180px; min-width: 180px; padding: 12px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Gotovina</button>
              <button type="button" class="card-btn payment-method-btn" data-payment-method="Kartica" aria-pressed="false" style="flex: 1 1 180px; min-width: 180px; padding: 12px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Kartica</button>
            </div>
            <p id="checkout-payment-error" hidden role="alert" style="margin: 8px 0 0; color: #c0392b; font-size: 0.9rem; font-weight: normal;">Izaberite način plaćanja.</p>
          </div>

          <div id="card-payment-fields" style="display: none; margin-bottom: 20px; padding: 18px; border: 1px solid #d9d9d9; border-radius: 8px; background: #f9f9f9;">
            <h5 style="color: #333; margin: 0 0 15px 0; font-size: 1rem; font-weight: bold;">Podaci za plaćanje karticom</h5>
            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Ime i prezime na kartici</label>
              <input type="text" id="card-holder-name" style="width: 100%; padding: 10px; border: 1px solid #cfc8bf; background: #ffead8; border-radius: 4px; box-sizing: border-box; height: 46px;" required>
            </div>
            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Broj kartice</label>
              <input type="text" id="card-number" inputmode="numeric" maxlength="19" placeholder="1234 5678 9012 3456" style="width: 100%; padding: 10px; border: 1px solid #cfc8bf; background: #ffead8; border-radius: 4px; box-sizing: border-box; height: 46px;" required>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
              <div>
                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Datum isteka</label>
                <input type="text" id="card-expiry" inputmode="numeric" maxlength="5" placeholder="MM/YY" style="width: 100%; padding: 10px; border: 1px solid #cfc8bf; background: #ffead8; border-radius: 4px; box-sizing: border-box; height: 46px;" required>
              </div>
              <div>
                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">CVV</label>
                <input type="password" id="card-cvv" inputmode="numeric" maxlength="4" placeholder="123 ili 1234" style="width: 100%; padding: 10px; border: 1px solid #cfc8bf; background: #ffead8; border-radius: 4px; box-sizing: border-box; height: 46px;" required>
              </div>
            </div>
            <label for="save-card-info" style="display: flex; align-items: center; gap: 8px; margin: 0; color: #333; cursor: pointer;">
              <input type="checkbox" id="save-card-info" style="width: 18px; height: 18px; margin: 0;">
              <span>Sačuvajte informacije o kartici za buduće kupovine</span>
            </label>
          </div>

          <div id="checkout-message" style="display: none; margin-bottom: 15px; padding: 10px; border-radius: 4px; font-size: 0.9rem;"></div>
          <button type="submit" id="pay-btn" class="checkout-submit-btn">Naruči</button>
        </form>
      </div>
    `;

    // Cart komponenta iz prethodnog assignmenta
    window.mountReactCart(div.querySelector('#cart-root'));

    const showMessage = (text, isError) => {
      const message = div.querySelector('#checkout-message');
      if (!message) return;
      message.textContent = text;
      message.hidden = false;
      message.style.display = 'block';
      message.style.background = isError ? '#fdecea' : '#e8f5e9';
      message.style.color = isError ? '#c0392b' : '#1e7e34';
      message.style.border = '1px solid ' + (isError ? '#f5b7ae' : '#a3d9a5');
      message.setAttribute('role', 'alert');
      message.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const clearFieldValidationErrors = () => {
      div.querySelectorAll('.checkout-field-error').forEach(error => {
        const field = div.querySelector('#' + error.dataset.fieldId);
        if (field) {
          field.removeAttribute('aria-invalid');
          field.removeAttribute('aria-describedby');
        }
        error.remove();
      });
    };

    const showFieldValidationError = (field, text) => {
      const error = document.createElement('div');
      error.id = 'checkout-error-' + field.id;
      error.className = 'checkout-field-error';
      error.dataset.fieldId = field.id;
      error.setAttribute('role', 'alert');
      error.style.cssText = 'display: block; margin-top: 5px; color: #c0392b; font-size: 0.9rem; font-weight: normal;';
      error.textContent = text;
      field.insertAdjacentElement('afterend', error);
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', error.id);
    };

    const saveCheckoutDraft = () => {
      this.saveFormDraft('checkout', {
        name: div.querySelector('#checkout-name').value,
        phone: div.querySelector('#checkout-phone').value,
        country: div.querySelector('#checkout-country').value,
        city: div.querySelector('#checkout-city').value,
        postalCode: div.querySelector('#checkout-postal-code').value,
        address: div.querySelector('#checkout-address').value,
        addressDetails: div.querySelector('#checkout-address-details').value,
        notes: div.querySelector('#checkout-notes').value,
        promoCode: div.querySelector('#promo-code').value,
        paymentMethod: div.querySelector('.payment-method-btn--selected')?.dataset.paymentMethod || '',
        cardHolderName: div.querySelector('#save-card-info').checked
          ? div.querySelector('#card-holder-name')?.value || ''
          : '',
        cardExpiry: div.querySelector('#save-card-info').checked
          ? div.querySelector('#card-expiry')?.value || ''
          : '',
        cardCvv: '',
        saveContactInfo: div.querySelector('#save-contact-info').checked,
        saveCardInfo: div.querySelector('#save-card-info').checked
      });
    };

    const formatPhone = (value) => {
      let digitCount = 0;
      return (value || '').replace(/[^\d+\-\s()]/g, '').split('').filter(character => {
        if (!/\d/.test(character)) return true;
        digitCount += 1;
        return digitCount <= 15;
      }).join('');
    };
    const postalCodeLength = country => country === 'Slovenija' ? 4 : 5;
    const formatPostalCode = (value, maxLength = 5) => (value || '').replace(/\D/g, '').slice(0, maxLength);
    const formatName = (value) => (value || '').replace(/[^A-Za-zČĆŽŠĐčćžšđ\s]/g, '').replace(/\s{2,}/g, ' ').trimStart();
    const formatCity = (value) => (value || '').replace(/[^A-Za-zČĆŽŠĐčćžšđ\s-]/g, '').replace(/\s{2,}/g, ' ').trimStart();

    const formatCardNumber = (value) => {
      const digits = (value || '').replace(/\D/g, '').slice(0, 16);
      return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    };

    const formatExpiry = (value) => {
      const digits = (value || '').replace(/\D/g, '').slice(0, 4);
      if (digits.length <= 2) return digits;
      return digits.slice(0, 2) + '/' + digits.slice(2);
    };

    const formatCvv = (value) => (value || '').replace(/\D/g, '').slice(0, 4);

    const isNameValid = (value) => {
      const trimmed = (value || '').trim();
      return /^[A-ZČĆŽŠĐa-zčćžšđ]+(?:\s+[A-ZČĆŽŠĐa-zčćžšđ]+)+$/.test(trimmed);
    };

    const isCityValid = (value) => {
      const trimmed = (value || '').trim();
      return /^[A-ZČĆŽŠĐa-zčćžšđ]+(?:[\s-][A-ZČĆŽŠĐa-zčćžšđ]+)*$/.test(trimmed);
    };

    const isPhoneValid = (value) => {
      const digits = (value || '').replace(/\D/g, '');
      return digits.length >= 9 && digits.length <= 15;
    };

    const isPostalCodeValid = (value, country) => {
      const trimmed = (value || '').trim();
      return new RegExp('^\\d{' + postalCodeLength(country) + '}$').test(trimmed);
    };

    const isCardNumberValid = (value) => {
      const digits = (value || '').replace(/\D/g, '');
      return digits.length === 16;
    };

    const isCardExpiryValid = (value) => {
      const raw = (value || '').replace(/\D/g, '');
      if (raw.length !== 4) return false;
      const month = Number(raw.slice(0, 2));
      const year = Number(raw.slice(2, 4));
      if (month < 1 || month > 12) return false;
      const now = new Date();
      const currentYear = now.getFullYear() % 100;
      const currentMonth = now.getMonth() + 1;
      if (year < currentYear) return false;
      if (year === currentYear && month < currentMonth) return false;
      return true;
    };

    const isCvvValid = (value) => (value || '').replace(/\D/g, '').length >= 3;

    const citiesByCountry = {
      Srbija: ['Beograd', 'Novi Sad', 'Niš', 'Kragujevac', 'Subotica', 'Zrenjanin', 'Pančevo', 'Čačak', 'Novi Pazar', 'Kraljevo', 'Smederevo', 'Leskovac', 'Užice', 'Vranje', 'Valjevo', 'Šabac', 'Sombor', 'Požarevac', 'Pirot'],
      'Bosna i Hercegovina': ['Sarajevo', 'Banja Luka', 'Tuzla', 'Zenica', 'Mostar', 'Bijeljina', 'Brčko', 'Prijedor', 'Doboj', 'Cazin', 'Trebinje', 'Travnik'],
      Hrvatska: ['Zagreb', 'Split', 'Rijeka', 'Osijek', 'Zadar', 'Pula', 'Slavonski Brod', 'Karlovac', 'Varaždin', 'Šibenik', 'Dubrovnik', 'Sisak', 'Vinkovci', 'Vukovar'],
      Slovenija: ['Ljubljana', 'Maribor', 'Celje', 'Kranj', 'Koper', 'Velenje', 'Novo Mesto', 'Ptuj', 'Trbovlje', 'Kamnik', 'Nova Gorica', 'Murska Sobota']
    };

    const updateCityOptions = (selectedCity = '') => {
      const citySelect = div.querySelector('#checkout-city');
      const country = div.querySelector('#checkout-country').value;
      const cities = citiesByCountry[country] || [];
      div.querySelector('#checkout-postal-code').maxLength = postalCodeLength(country);

      citySelect.replaceChildren(new Option(cities.length ? 'Izaberite grad' : 'Prvo izaberite državu', ''));
      cities.forEach(city => citySelect.add(new Option(city, city)));
      citySelect.disabled = cities.length === 0;
      citySelect.value = cities.includes(selectedCity) ? selectedCity : '';
    };

    // Privremeni podaci iz checkout forme: vrati nacrt iz ove sesije
    const checkoutDraft = this.loadFormDraft('checkout');
    if (checkoutDraft) {
      div.querySelector('#checkout-name').value = checkoutDraft.name || '';
      div.querySelector('#checkout-phone').value = formatPhone(checkoutDraft.phone || '');
      div.querySelector('#checkout-country').value = checkoutDraft.country || '';
      updateCityOptions(checkoutDraft.city || '');
      div.querySelector('#checkout-postal-code').value = formatPostalCode(
        checkoutDraft.postalCode || '',
        postalCodeLength(checkoutDraft.country)
      );
      div.querySelector('#checkout-address').value = checkoutDraft.address || '';
      div.querySelector('#checkout-address-details').value = checkoutDraft.addressDetails || '';
      div.querySelector('#checkout-notes').value = checkoutDraft.notes || '';
      div.querySelector('#promo-code').value = checkoutDraft.promoCode || '';
      div.querySelector('#card-holder-name').value = checkoutDraft.cardHolderName || '';
      div.querySelector('#card-expiry').value = checkoutDraft.cardExpiry || '';
      div.querySelector('#save-contact-info').checked = checkoutDraft.saveContactInfo === true;
      div.querySelector('#save-card-info').checked = checkoutDraft.saveCardInfo === true;
      const savedPaymentMethod = checkoutDraft.paymentMethod || '';
      div.querySelectorAll('.payment-method-btn').forEach(btn => {
        const isSelected = btn.dataset.paymentMethod === savedPaymentMethod;
        btn.classList.toggle('payment-method-btn--selected', isSelected);
        btn.setAttribute('aria-pressed', String(isSelected));
      });
      saveCheckoutDraft();
    }
    if (!checkoutDraft) updateCityOptions();

    div.querySelector('#checkout-country').addEventListener('change', () => {
      updateCityOptions();
      const cityError = div.querySelector('#checkout-error-checkout-city');
      if (cityError) {
        div.querySelector('#checkout-city').removeAttribute('aria-invalid');
        div.querySelector('#checkout-city').removeAttribute('aria-describedby');
        cityError.remove();
      }
      saveCheckoutDraft();
    });

    const syncPaymentMethodFields = () => {
      const selectedMethod = div.querySelector('.payment-method-btn--selected')?.dataset.paymentMethod || '';
      const cardFields = div.querySelector('#card-payment-fields');
      const saveCardInfo = div.querySelector('#save-card-info').checked;
      const cardInputs = [
        div.querySelector('#card-holder-name'),
        div.querySelector('#card-number'),
        div.querySelector('#card-expiry'),
        div.querySelector('#card-cvv')
      ];

      const showCardFields = selectedMethod === 'Kartica';
      cardFields.style.display = showCardFields ? 'block' : 'none';
      cardInputs.forEach(input => {
        input.disabled = !showCardFields;
        input.required = showCardFields;
      });

      if (!showCardFields && !saveCardInfo) {
        cardInputs.forEach(input => {
          input.value = '';
        });
      }
    };

    div.querySelectorAll('.payment-method-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        div.querySelectorAll('.payment-method-btn').forEach(item => {
          const selected = item === btn;
          item.classList.toggle('payment-method-btn--selected', selected);
          item.setAttribute('aria-pressed', String(selected));
        });
        const paymentError = div.querySelector('#checkout-payment-error');
        paymentError.hidden = true;
        div.querySelector('#payment-method-options').removeAttribute('aria-invalid');
        syncPaymentMethodFields();
        saveCheckoutDraft();
      });
    });

    [
      div.querySelector('#checkout-name'),
      div.querySelector('#checkout-phone'),
      div.querySelector('#checkout-country'),
      div.querySelector('#checkout-city'),
      div.querySelector('#checkout-postal-code'),
      div.querySelector('#checkout-address'),
      div.querySelector('#checkout-address-details'),
      div.querySelector('#checkout-notes'),
      div.querySelector('#promo-code'),
      div.querySelector('#card-holder-name'),
      div.querySelector('#card-number'),
      div.querySelector('#card-expiry'),
      div.querySelector('#card-cvv')
    ].forEach(input => {
      if (!input) return;
      input.addEventListener('input', () => {
        if (input.id === 'checkout-name') input.value = formatName(input.value);
        if (input.id === 'card-holder-name') input.value = formatName(input.value);
        if (input.id === 'checkout-city') input.value = formatCity(input.value);
        if (input.id === 'checkout-phone') input.value = formatPhone(input.value);
        if (input.id === 'checkout-postal-code') {
          input.value = formatPostalCode(input.value, postalCodeLength(div.querySelector('#checkout-country').value));
        }
        if (input.id === 'card-number') input.value = formatCardNumber(input.value);
        if (input.id === 'card-expiry') input.value = formatExpiry(input.value);
        if (input.id === 'card-cvv') input.value = formatCvv(input.value);
        const fieldError = div.querySelector('#checkout-error-' + input.id);
        if (fieldError) {
          input.removeAttribute('aria-invalid');
          input.removeAttribute('aria-describedby');
          fieldError.remove();
        }
        saveCheckoutDraft();
      });
      input.addEventListener('change', saveCheckoutDraft);
    });

    [div.querySelector('#save-contact-info'), div.querySelector('#save-card-info')]
      .forEach(checkbox => checkbox.addEventListener('change', saveCheckoutDraft));

    const promoRules = {
      SAVE10: { percent: 10, label: '10% popusta' },
      WELCOME15: { percent: 15, label: '15% popusta' },
      FREESHIP: { percent: 0, label: 'besplatna dostava' }
    };

    const getPromoDiscount = (promoCode) => {
      if (!promoCode) return null;
      const normalized = promoCode.trim().toUpperCase();
      return promoRules[normalized] ? { code: normalized, ...promoRules[normalized] } : null;
    };

    const updateOrderSummary = () => {
      this.loadCart();
      const subtotal = this.cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
      const promo = getPromoDiscount(div.querySelector('#promo-code').value);
      const discountPercent = promo ? (promo.percent || 0) : 0;
      const discount = discountPercent > 0 ? subtotal * (discountPercent / 100) : 0;
      const total = subtotal - discount;

      div.querySelector('#checkout-subtotal').textContent = '€' + subtotal.toFixed(2);
      div.querySelector('#checkout-discount').textContent = '-€' + discount.toFixed(2);
      div.querySelector('#checkout-total').textContent = '€' + total.toFixed(2);
    };

    div.querySelector('#apply-promo-btn').addEventListener('click', () => {
      const promoCode = div.querySelector('#promo-code').value.trim();
      saveCheckoutDraft();
      const promo = getPromoDiscount(promoCode);
      if (!promoCode) {
        showMessage('Unesite promo kod.', true);
        updateOrderSummary();
        return;
      }
      if (!promo) {
        showMessage('Promo kod nije važeći. Probajte: SAVE10, WELCOME15 ili FREESHIP.', true);
        updateOrderSummary();
        return;
      }
      updateOrderSummary();
      showMessage('Promo kod "' + promo.code + '" je primenjen: ' + promo.label + '.', false);
    });

    [
      div.querySelector('#promo-code')
    ].forEach(input => {
      input.addEventListener('input', () => {
        saveCheckoutDraft();
        updateOrderSummary();
      });
    });

    updateOrderSummary();
    syncPaymentMethodFields();
    window.addEventListener('storage', updateOrderSummary, { signal: this.pageController.signal });
    window.addEventListener('cart:updated', updateOrderSummary, { signal: this.pageController.signal });

    let orderCompleted = false;
    div.querySelector('#checkout-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payBtn = div.querySelector('#pay-btn');
      if (orderCompleted || payBtn.disabled) return;

      const form = e.target;
      const selectedPaymentButton = div.querySelector('.payment-method-btn--selected');
      const paymentMethod = selectedPaymentButton?.dataset.paymentMethod || '';

      clearFieldValidationErrors();
      const checkoutMessage = div.querySelector('#checkout-message');
      checkoutMessage.hidden = true;
      checkoutMessage.style.display = 'none';
      const paymentError = div.querySelector('#checkout-payment-error');
      paymentError.hidden = !!paymentMethod;
      div.querySelector('#payment-method-options').setAttribute('aria-invalid', String(!paymentMethod));

      const requiredFieldChecks = [
        {
          field: div.querySelector('#checkout-name'),
          message: value => !value
            ? 'Unesite ime i prezime.'
            : 'Unesite i prezime.',
          validate: value => isNameValid(value)
        },
        { field: div.querySelector('#checkout-country'), message: 'Izaberite državu.', validate: value => !!value && value !== 'Izaberite' },
        { field: div.querySelector('#checkout-city'), message: 'Izaberite grad.', validate: value => isCityValid(value) },
        { field: div.querySelector('#checkout-phone'), message: 'Unesite broj telefona (9–15 cifara).', validate: value => isPhoneValid(value) },
        {
          field: div.querySelector('#checkout-postal-code'),
          message: () => 'Unesite poštanski broj sa ' +
            (postalCodeLength(div.querySelector('#checkout-country').value) === 4 ? '4 cifre.' : '5 cifara.'),
          validate: value => isPostalCodeValid(value, div.querySelector('#checkout-country').value)
        },
        { field: div.querySelector('#checkout-address'), message: 'Unesite adresu.', validate: value => !!value }
      ];

      const validationErrors = [];

      requiredFieldChecks.forEach(({ field, message, validate }) => {
        if (!field) return;
        const value = field.value.trim();
        if (!value || !validate(value)) {
          validationErrors.push({ field, message: typeof message === 'function' ? message(value) : message });
        }
      });

      if (paymentMethod === 'Kartica') {
        const cardFields = [
          {
            field: div.querySelector('#card-holder-name'),
            message: value => !value
              ? 'Unesite ime i prezime.'
              : 'Unesite i prezime.',
            validate: isNameValid
          },
          { field: div.querySelector('#card-number'), message: 'Unesite ispravan broj kartice (16 cifara).' },
          { field: div.querySelector('#card-expiry'), message: 'Unesite važeći datum isteka kartice u formatu MM/YY.' },
          { field: div.querySelector('#card-cvv'), message: 'Unesite važeći CVV kod.' }
        ];

        cardFields.forEach(({ field, message }) => {
          if (!field) return;
          const value = field.value.trim();
          const isInvalid = !value ||
            (field.id === 'card-holder-name' && !isNameValid(value)) ||
            (field.id === 'card-number' && !isCardNumberValid(value)) ||
            (field.id === 'card-expiry' && !isCardExpiryValid(value)) ||
            (field.id === 'card-cvv' && !isCvvValid(value));

          if (isInvalid) {
            validationErrors.push({ field, message: typeof message === 'function' ? message(value) : message });
          }
        });
      }

      if (validationErrors.length > 0) {
        validationErrors.forEach(({ field, message }) => showFieldValidationError(field, message));
        const firstInvalidField = validationErrors[0].field;
        firstInvalidField.focus();
        firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      if (!paymentMethod) {
        const firstPaymentButton = div.querySelector('.payment-method-btn');
        firstPaymentButton.focus();
        firstPaymentButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const enteredPromo = div.querySelector('#promo-code').value.trim();
      const promo = getPromoDiscount(enteredPromo);
      if (enteredPromo && !promo) {
        showMessage('Promo kod nije važeći. Probajte: SAVE10, WELCOME15 ili FREESHIP.', true);
        return;
      }

      this.loadCart();
      if (this.cart.length === 0) {
        showMessage('Korpa je prazna — dodajte proizvode pre plaćanja.', true);
        return;
      }
      if (!sessionStorage.getItem('authToken')) {
        showMessage('Prijavite se pre završetka kupovine.', true);
        return;
      }

      payBtn.disabled = true;
      payBtn.textContent = 'Plaćanje u toku...';

      try {
        const deliveryDetails = {
          name: div.querySelector('#checkout-name').value.trim(),
          phone: div.querySelector('#checkout-phone').value.trim(),
          country: div.querySelector('#checkout-country').value.trim(),
          city: div.querySelector('#checkout-city').value.trim(),
          postalCode: div.querySelector('#checkout-postal-code').value.trim(),
          address: div.querySelector('#checkout-address').value.trim(),
          addressDetails: div.querySelector('#checkout-address-details').value.trim(),
          notes: div.querySelector('#checkout-notes').value.trim(),
          promoCode: promo ? promo.code : '',
          paymentMethod
        };

        const created = await window.apiClient.createCart(
          this.cart.map(item => ({ id: item.id, quantity: item.quantity })),
          deliveryDetails
        ).catch((err) => {
          throw new Error(err.message || 'Plaćanje nije uspelo.');
        });

        orderCompleted = true;
        this.cart = [];
        const cartCleared = this.saveCart();
        if (cartCleared) this.updateCartBadge();

        showMessage(
          'Porudžbina #' + created.id + ' je uspešno poslata. Hvala na poverenju!' +
            (cartCleared ? '' : ' Korpa nije mogla da se obriše; nemojte ponovo slati ovu porudžbinu.'),
          false
        );
        const saveContactInfo = div.querySelector('#save-contact-info').checked;
        const saveCardInfo = div.querySelector('#save-card-info').checked;
        const savedContactDetails = saveContactInfo ? {
          name: div.querySelector('#checkout-name').value,
          phone: div.querySelector('#checkout-phone').value,
          country: div.querySelector('#checkout-country').value,
          city: div.querySelector('#checkout-city').value,
          postalCode: div.querySelector('#checkout-postal-code').value,
          address: div.querySelector('#checkout-address').value,
          addressDetails: div.querySelector('#checkout-address-details').value,
          notes: div.querySelector('#checkout-notes').value
        } : null;
        const savedCardDetails = saveCardInfo ? {
          cardHolderName: div.querySelector('#card-holder-name').value,
          cardExpiry: div.querySelector('#card-expiry').value
        } : null;
        this.clearFormDraft('checkout');
        form.reset();
        div.querySelector('#save-contact-info').checked = !!savedContactDetails;
        div.querySelector('#save-card-info').checked = !!savedCardDetails;
        if (savedContactDetails) {
          div.querySelector('#checkout-name').value = savedContactDetails.name;
          div.querySelector('#checkout-phone').value = formatPhone(savedContactDetails.phone);
          div.querySelector('#checkout-country').value = savedContactDetails.country;
          updateCityOptions(savedContactDetails.city);
          div.querySelector('#checkout-postal-code').value = formatPostalCode(
            savedContactDetails.postalCode,
            postalCodeLength(savedContactDetails.country)
          );
          div.querySelector('#checkout-address').value = savedContactDetails.address;
          div.querySelector('#checkout-address-details').value = savedContactDetails.addressDetails;
          div.querySelector('#checkout-notes').value = savedContactDetails.notes;
          div.querySelector('#save-contact-info').checked = true;
        } else {
          updateCityOptions();
        }
        if (savedCardDetails) {
          div.querySelector('#card-holder-name').value = savedCardDetails.cardHolderName;
          div.querySelector('#card-expiry').value = savedCardDetails.cardExpiry;
          div.querySelector('#save-card-info').checked = true;
        }
        div.querySelectorAll('.payment-method-btn').forEach(btn => {
          btn.classList.remove('payment-method-btn--selected');
          btn.setAttribute('aria-pressed', 'false');
        });
        syncPaymentMethodFields();
        saveCheckoutDraft();
        updateOrderSummary();
        // Osvezi prikaz Cart komponente (sad prazne)
        const cartRoot = div.querySelector('#cart-root');
        cartRoot.innerHTML = '';
        window.mountReactCart(cartRoot);
      } catch (err) {
        showMessage(err.message || 'Došlo je do greške prilikom plaćanja.', true);
      } finally {
        payBtn.disabled = orderCompleted;
        payBtn.textContent = orderCompleted ? 'Porudžbina poslata' : 'Naruči';
      }
    });

    this.setupNavigation();
    return div;
  },

  ContactPage() {
    const div = document.createElement('div');
    div.style.cssText = 'padding: 40px 20px; max-width: 900px; margin: 0 auto;';
    div.innerHTML = `
      <h1 style="color: #333; text-align: center; margin-bottom: 10px;">Kontaktirajte nas</h1>
      <p style="color: #666; text-align: center; margin-bottom: 35px;">Imate pitanje? Javite nam se — odgovaramo u najkraćem roku.</p>
      <div style="display: flex; gap: 30px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 260px; border-radius: 12px; padding: 30px;">
          <h3 style="margin-top: 0; color: #333;">Podaci za kontakt</h3>
          <p style="margin: 12px 0; color: #666;"><strong>Adresa:</strong><br>Kneza Miloša 12, 11000 Beograd</p>
          <p style="margin: 12px 0; color: #666;"><strong>Telefon:</strong><br>+381 11 123 4567</p>
          <p style="margin: 12px 0; color: #666;"><strong>Email:</strong><br>info@tehnosen.rs</p>
          <p style="margin: 12px 0; color: #666;"><strong>Radno vreme:</strong><br>pon–sub: 09–21h, ned: 10–18h</p>
        </div>

        <div style="flex: 1.5; min-width: 300px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 12px; padding: 30px;">
          <form id="contact-form" novalidate>
            <label for="contact-name" style="display: block; font-weight: bold; color: #333; margin-bottom: 6px;">Ime i prezime</label>
            <input type="text" id="contact-name" required style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box;" placeholder="Ime i prezime">

            <label for="contact-email" style="display: block; font-weight: bold; color: #333; margin-bottom: 6px;">Email</label>
            <input type="email" id="contact-email" required style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box;" placeholder="vas@email.com">

            <label for="contact-message" style="display: block; font-weight: bold; color: #333; margin-bottom: 6px;">Poruka</label>
            <textarea id="contact-message" rows="5" required style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box; resize: vertical;" placeholder="O čemu se radi?"></textarea>

            <button type="submit" class="contact-submit-button">Pošalji poruku</button>
            <p id="contact-status" style="margin: 15px 0 0 0; font-weight: bold;"></p>
          </form>
        </div>
      </div>
    `;

    const form = div.querySelector('#contact-form');
    const status = div.querySelector('#contact-status');
    const clearContactFieldError = (field) => {
      const error = div.querySelector('#contact-error-' + field.id);
      if (!error) return;
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
      error.remove();
    };

    const showContactFieldError = (field, text) => {
      const error = document.createElement('div');
      error.id = 'contact-error-' + field.id;
      error.className = 'contact-field-error';
      error.setAttribute('role', 'alert');
      error.style.cssText = 'display: block; margin-top: -10px; margin-bottom: 15px; color: #c0392b; font-size: 0.9rem; font-weight: normal;';
      error.textContent = text;
      field.insertAdjacentElement('afterend', error);
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', error.id);
    };

    [div.querySelector('#contact-name'), div.querySelector('#contact-email'), div.querySelector('#contact-message')]
      .forEach(field => field.addEventListener('input', () => clearContactFieldError(field)));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = div.querySelector('#contact-name').value.trim();
      const email = div.querySelector('#contact-email').value.trim();
      const message = div.querySelector('#contact-message').value.trim();
      const fieldsToValidate = [
        {
          field: div.querySelector('#contact-name'),
          value: name,
          error: value => !value ? 'Morate uneti ime i prezime.' : 'Morate uneti i prezime.',
          isValid: value => /^[A-ZČĆŽŠĐa-zčćžšđ]+(?:\s+[A-ZČĆŽŠĐa-zčćžšđ]+)+$/.test(value)
        },
        {
          field: div.querySelector('#contact-email'),
          value: email,
          error: !email ? 'Morate uneti email adresu.' : 'Morate uneti ispravnu email adresu.',
          isValid: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        },
        {
          field: div.querySelector('#contact-message'),
          value: message,
          error: value => !value ? 'Morate uneti poruku.' : 'Poruka mora imati najmanje 10 karaktera.',
          isValid: value => value.length >= 10 && value.length <= 2000
        }
      ];

      status.textContent = '';
      fieldsToValidate.forEach(({ field }) => clearContactFieldError(field));
      const invalidFields = fieldsToValidate
        .filter(({ value, isValid }) => !value || (isValid && !isValid(value)))
        .map(({ field, value, error }) => ({
          field,
          error: typeof error === 'function' ? error(value) : error
        }));
      if (invalidFields.length) {
        invalidFields.forEach(({ field, error }) => showContactFieldError(field, error));
        invalidFields[0].field.focus();
        invalidFields[0].field.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = 'Šaljem...';
      status.style.color = '#1e7e34';
      status.textContent = '';

      try {
        await window.apiClient.sendContactMessage({ name, email, message });
        form.reset();
        status.style.color = '#1e7e34';
        status.textContent = 'Vaša poruka je uspešno poslata.';
      } catch (error) {
        status.style.color = '#a93226';
        status.textContent = error.message || 'Došlo je do greške prilikom slanja poruke. Pokušajte ponovo.';
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Pošalji poruku';
      }
    });

    this.setupNavigation();
    return div;
  },

  AboutUsPage() {
    const div = document.createElement('div');
    div.style.cssText = 'padding: 40px 20px; max-width: 900px; margin: 0 auto;';
    div.innerHTML = `
      <h1 style="color: #333; margin-bottom: 30px;">O nama</h1>
      <div style="color: #666; line-height: 1.8; font-size: 1.05rem;">
        <p>Tehnosen je vodeća kompanija u oblasti prodaje tehnike i elektronike.</p>
        <p>Pružamo najbolje proizvode sa garantijom i odličnom korisnčkom podrškom.</p>
        <p>Naš tim je posvećen tome da vam pruži najbolje iskustvo pri kupovini.</p>
      </div>

      <h2 style="color: #333; margin: 40px 0 10px 0;">Osnovne informacije</h2>
      <div style="color: #666; line-height: 1.8; font-size: 1.05rem;">
        <p><strong>Naziv kompanije:</strong> Tehnosen d.o.o.</p>
        <p><strong>Godina osnivanja:</strong> 2015.</p>
        <p><strong>Sedište:</strong> Bulevar Oslobođenja 123, Beograd, Srbija</p>
        <p><strong>Broj zaposlenih:</strong> 45</p>
        <p><strong>Delatnost:</strong> Maloprodaja tehničkih uređaja i elektronike</p>
        <p><strong>Kontakt telefon:</strong> +381 11 123 4567</p>
        <p><strong>Email:</strong> info@tehnosen.rs</p>
      </div>
    `;
    div.appendChild(this.Team());
    return div;
  },

  Team() {
    const section = document.createElement('section');
    section.style.cssText = 'margin-top: 40px;';

    const heading = document.createElement('h2');
    heading.textContent = 'Meet the Team';
    heading.style.cssText = 'color: #333; margin-bottom: 20px;';
    section.appendChild(heading);

    const grid = document.createElement('div');
    grid.style.cssText = 'display: flex; gap: 20px; flex-wrap: wrap;';

    const employees = [
      { name: 'Filip Anđelković', position: 'Osnivač i CEO', email: 'filip@tehnosen.rs' },
      { name: 'Ana Jovanović', position: 'Menadžer prodaje', email: 'ana@tehnosen.rs' },
      { name: 'Marko Petrović', position: 'Web developer', email: 'marko@tehnosen.rs' },
      { name: 'Jelena Nikolić', position: 'Korisnička podrška', email: 'jelena@tehnosen.rs' }
    ];

    employees.forEach(emp => {
      grid.appendChild(this.Employee(emp));
    });

    section.appendChild(grid);
    return section;
  },

  Employee({ name, position, email }) {
    const card = document.createElement('div');
    card.style.cssText = 'flex: 1; min-width: 200px; max-width: 220px; border: 1px solid #ddd; border-radius: 8px; padding: 20px; text-align: center; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);';

    const initials = name.split(' ').map(part => part[0]).join('');
    const avatar = document.createElement('div');
    avatar.textContent = initials;
    avatar.style.cssText = 'width: 70px; height: 70px; border-radius: 50%; background: #0066cc; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; margin: 0 auto 15px auto;';
    card.appendChild(avatar);

    const nameEl = document.createElement('h4');
    nameEl.textContent = name;
    nameEl.style.cssText = 'color: #333; margin: 0 0 5px 0; font-size: 1.05rem;';
    card.appendChild(nameEl);

    const positionEl = document.createElement('p');
    positionEl.textContent = position;
    positionEl.style.cssText = 'color: #0066cc; font-weight: 600; margin: 0 0 8px 0; font-size: 0.95rem;';
    card.appendChild(positionEl);

    const emailEl = document.createElement('p');
    emailEl.textContent = email;
    emailEl.style.cssText = 'color: #666; margin: 0; font-size: 0.85rem; word-break: break-all;';
    card.appendChild(emailEl);

    return card;
  },

  NotFoundPage() {
    const div = document.createElement('div');
    div.style.cssText = 'padding: 40px 20px; text-align: center;';
    div.innerHTML = `
      <h1 style="color: #333; margin-bottom: 20px;">404 - Stranica nije pronađena</h1>
      <p style="color: #666; font-size: 1.1rem; margin-bottom: 30px;">Izvinjavam se, ali stranica koju tražite ne postoji.</p>
      <a href="#" data-navigate="/" style="display: inline-block; padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px;">Nazad na početnu</a>
    `;
    return div;
  }
};

// Pokreni aplikaciju kada je DOM spreman
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => APP.init());
} else {
  APP.init();
}
