const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PORT = process.env.PORT || 3001;

const productsPath = path.join(__dirname, '..', '..', 'api_response.json');
const dataPath = process.env.API_DATA_PATH || path.join(__dirname, 'data.json');
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 dana uračunato u milisekunde
const PASSWORD_HASH_BYTES = 64;
const PROMOTION_END_DATE = '2026-10-31';
const PROMOTION_EXPIRES_AT = Date.parse('2026-11-01T00:00:00+01:00');
const CITIES_BY_COUNTRY = {
  Srbija: ['Beograd', 'Novi Sad', 'Niš', 'Kragujevac', 'Subotica', 'Zrenjanin', 'Pančevo', 'Čačak', 'Novi Pazar', 'Kraljevo', 'Smederevo', 'Leskovac', 'Užice', 'Vranje', 'Valjevo', 'Šabac', 'Sombor', 'Požarevac', 'Pirot'],
  'Bosna i Hercegovina': ['Sarajevo', 'Banja Luka', 'Tuzla', 'Zenica', 'Mostar', 'Bijeljina', 'Brčko', 'Prijedor', 'Doboj', 'Cazin', 'Trebinje', 'Travnik'],
  Hrvatska: ['Zagreb', 'Split', 'Rijeka', 'Osijek', 'Zadar', 'Pula', 'Slavonski Brod', 'Karlovac', 'Varaždin', 'Šibenik', 'Dubrovnik', 'Sisak', 'Vinkovci', 'Vukovar'],
  Slovenija: ['Ljubljana', 'Maribor', 'Celje', 'Kranj', 'Koper', 'Velenje', 'Novo Mesto', 'Ptuj', 'Trbovlje', 'Kamnik', 'Nova Gorica', 'Murska Sobota']
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function isAtLeast18(birthdate, today = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthdate);
  if (!match) return false;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsedBirthdate = new Date(0);
  parsedBirthdate.setFullYear(year, month - 1, day);

  if (parsedBirthdate.getFullYear() !== year ||
      parsedBirthdate.getMonth() !== month - 1 ||
      parsedBirthdate.getDate() !== day) {
    return false;
  }

  const age = today.getFullYear() - year -
    (today.getMonth() + 1 < month ||
      (today.getMonth() + 1 === month && today.getDate() < day) ? 1 : 0);
  return age >= 18;
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders });
  res.end(JSON.stringify(body));
}

function getProductsData() {
  const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  if (!Array.isArray(products)) {
    throw new Error('Product data must be a JSON array.');
  }
  return products;
}

function applyPromotion(product, date = new Date()) {
  const discountPercent = product.category === 'Laptops' && product.brand === 'SAMSUNG'
    ? 20
    : product.category === 'Laptops' && product.brand === 'Apple' && product.title.includes('MacBook Pro')
      ? 10
      : 0;

  if (!discountPercent || date.getTime() >= PROMOTION_EXPIRES_AT) {
    return { ...product };
  }

  return {
    ...product,
    originalPrice: product.price,
    price: Math.round(product.price * (100 - discountPercent)) / 100,
    discountPercent,
    promotionEndsOn: PROMOTION_END_DATE
  };
}

function getStore() {
  if (!fs.existsSync(dataPath)) {
    return { users: [], sessions: [], orders: [], reviews: [], contacts: [] };
  }

  const store = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  if (!Array.isArray(store.users) || !Array.isArray(store.sessions) || !Array.isArray(store.orders)) {
    throw new Error('API data file has an invalid format.');
  }
  if (store.reviews === undefined) {
    store.reviews = [];
  } else if (!Array.isArray(store.reviews)) {
    throw new Error('API review data has an invalid format.');
  }
  if (store.contacts === undefined) {
    store.contacts = [];
  } else if (!Array.isArray(store.contacts)) {
    throw new Error('API contact data has an invalid format.');
  }
  return store;
}

