const { useEffect, useState, createContext, useContext } = React;

// ============================================================
// Context API — podaci dostupni vise komponentama:
//   - cartItems: podaci o korpi
//   - itemCount: ukupan broj proizvoda u korpi
// ============================================================
const CartContext = createContext(null);

function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart mora biti koriscen unutar CartProvider-a');
  }
  return context;
}

function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    try {
      const stored = JSON.parse(localStorage.getItem('cartItems') || '[]');
      if (!Array.isArray(stored)) {
        throw new Error('Podaci korpe imaju nevažeći format.');
      }
      const items = stored.map((product) => ({
        ...product,
        name: product.title,
        quantity: product.quantity
      }));
      setCartItems(items);
      if (items.length) {
        window.apiClient.getProducts().then((currentProducts) => {
          if (!isMounted) return;
          const latestStored = JSON.parse(localStorage.getItem('cartItems') || '[]');
          if (!Array.isArray(latestStored)) {
            throw new Error('Podaci korpe imaju nevažeći format.');
          }
          const latestItems = latestStored.map((product) => ({
            ...product,
            name: product.title,
            quantity: product.quantity
          }));
          const productsById = new Map(currentProducts.map((product) => [product.id, product]));
          const updatedItems = latestItems.map((item) => {
            const currentProduct = productsById.get(item.id);
            return currentProduct ? {
              ...item,
              price: currentProduct.price,
              originalPrice: currentProduct.originalPrice,
              discountPercent: currentProduct.discountPercent
            } : item;
          });
          localStorage.setItem('cartItems', JSON.stringify(updatedItems));
          setCartItems(updatedItems);
        }).catch((requestError) => {
          if (isMounted) setError('Korpa nije mogla da se osveži sa aktuelnim cenama: ' + requestError.message);
        }).finally(() => {
          if (isMounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    } catch (e) {
      setError('Korpa nije mogla da se učita: ' + e.message);
      setLoading(false);
    }

    // Sinhronizacija: ako korpa promeni u drugom tabu ili preko APP.addToCart (app.js),
    // 'storage' event se okida u ostalim tabovima, pa osvežavamo state
    const onStorage = (e) => {
      if (e.key !== null && e.key !== 'cartItems') return;
      try {
        const stored = JSON.parse(localStorage.getItem('cartItems') || '[]');
        if (!Array.isArray(stored)) {
          throw new Error('Podaci korpe imaju nevažeći format.');
        }
        setCartItems(stored.map((product) => ({
          ...product,
          name: product.title,
          quantity: product.quantity
        })));
        setError(null);
      } catch (storageError) {
        setError('Korpa nije mogla da se osveži: ' + storageError.message);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      isMounted = false;
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Snimanje stanja u localStorage nakon svake izmene
  function persist(updated) {
    try {
      localStorage.setItem('cartItems', JSON.stringify(updated));
    } catch (storageError) {
      setError('Korpa nije mogla da se sačuva: ' + storageError.message);
      return;
    }
    setError(null);
    setCartItems(updated);
    window.dispatchEvent(new Event('cart:updated'));
  }

  // Ukupan broj proizvoda u korpi (zbir kolicina)
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const value = {
    cartItems,
    itemCount,
    loading,
    error,
    persist
  };

  return React.createElement(CartContext.Provider, { value: value }, children);
}

// Pomocna funkcija za URL slike (centralizovano kroz apiClient)
function cartImageUrl(image) {
  return window.apiClient.getImageUrl(image);
}

function CartItem({ item, onIncrease, onDecrease, onRemove }) {
  const [isRemoving, setIsRemoving] = useState(false);

  function handleAction(event, action) {
    event.stopPropagation();
    action(item.id, item.size);
  }

  function handleRemove(event) {
    event.stopPropagation();
    if (isRemoving) return;

    setIsRemoving(true);
    window.dispatchEvent(new Event('cart:item-removing'));
    window.setTimeout(() => onRemove(item.id, item.size), 320);
  }

  return React.createElement(
    'div',
    { className: 'cart-item-row-react' + (isRemoving ? ' cart-item-row-react--removing' : '') },
    React.createElement(
      'div',
      { className: 'cart-item-image-wrap' },
      React.createElement('img', {
        className: 'cart-item-image',
        src: cartImageUrl(item.image),
        alt: item.name
      })
    ),
    React.createElement(
      'div',
      { className: 'cart-item-content' },
      React.createElement(
        'div',
        { className: 'cart-item-header' },
        React.createElement('h3', { className: 'cart-item-name' }, item.name, item.size ? React.createElement(
          'span',
          { style: { marginLeft: '8px', fontSize: '0.8rem', background: '#e8f0ff', color: '#1d4ed8', borderRadius: '999px', padding: '2px 8px', verticalAlign: 'middle' } },
          'Veličina: ' + item.size
        ) : null),
        React.createElement(
          'button',
          { className: 'cart-item-remove', type: 'button', onClick: handleRemove, disabled: isRemoving },
          isRemoving ? 'Uklanja se...' : 'Ukloni'
        )
      ),
      React.createElement(
        'div',
        { className: 'cart-item-footer' },
        React.createElement(
          'div',
          { className: 'cart-item-quantity-box', 'aria-label': 'Quantity for ' + item.name },
          React.createElement('button', { type: 'button', className: 'qty-button', onClick: (event) => handleAction(event, onDecrease) }, '-'),
          React.createElement('span', { className: 'qty-value' }, item.quantity),
          React.createElement('button', {
            type: 'button',
            className: 'qty-button',
            onClick: (event) => handleAction(event, onIncrease),
            disabled: item.quantity >= 99,
            'aria-label': item.quantity >= 99
              ? 'Maksimalna količina od 99 dostignuta za ' + item.name
              : 'Povećaj količinu za ' + item.name
          }, '+')
        ),
        React.createElement(
          'div',
          { className: 'cart-item-price' },
          item.discountPercent
            ? React.createElement(
              React.Fragment,
              null,
              React.createElement('s', { className: 'promotion-old-price' }, '€' + Number(item.originalPrice).toFixed(2)),
              React.createElement('strong', { className: 'promotion-current-price' }, '€' + Number(item.price).toFixed(2)),
              React.createElement('span', { className: 'promotion-badge' }, '-' + item.discountPercent + '%')
            )
            : '€' + Number(item.price).toFixed(2)
        )
      )
    )
  );
}

function Cart() {
  // Podaci dolaze iz Context-a umesto lokalnog state-a
  const { cartItems, itemCount, loading, error, persist } = useCart();
  const products = cartItems;

  function increaseQuantity(productId, size) {
    persist(products.map((product) => (
      product.id === productId && (product.size || null) === (size || null)
        ? { ...product, quantity: Math.min(99, product.quantity + 1) }
        : product
    )));
  }

  function decreaseQuantity(productId, size) {
    persist(products.map((product) => (
      product.id === productId && (product.size || null) === (size || null)
        ? { ...product, quantity: Math.max(1, product.quantity - 1) }
        : product
    )));
  }

  function removeProduct(productId, size) {
    persist(products.filter((product) => product.id !== productId || (product.size || null) !== (size || null)));
  }

  const total = Math.round(products.reduce((sum, product) => sum + product.price * product.quantity, 0) * 100) / 100;
  const originalTotal = Math.round(products.reduce((sum, product) => sum + (product.discountPercent ? product.originalPrice : product.price) * product.quantity, 0) * 100) / 100;
  const savings = Math.round((originalTotal - total) * 100) / 100;
  return React.createElement(
    'section',
    { className: 'cart-react-container' },
    React.createElement(
      'div',
      { className: 'cart-react-header' },
      React.createElement('h2', null, 'Vaša korpa'),
      // itemCount iz Context-a — broj proizvoda u korpi
      itemCount > 0 ? React.createElement('p', { style: { fontWeight: 'normal', margin: '4px 0 0' } }, 'U korpi: ' + itemCount + ' ' + (itemCount === 1 ? 'proizvod' : 'proizvoda')) : null
    ),
    React.createElement(
      'div',
      { className: 'cart-react-list' },
      loading
        ? React.createElement('p', { className: 'cart-empty' }, 'Loading…')
        : error
          ? React.createElement('p', { className: 'cart-empty' }, error)
          : products.length === 0
            ? React.createElement('p', { className: 'cart-empty' }, 'Vaša korpa je prazna.')
            : products.map((item) => React.createElement(CartItem, {
            key: item.id + '-' + (item.size || 'default'),
            item: item,
            onIncrease: increaseQuantity,
            onDecrease: decreaseQuantity,
            onRemove: removeProduct
          }))),
    React.createElement(
      'div',
      { className: 'cart-react-summary' },
      !loading && !error ? React.createElement(
        React.Fragment,
        null,
        savings > 0 ? React.createElement(
          'span',
          { className: 'cart-promotion-savings' },
          'Ušteda: €' + savings.toFixed(2)
        ) : null,
        React.createElement('span', null, 'Ukupno:'),
        React.createElement('strong', null, '€' + total.toFixed(2))
      ) : null
    )
  );
}

// Montiranje u SPA: app.js poziva mountReactCart(container) pri otvaranju /cart
window.mountReactCart = function (container) {
  ReactDOM.createRoot(container).render(
    React.createElement(CartProvider, null, React.createElement(Cart))
  );
};
