// --- 1. DEFINISANJE GLOBALNIH KONSTANTI I PROMENLJIVIH ---
var cartIcon = document.getElementById('cart-icon');
var dropdown = document.getElementById('cart-dropdown');
var PRODUCT1_NAME = "SAMSUNG Galaxy S25 12/128GB Ledeno-plavi";
var PRODUCT1_PRICE = 99999.99; // Cena u RSD
var PRODUCT1_QTY = 5;
var PRODUCT2_NAME = "SAMSUNG Galaxy S25 FE 8/128GB Mint";
var PRODUCT2_PRICE = 105599.99; // Cena u RSD
var PRODUCT2_QTY = 12;
var VAT_RATE = 0.2; // PDV 20%
var CURRENCY = "EUR";
var VALID_COUPONS = ["SAVE10", "SAVE15", "FREESHIP", "POPUST2026", "KUPONKOD", "SUPER"];
var COUPON_MESSAGES = {
    "SAVE10": "Vaš kupon donosi 10% popusta.",
    "SAVE15": "Vaš kupon donosi 15% popusta.",
    "FREESHIP": "Vaš kupon donosi besplatnu dostavu.",
    "POPUST2026": "Vaš kupon donosi popust za 2026.",
    "KUPONKOD": "Vaš KUPONKOD je validan.",
    "SUPER": "Super kupon je aktiviran."
};
var USD_PER_EUR = 1.16;
var iznos = 0;

// Asocijativni niz svih proizvoda
var products = {
    "10400": {
        name: "SAMSUNG Galaxy S25 12/128GB Ledeno-plavi",
        price: 980.00,
        qty: 5
    },
    "9020": {
        name: "SAMSUNG Galaxy S25 FE 8/128GB Mint",
        price: 1040.00,
        qty: 6
    },
    "5100": {
        name: "SAMSUNG Galaxy S25 Ultra 16/512GB Srebrni",
        price: 1380.00,
        qty: 7
    },
    "7200": {
        name: "SAMSUNG Galaxy S25 FE 8/128GB Crni",
        price: 1035.00,
        qty: 8
    },
    "15100": {
        name: "SAMSUNG Galaxy S25 FE 8/128GB Navy",
        price: 1035.00,
        qty: 9
    },
    "5101": {
        name: "SAMSUNG Galaxy S25 Ultra 12/128GB Koralno-crveni",
        price: 1265.00,
        qty: 4
    },
    "10900": {
        name: "SAMSUNG Galaxy S25 FE 8/128GB Amber-žuti",
        price: 1090.00,
        qty: 10
    }
};

/* function calculateTotalInventoryValue() {
    var totalValue = 0;
    for (var productId in products) {
        if (products.hasOwnProperty(productId)) {
            var product = products[productId];
            totalValue += product.price * product.qty;
        }
    }
    return totalValue;
} */

//console.log("Ukupna vrednost lagera:", calculateTotalInventoryValue().toFixed(2));

function calculateTotal(products) {
  var total = 0;
  for (var i = 0; i < products.length; i++) {
    total += products[i].price * products[i].qty;
  }
  return total;
}

console.log("Ukupna vrednost lagera:", calculateTotal(Object.values(products)).toFixed(2));

// Kreiranje niza lowStock sa proizvodima gde je qty < 10
var lowStock = [];
for (var productId in products) {
    if (products.hasOwnProperty(productId)) {
        if (products[productId].qty < 10) {
            lowStock.push(products[productId]);
        }
    }
}

console.log("Proizvodi sa niskim stanjem:", lowStock);

function findProductByName(list, searchName) {
    var lowerSearchName = searchName.toLowerCase();
    for (var productId in list) {
        if (list.hasOwnProperty(productId)) {
            var product = list[productId];
            if (product.name.toLowerCase().includes(lowerSearchName)) {
                return product;
            }
        }
    }
    return null;
}

console.log("Pronalaženje proizvoda - Galaxy S25 Ultra:", findProductByName(products, "Galaxy S25 Ultra"));
console.log("Pronalaženje proizvoda - Mint:", findProductByName(products, "Mint"));