function saveStore(store) {
  const temporaryPath = dataPath + '.' + process.pid + '.' + crypto.randomBytes(6).toString('hex') + '.tmp';
  try {
    fs.writeFileSync(temporaryPath, JSON.stringify(store, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    fs.renameSync(temporaryPath, dataPath);
  } catch (error) {
    try {
      fs.unlinkSync(temporaryPath);
    } catch (_) {
      // No temporary file was created or it was already moved.
    }
    throw error;
  }
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bodyBytes = 0;
    let tooLarge = false;
    let settled = false;
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      if (tooLarge) return;
      bodyBytes += Buffer.byteLength(chunk);
      if (bodyBytes > 1024 * 1024) {
        tooLarge = true;
        body = '';
        settled = true;
        reject(Object.assign(new Error('Request body is too large.'), { status: 413 }));
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      if (tooLarge || settled) return;
      let parsedBody;
      try {
        parsedBody = body ? JSON.parse(body) : {};
      } catch (_) {
        settled = true;
        reject(Object.assign(new Error('Request body must be valid JSON.'), { status: 400 }));
        return;
      }
      if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
        settled = true;
        reject(Object.assign(new Error('Request body must be a JSON object.'), { status: 400 }));
        return;
      }
      settled = true;
      resolve(parsedBody);
    });
    req.on('error', (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
  });
}

function safeUser(user) {
  return { id: user.id, username: user.username, email: user.email };
}

function createSession(store, user) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  store.sessions = store.sessions.filter((session) => Date.parse(session.expiresAt) > Date.now());
  store.sessions.push({
    tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
    userId: user.id,
    expiresAt
  });
  return { token, expiresAt };
}

function getAuthenticatedUser(req, store) {
  const authorization = req.headers.authorization || '';
  const match = authorization.match(/^Bearer ([a-f0-9]{64})$/i);
  if (!match) return null;

  const tokenHash = crypto.createHash('sha256').update(match[1]).digest('hex');
  const session = store.sessions.find((item) =>
    item.tokenHash === tokenHash && Date.parse(item.expiresAt) > Date.now()
  );
  return session ? store.users.find((user) => user.id === session.userId) || null : null;
}

