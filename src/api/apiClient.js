const PRODUCTS_API_BASE_URL = window.PRODUCTS_API_BASE_URL || 'http://localhost:3001';

async function request(endpoint, options = {}) {
  const response = await fetch(PRODUCTS_API_BASE_URL + endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    let serverMessage = '';
    try {
      const errorData = await response.json();
      serverMessage = Array.isArray(errorData.errors)
        ? errorData.errors.join(' ')
        : errorData.error || errorData.message || '';
    } catch (_) {
      // odgovor nije JSON
    }
    const err = new Error(serverMessage || ('API request failed with status ' + response.status));
    err.status = response.status;
    throw err;
  }

  return response.json();
}

function getImageUrl(image) {
  return image && image.startsWith('/') ? window.location.origin + image : image;
}

function authHeaders() {
  const token = sessionStorage.getItem('authToken');
  if (!token) {
    throw new Error('Prijavite se da biste nastavili.');
  }
  return { Authorization: 'Bearer ' + token };
}

window.apiClient = {
  getImageUrl,

  // ---- Products ----
  getProducts: (options = {}) => request('/api/products', options),

  getProduct: (id, options = {}) => request('/api/products/' + id, options),

  getProductReviews: (id, options = {}) => request('/api/products/' + id + '/reviews', options),

  createProductReview: (id, review) =>
    request('/api/products/' + id + '/reviews', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(review)
    }),

  login: (username, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),

  register: (userData) =>
    request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),

  getCart: () =>
    request('/api/carts', {
      headers: authHeaders()
    }),

  createCart: (products, delivery) =>
    request('/api/carts', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ...delivery, products })
    }),

  sendContactMessage: (messageData) =>
    request('/api/contact', {
      method: 'POST',
      body: JSON.stringify(messageData)
    })
};