// Originalне količine proizvoda za resetovanje
var originalProductQuantities = {
    "10400": 5,
    "9020": 6,
    "5100": 7,
    "7200": 8,
    "15100": 9,
    "5101": 4,
    "10900": 10
};

// Ispis tipova promenljivih
console.log(typeof PRODUCT1_NAME); // "string"
console.log(typeof PRODUCT1_PRICE); // "number"
console.log(typeof PRODUCT1_QTY);   // "number" (u JS-u su celi brojevi i float isti tip)

// --- 2. LOGIKA ZA KORPU (DODAVANJE I BADGE) ---

function updateCartBadge() {
    var cartCountElement = document.getElementById('cart-count');
    if (!cartCountElement) return;

    var cart = JSON.parse(localStorage.getItem('cart')) || [];
    var totalItems = 0;
    for (var i = 0; i < cart.length; i++) {
        // totalItems += cart[i].quantity;
        totalItems += cart[i].qty; // Dodavanje količine svakog artikla
    }

    if (totalItems > 0) {
        cartCountElement.innerText = totalItems;
        cartCountElement.style.display = 'block';
    } else {
        cartCountElement.style.display = 'none';
    }
}

function addToCart(event) {
    var button = event.currentTarget;
    var id = button.getAttribute('data-id');
    var price = parseFloat(button.getAttribute('data-price'));
    var name = button.getAttribute('data-name');

   
    var cart = JSON.parse(localStorage.getItem('cart')) || [];
    var existingItem = null;
    for (var i = 0; i < cart.length; i++) {
        if (cart[i].id === id) {
            existingItem = cart[i];
            break;
        }
    }

    if (existingItem) {
        existingItem.qty += 1;
    } else {
        // cart.push({ id: id, name: name, price: price, quantity: 1 });
        cart.push({ id: id, name: name, price: price, qty: 1 });
    }

    // Smanjenje količine na stanju
    products[id].qty -= 1;

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge(); 
    alert(name + ' je dodat u korpu!');
    updateButtonStates(); // Ažuriraj stanje dugmadi nakon promene količine
}

function updateButtonStates() {
    var buttons = document.querySelectorAll('.btn-primary[data-id]');
    buttons.forEach(function(button) {
        var id = button.getAttribute('data-id');
        if (products[id] && products[id].qty <= 0) {
            button.style.textDecoration = 'line-through';
            button.disabled = true;
        } else {
            button.style.textDecoration = 'none';
            button.disabled = false;
            button.innerText = 'Dodajte u korpu';
        }
    })
     // Ažuriraj dostupnost za glavni proizvod
    var availabilities = document.getElementById('availability');
    if (availabilities) {
        var mainId = '10400'; // ID glavnog proizvoda
        if (products[mainId] && products[mainId].qty <= 0) {
            availabilities.innerText = 'Dostupnost: Nema na stanju';
        } else {
            availabilities.innerText = 'Dostupnost: Na stanju';
        }
    }
}

function dodajNaIznos(price) {
    iznos += price;
    console.log(`Dodato na iznos: $${price}. Trenutni ukupni iznos: $${iznos}`);
}

// Povezivanje dugmića za dodavanje
var buttons = document.querySelectorAll('.product-page .btn-primary');
for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', addToCart);
}

// --- 3. LOGIKA ZA DROPDOWN I UKUPAN IZNOS ---

function getCartTotal() {
    var cartItems = JSON.parse(localStorage.getItem('cart')) || [];
    var sum = 0;
    for (var i = 0; i < cartItems.length; i++) {
        sum += cartItems[i].price * cartItems[i].qty;
    }
    return sum;
}