async function handleRequest(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const { method } = req;

  if (method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  const reviewRoute = url.pathname.match(/^\/api\/products\/(\d+)\/reviews$/);
  if (reviewRoute && (method === 'GET' || method === 'POST')) {
    const productId = Number(reviewRoute[1]);
    const product = getProductsData().find((item) => item.id === productId);
    if (!product) {
      sendJson(res, 404, { error: 'Product not found.' });
      return;
    }

    let store = getStore();
    if (method === 'GET') {
      const reviews = store.reviews
        .filter((review) => review.productId === productId)
        .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt))
        .map(({ id, username, rating, comment, createdAt }) => ({ id, username, rating, comment, createdAt }));
      sendJson(res, 200, reviews);
      return;
    }

    let user = getAuthenticatedUser(req, store);
    if (!user) {
      sendJson(res, 401, { error: 'Prijavite se da biste ostavili recenziju.' });
      return;
    }

    const body = await readJsonBody(req);
    store = getStore();
    user = getAuthenticatedUser(req, store);
    if (!user) {
      sendJson(res, 401, { error: 'Prijavite se da biste ostavili recenziju.' });
      return;
    }
    const rating = Number(body.rating);
    const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length < 10 || comment.length > 1000) {
      sendJson(res, 422, { error: 'Ocena mora biti od 1 do 5, a recenzija između 10 i 1000 karaktera.' });
      return;
    }
    if (store.reviews.some((review) => review.productId === productId && review.userId === user.id)) {
      sendJson(res, 409, { error: 'Već ste ostavili recenziju za ovaj proizvod.' });
      return;
    }

    const review = {
      id: store.reviews.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1,
      productId,
      userId: user.id,
      username: user.username,
      rating,
      comment,
      createdAt: new Date().toISOString()
    };
    store.reviews.push(review);
    saveStore(store);
    sendJson(res, 201, {
      id: review.id,
      username: review.username,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt
    });
    return;
  }

  if (method === 'GET' && (url.pathname === '/api/products' || /^\/api\/products\/\d+$/.test(url.pathname))) {
    const products = getProductsData();
    if (url.pathname === '/api/products') {
      sendJson(res, 200, products.map((product) => applyPromotion(product)));
      return;
    }

    const productId = Number(url.pathname.split('/').pop());
    const product = products.find((item) => item.id === productId);
    sendJson(res, product ? 200 : 404, product ? applyPromotion(product) : { error: 'Product not found.' });
    return;
  }

  if (method === 'POST' && url.pathname === '/api/contact') {
    const body = await readJsonBody(req);
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!/^[A-ZČĆŽŠĐa-zčćžšđ]+(?:\s+[A-ZČĆŽŠĐa-zčćžšđ]+)+$/.test(name)) {
      sendJson(res, 422, { error: 'Morate uneti ime i prezime.' });
      return;
    }
    if (!emailIsValid) {
      sendJson(res, 422, { error: 'Morate uneti ispravnu email adresu.' });
      return;
    }
    if (message.length < 10 || message.length > 2000) {
      sendJson(res, 422, { error: 'Poruka mora imati između 10 i 2000 karaktera.' });
      return;
    }

    const store = getStore();
    const contactMessage = {
      id: store.contacts.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1,
      name,
      email,
      message,
      createdAt: new Date().toISOString()
    };
    store.contacts.push(contactMessage);
    saveStore(store);
    sendJson(res, 201, {
      id: contactMessage.id,
      name: contactMessage.name,
      email: contactMessage.email,
      message: contactMessage.message,
      createdAt: contactMessage.createdAt
    });
    return;
  }

  if (method === 'POST' && url.pathname === '/api/auth/register') {
    const body = await readJsonBody(req);
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const birthdate = typeof body.birthdate === 'string' ? body.birthdate : '';
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (username.length < 3 || !emailIsValid || password.length < 6) {
      sendJson(res, 422, { error: 'Proverite korisničko ime, email, lozinku i datum rođenja.' });
      return;
    }
    if (!isAtLeast18(birthdate)) {
      sendJson(res, 422, { error: 'Morate imati najmanje 18 godina za registraciju.' });
      return;
    }

    const store = getStore();
    if (store.users.some((user) => user.username.toLowerCase() === username.toLowerCase() || user.email === email)) {
      sendJson(res, 409, { error: 'Korisničko ime ili email već postoji.' });
      return;
    }

    const salt = crypto.randomBytes(16);
    const user = {
      id: store.users.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1,
      username,
      email,
      birthdate,
      passwordSalt: salt.toString('hex'),
      passwordHash: crypto.scryptSync(password, salt, PASSWORD_HASH_BYTES).toString('hex')
    };
    store.users.push(user);
    saveStore(store);
    sendJson(res, 201, { user: safeUser(user) });
    return;
  }

  if (method === 'POST' && url.pathname === '/api/auth/login') {
    const body = await readJsonBody(req);
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const store = getStore();
    const user = store.users.find((item) => item.username.toLowerCase() === username.toLowerCase());

    if (!user || !password) {
      sendJson(res, 401, { error: 'Pogrešno korisničko ime ili lozinka.' });
      return;
    }

    const submittedHash = crypto.scryptSync(password, Buffer.from(user.passwordSalt, 'hex'), PASSWORD_HASH_BYTES);
    const storedHash = Buffer.from(user.passwordHash, 'hex');
    if (submittedHash.length !== storedHash.length || !crypto.timingSafeEqual(submittedHash, storedHash)) {
      sendJson(res, 401, { error: 'Pogrešno korisničko ime ili lozinka.' });
      return;
    }

    const session = createSession(store, user);
    saveStore(store);
    sendJson(res, 200, { ...session, user: safeUser(user), userId: user.id });
    return;
  }

  if (url.pathname === '/api/carts') {
    let store = getStore();
    let user = getAuthenticatedUser(req, store);
    if (!user) {
      sendJson(res, 401, { error: 'Prijavite se da biste pristupili svojim porudžbinama.' });
      return;
    }

    if (method === 'GET') {
      sendJson(res, 200, store.orders.filter((order) => order.userId === user.id));
      return;
    }

    if (method === 'POST') {
      const body = await readJsonBody(req);
      store = getStore();
      user = getAuthenticatedUser(req, store);
      if (!user) {
        sendJson(res, 401, { error: 'Prijavite se da biste pristupili svojim porudžbinama.' });
        return;
      }
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
      const country = typeof body.country === 'string' ? body.country.trim() : '';
      const city = typeof body.city === 'string' ? body.city.trim() : '';
      const postalCode = typeof body.postalCode === 'string' ? body.postalCode.trim() : '';
      const address = typeof body.address === 'string' ? body.address.trim() : '';
      const addressDetails = typeof body.addressDetails === 'string' ? body.addressDetails.trim() : '';
      const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
      const paymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod.trim() : '';
      const promoCode = typeof body.promoCode === 'string' ? body.promoCode.trim().toUpperCase() : '';
      const validCountries = Object.keys(CITIES_BY_COUNTRY);
      const validPaymentMethods = ['PayPal', 'Gotovina', 'Kartica'];
      const validPromoCodes = {
        SAVE10: 10,
        WELCOME15: 15,
        FREESHIP: 0
      };
      const promoDiscount = promoCode && validPromoCodes[promoCode] !== undefined ? validPromoCodes[promoCode] : null;

      const phoneDigits = phone.replace(/\D/g, '');
      const validationErrors = [];
      const postalCodeLength = country === 'Slovenija' ? 4 : 5;
      if (!/^[A-ZČĆŽŠĐa-zčćžšđ]+(?:\s+[A-ZČĆŽŠĐa-zčćžšđ]+)+$/.test(name)) {
        validationErrors.push('Unesite ime i prezime.');
      }
      if (phoneDigits.length < 9 || phoneDigits.length > 15) validationErrors.push('Unesite broj telefona (9–15 cifara).');
      if (!validCountries.includes(country)) validationErrors.push('Izaberite državu.');
      if (!CITIES_BY_COUNTRY[country]?.includes(city)) {
        validationErrors.push('Izaberite grad.');
      }
      if (!new RegExp('^\\d{' + postalCodeLength + '}$').test(postalCode)) {
        validationErrors.push('Unesite poštanski broj sa ' + (postalCodeLength === 4 ? '4 cifre.' : '5 cifara.'));
      }
      if (!address) validationErrors.push('Unesite adresu.');
      if (!validPaymentMethods.includes(paymentMethod)) validationErrors.push('Izaberite način plaćanja.');
      if (!Array.isArray(body.products) || body.products.length === 0) validationErrors.push('Dodajte najmanje jedan proizvod.');
      if (validationErrors.length > 0) {
        sendJson(res, 422, { errors: validationErrors });
        return;
      }
      if (promoCode && promoDiscount === null) {
        sendJson(res, 422, { error: 'Promo kod nije važeći. Probajte: SAVE10, WELCOME15 ili FREESHIP.' });
        return;
      }

      const products = getProductsData();
      const items = [];
      const quantitiesByProductId = new Map();
      for (const item of body.products) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          sendJson(res, 422, { error: 'Porudžbina sadrži nevažeći proizvod ili količinu.' });
          return;
        }

        const product = products.find((entry) => entry.id === Number(item.id));
        const quantity = Number(item.quantity);
        const combinedQuantity = product
          ? (quantitiesByProductId.get(product.id) || 0) + quantity
          : quantity;
        if (!product || !Number.isInteger(quantity) || quantity < 1 || combinedQuantity > 99) {
          sendJson(res, 422, { error: 'Porudžbina sadrži nevažeći proizvod ili količinu.' });
          return;
        }
        quantitiesByProductId.set(product.id, combinedQuantity);
      }

      for (const [productId, quantity] of quantitiesByProductId) {
        const product = products.find((entry) => entry.id === productId);
        if (product.inStock === false) {
          sendJson(res, 409, { error: product.title + ' trenutno nije na stanju.' });
          return;
        }
        const promotedProduct = applyPromotion(product);
        items.push({
          id: product.id,
          title: product.title,
          quantity,
          unitPrice: promotedProduct.price,
          originalUnitPrice: promotedProduct.originalPrice || product.price,
          discountPercent: promotedProduct.discountPercent || 0
        });
      }

      const subtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
      const totalDiscount = promoDiscount ? subtotal * (promoDiscount / 100) : 0;
      const total = Math.round((subtotal - totalDiscount) * 100) / 100;

      const order = {
        id: store.orders.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1,
        userId: user.id,
        name,
        phone,
        country,
        city,
        postalCode,
        address,
        addressDetails,
        notes,
        paymentMethod,
        promoCode: promoCode || null,
        discountPercent: promoDiscount || 0,
        products: items,
        total,
        createdAt: new Date().toISOString()
      };
      store.orders.push(order);
      saveStore(store);
      sendJson(res, 201, order);
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  sendJson(res, 404, { error: 'Route not found.' });
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error('API request failed:', error);
    if (!res.headersSent) {
      sendJson(res, error.status || 500, { error: error.status ? error.message : 'Internal server error.' });
    } else {
      res.destroy(error);
    }
  });
});

server.listen(PORT, '127.0.0.1', () => console.log('Store API running at http://localhost:' + PORT));
