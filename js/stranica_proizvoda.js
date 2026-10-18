document.addEventListener('DOMContentLoaded', () => {
	async function fetchProducts() {
		return window.apiClient.getProducts();
	}

	const grid = document.getElementById('products');
	if (!grid) return;

	function getCategoryFromQueryString() {
		const params = new URLSearchParams(window.location.search);
		return params.get('category');
	}

	function renderProducts(products) {
		if (!Array.isArray(products) || products.length === 0) {
			grid.innerHTML = '<div class="col-12"><p class="text-center text-muted">Nema proizvoda.</p></div>';
			return;
		}

		grid.innerHTML = '';
		products.forEach(product => {
			const col = document.createElement('div');
			col.className = 'col-md-4 mb-3';

			const card = document.createElement('div');
			card.className = 'card h-100';

			const productUrl = `proizvod.html?id=${encodeURIComponent(product.id)}`;

			const img = document.createElement('img');
			img.src = window.apiClient.getImageUrl(product.image);
			img.className = 'card-img-top';
			img.alt = product.title;

			const cardBody = document.createElement('div');
			cardBody.className = 'card-body d-flex flex-column';

			const title = document.createElement('h5');
			title.className = 'card-title';
			const titleLink = document.createElement('a');
			titleLink.href = productUrl;
			titleLink.textContent = product.title;
			titleLink.className = 'text-decoration-none text-dark';
			title.appendChild(titleLink);

			const price = document.createElement('p');
			price.className = 'card-text mb-1';
			price.textContent = `Cena: ${product.price} €`;

			const btn = document.createElement('button');
			btn.className = 'btn btn-primary product-card-add-button mt-auto';
			btn.type = 'button';
			btn.textContent = 'Dodaj u korpu';
			btn.dataset.id = product.id;
			btn.dataset.title = product.title;
			btn.dataset.price = Number(product.price).toFixed(2);

			cardBody.appendChild(title);
			cardBody.appendChild(price);
			cardBody.appendChild(btn);
			card.appendChild(img);
			card.appendChild(cardBody);
			col.appendChild(card);
			grid.appendChild(col);
		});
	}

	(async () => {
		const selectedCategory = getCategoryFromQueryString();
		try {
			const products = await fetchProducts();
			const filtered = products.filter(product => {
				if (!selectedCategory) return true;
				if (!product.category) return false;
				return String(product.category).toLowerCase().startsWith(String(selectedCategory).toLowerCase());
			});

			renderProducts(filtered);
		} catch (error) {
			const message = document.createElement('p');
			message.className = 'text-center text-danger';
			message.textContent = error.message;
			grid.replaceChildren(message);
		}
	})();

});