/*function renderCartDropdown() {
    const listContainer = document.getElementById('cart-items-list');
    const totalElement = document.getElementById('cart-dropdown-total');
    if (!listContainer || !totalElement) return;

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    listContainer.innerHTML = '';
    
    if (cart.length === 0) {
        listContainer.innerHTML = '<p style="color: #888;">Korpa je prazna.</p>';
        totalElement.innerText = '$0.00';
        return;
    }

    cart.forEach(item => {
        const itemRow = document.createElement('div');
        itemRow.style.cssText = 'display: flex; font-size: 14px;';
        itemRow.innerHTML = `<span>${item.name} (x${item.quantity})</span><span>$${(item.price * item.quantity).toFixed(2)}</span>`;
        listContainer.appendChild(itemRow);
    });

    totalElement.innerText = `$${getCartTotal().toFixed(2)}`;
}*/

function renderCartDropdown() {
    var listContainer = document.getElementById('cart-items-list');
    var totalElement = document.getElementById('cart-dropdown-total');
    if (!listContainer || !totalElement) return;
    
    var cart = JSON.parse(localStorage.getItem('cart')) || [];
    var total = 0;
    var html = '';

    if (cart.length === 0) {
        html = '<p style="color: #888; text-align: center;">Korpa je prazna.</p>';
        totalElement.innerText = '$0.00';
    } else {
        for (var i = 0; i < cart.length; i++) {
            var item = cart[i];
            var itemTotal = item.price * item.qty;
            total += itemTotal;
            html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 14px; border-bottom: 1px solid #f0f0f0; padding-bottom: 5px;">' +
                '<div style="flex: 1;">' +
                    '<div style="font-weight: bold;">' + item.name + '</div>' +
                    '<div style="color: #666;">$' + item.price.toFixed(2) + '</div>' +
                '</div>' +
                '<div style="display: flex; align-items: center; gap: 8px;">' +
                    '<button onclick="promeniKolicinu(\'' + item.id + '\', -1); event.stopPropagation();" style="width: 25px; cursor: pointer; border: 1px solid #ccc; background: #eee;">-</button>' +
                    '<span style="min-width: 20px; text-align: center;">' + item.qty + '</span>' +
                    '<button onclick="promeniKolicinu(\'' + item.id + '\', 1); event.stopPropagation();" style="width: 25px; cursor: pointer; border: 1px solid #ccc; background: #eee;">+</button>' +
                '</div>' +
                '<div style="margin-left: 10px; font-weight: bold; min-width: 60px; text-align: right;">$' + itemTotal.toFixed(2) + '</div>' +
            '</div>';
        }
        totalElement.innerText = '$' + total.toFixed(2);
    }

    listContainer.innerHTML = html;

    // Uklanjanje postojećeg dugmeta ako postoji
    var existingBtn = document.getElementById('checkout-btn');
    if (existingBtn) {
        existingBtn.remove();
    }
    // Dodavanje dugmeta za checkout ako korpa nije prazna
    if (cart.length > 0) {
        var checkoutBtn = document.createElement('button');
        checkoutBtn.id = 'checkout-btn';
        checkoutBtn.innerText = 'Nastavite na plaćanje';
        checkoutBtn.className = 'btn btn-primary w-100 mt-2';
        checkoutBtn.onclick = function() { window.location.href = 'potvrda_kupovine.html'; };
        totalElement.parentNode.appendChild(checkoutBtn);
    }
}

// Funkcija za menjanje količine (+ ili -)
window.promeniKolicinu = function(id, promena) {
    var cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Pronalaženje indeks artikla u nizu
    var index = -1;
    for (var i = 0; i < cart.length; i++) {
        if (cart[i].id === id) {
            index = i;
            break;
        }
    }

    if (index !== -1) {
        if (promena > 0) {
            // Provera da li ima dovoljno na stanju
            if (products[id] && products[id].qty <= 0) {
                alert('Nema dovoljno količine na stanju.');
                return;
            }
            products[id].qty -= 1;
        } else if (promena < 0) {
            // Vraćanje količine na stanje
            products[id].qty += 1;
        }
        cart[index].qty += promena;

        // Ako je količina 0 ili manja, izbacivanje artikla iz korpe
        if (cart[index].qty <= 0) {
            cart.splice(index, 1);
        }
    }

    // Sačuvanje novih podataka i osveživanje prikaza
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();   // Osvežava crvenu brojku
    renderCartDropdown(); // Osvežava listu u prozoru
    updateButtonStates(); // Ažuriraj stanje dugmadi
};

// Event listener za ikonicu (Toggle dropdown)
if (cartIcon) {
    cartIcon.addEventListener('click', function(e) {
        alert("Trenutni iznos je: " + (getCartTotal() / USD_PER_EUR).toFixed(2) + " EUR"); 
        e.preventDefault();
        e.stopPropagation();
        if (dropdown) {
            var isVisible = dropdown.style.display === 'block';
            dropdown.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) renderCartDropdown();
        }
    });
}

// Dugme za pražnjenje
var clearBtn = document.getElementById('clear-cart-dropdown');
if (clearBtn) {
    clearBtn.addEventListener('click', function() {
        if (confirm("Da li sigurno želite da ispraznite celu korpu?")) {
            localStorage.removeItem('cart');
            
            // Vrati originalne količine svih proizvoda
            for (var id in originalProductQuantities) {
                if (products[id]) {
                    products[id].qty = originalProductQuantities[id];
                }
            }
            
            updateCartBadge();
            renderCartDropdown();
            updateButtonStates(); // Omogući sve dugmice
        }
    });
}

// Sprečavanje zatvaranja dropdown-a klikom unutar njega
if (dropdown) {
    dropdown.addEventListener('click', function(e) {
        e.stopPropagation();
    });
}

// Zatvaranje dropdown-a klikom van njega
window.addEventListener('click', function(e) {
    var wrapper = document.querySelector('.cart-wrapper');
    if (wrapper && !wrapper.contains(e.target) && e.target !== cartIcon && dropdown) {
        dropdown.style.display = 'none';
    }
});

// --- 4. KUPONI I LOGIN ---

function normalizeCoupon(code) {
    // Provera da li je input string (opciono, ali preporučljivo)
    if (typeof code !== 'string') return ''; // Vraća prazan string ako prosleđena vrednost nije tekst
    return code.toUpperCase().trim();
}

// Primeri upotrebe:
console.log(normalizeCoupon("  popust2026  ")); // Izlaz: "POPUST2026"
console.log(normalizeCoupon("KuponKod "));      // Izlaz: "KUPONKOD"
console.log(normalizeCoupon("  super"));        // Izlaz: "SUPER"

function isValidCoupon(code) {
    var normalizedCode = normalizeCoupon(code);
    for (var i = 0; i < VALID_COUPONS.length; i++) {
        if (VALID_COUPONS[i] === normalizedCode) {
            return true;
        }
    }
    return false;
}

function validateAndNotify() {
    var inputField = document.querySelector('#promo-input');
    if (!inputField) return;
    
    var couponCode = inputField.value;
    var normalizedCode = normalizeCoupon(couponCode);
    var valid = isValidCoupon(normalizedCode);
    if (couponCode !== normalizedCode) {
        if (valid) {
            alert("Kupon kod mora biti velikim slovima bez razmaka.");
            return;
        }
        alert("Uneli ste nevažeći kupon kod.");
        return;
    }
    if (valid) {
        var message = COUPON_MESSAGES[normalizedCode];
        alert(message);
    } else {
        alert("Uneli ste nevažeći kupon kod.");
    }
}

var applyBtn = document.querySelector('#apply-btn');
if (applyBtn) {
    applyBtn.addEventListener('click', function(e) {
        validateAndNotify();
    });
}

function login() {
    var emailElement = document.getElementById("email");
    var email = emailElement ? emailElement.value.trim() : "";
    var passwordElement = document.getElementById("pwd");
    var password = passwordElement ? passwordElement.value.trim() : "";
    return (email === "admin" && password === "admin");
}

function proveriLogin() {
    var uspeh = login();
    var ispis = document.getElementById("poruka");
    if (ispis) {
        ispis.style.color = uspeh ? "green" : "red";
        ispis.innerText = uspeh ? "Uspešno logovanje: true" : "Neuspešno logovanje: false";
    }
}

// Inicijalizacija pri učitavanju
updateCartBadge();
renderCartDropdown();
updateButtonStates();