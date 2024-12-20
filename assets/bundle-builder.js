class BundleBuilder extends HTMLElement {
  constructor() {
    super();
    this.bundleSize = parseInt(this.getAttribute('data-bundle-size'), 10);
    this.product = JSON.parse(this.getAttribute('data-product'));
    this.bundleOptions = JSON.parse(this.getAttribute('data-bundle-options'));
    this.bundleProducts = [];
    this.bundleAddToCart = document.querySelector('[data-add-bundle-to-cart]');
    if (this.bundleAddToCart) {
      this.bundleAddToCart.textContent = `Select ${this.bundleSize} more options`;
      this.bundleAddToCart.addEventListener('click', this.bundleCTAClick.bind(this));
    }
    if (this.bundleOptions.length > 0)
      this.getProductsByIds(this.bundleOptions).then((x) => this.buildBundleSelector(x));
  }

  async getProductsByIds(ids) {
    if (!ids || ids.length == 0) return [];
    const query = `
      query getProductsByIds($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            title
            handle
            variants(first: 1) {
              edges {
                node {
                  id
                  title
                  availableForSale
                }
              }
            }
            images(first: 1) {
              edges {
                node {
                  src
                  altText
                }
              }
            }
          }
        }
      }
    `;

    const variables = { ids };
    const url = '/api/2024-10/graphql.json';
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
        },
        body: JSON.stringify({ query, variables }),
      });

      const data = await response.json();

      if (data.errors) {
        console.error('Error fetching products:', data.errors);
        return [];
      }

      const products = data.data.nodes.map((node) => node);
      return products;
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

  async addItemsToCart(items) {
    const url = '/cart/add.js';
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(items),
      });
      const result = await response.json();
      const atcEvent = new Event('atc');
      const cart_drawer = document.querySelector('cart-drawer');
      if (cart_drawer) {
        cart_drawer.classList.remove('is-empty');
        const drawer__inner = cart_drawer.querySelector('.drawer__inner');
        const empty_drawer_el = drawer__inner.querySelector('.drawer__inner-empty');
        if (!!empty_drawer_el) empty_drawer_el.classList.remove('drawer__inner-empty');
        cart_drawer.dispatchEvent(atcEvent);
      }
      const bundleInputs = this.querySelector('[data-bundle-input-holder]').querySelectorAll('[data-bundle-product]');
      bundleInputs.forEach((input) => {
        const siblingImage = input.nextElementSibling;
        input.checked = false;
        siblingImage.classList.remove('border-2');
        siblingImage.classList.remove('border-solid');
        siblingImage.classList.remove('border-teal-600');
        this.bundleAddToCart.textContent = `Select ${this.bundleSize} more options`;
      });
    } catch (error) {
      console.error('ERROR: ', error);
    }
  }

  buildBundleOption(product, parent) {
    const variantId = product.variants.edges[0].node.id.split('/ProductVariant/').pop();
    const variantImage = product.images.edges[0].node.src;
    if (!variantId || !variantImage || !product.variants.edges[0].node.availableForSale) return;

    const bundleLabel = document.createElement('label');
    bundleLabel.classList.add('w-[100px]', 'flex');

    const bundleInput = document.createElement('input');
    bundleInput.type = 'checkbox';
    bundleInput.id = variantId;
    bundleInput.name = 'bundle-option';
    bundleInput.value = variantId;
    bundleInput.classList.add('invisible', 'absolute', '-left-100');
    bundleInput.setAttribute('data-bundle-product', variantId);
    bundleInput.addEventListener('click', (e) => this.bundleOptionClick(e, parent));

    const bundleImage = document.createElement('img');
    bundleImage.src = variantImage;
    bundleImage.alt = product.title;
    bundleImage.classList.add('cursor-pointer');
    bundleLabel.appendChild(bundleInput);
    bundleLabel.appendChild(bundleImage);
    parent.appendChild(bundleLabel);
  }

  bundleOptionClick(e) {
    const bundleInputs = this.querySelector('[data-bundle-input-holder]').querySelectorAll('[data-bundle-product]');
    const selectedBundleOptions = [...bundleInputs].filter((i) => i.checked);
    const siblingImage = e.target.nextElementSibling;
    if (selectedBundleOptions.length > this.bundleSize) {
      e.target.checked = false;
    } else if (selectedBundleOptions.length == this.bundleSize) {
      this.bundleAddToCart.textContent = 'Add to Cart';
      this.bundleAddToCart.disabled = false;
      if (siblingImage && siblingImage.tagName === 'IMG') {
        siblingImage.classList.toggle('border-2', e.target.checked);
        siblingImage.classList.toggle('border-solid', e.target.checked);
        siblingImage.classList.toggle('border-teal-600', e.target.checked);
      }
    } else {
      if (siblingImage && siblingImage.tagName === 'IMG') {
        siblingImage.classList.toggle('border-2', e.target.checked);
        siblingImage.classList.toggle('border-solid', e.target.checked);
        siblingImage.classList.toggle('border-teal-600', e.target.checked);
      }
      this.bundleAddToCart.disabled = true;
      this.bundleAddToCart.textContent = `Select ${this.bundleSize - selectedBundleOptions.length} more options`;
    }
  }

  bundleCTAClick() {
    const itemsToAdd = [];
    const timeStamp = Date.now();
    const data = {
      id: this.product.variants[0].id.toString(),
      quantity: 1,
      properties: {
        _bundle_key: this.product.variants[0].id.toString() + timeStamp,
      },
    };
    const bundle_child_ids = [];
    const bundleInputs = this.querySelector('[data-bundle-input-holder]').querySelectorAll('[data-bundle-product]');
    const selectedBundleOptions = [...bundleInputs].filter((i) => i.checked);
    selectedBundleOptions.forEach((opt) => {
      bundle_child_ids.push(opt.id);
      const bundle_child = {
        id: opt.id,
        quantity: 1,
        properties: {
          _bundle_key: this.product.variants[0].id.toString() + timeStamp,
          _bundle_child: opt.id,
          _bundle_parent_name: this.product.title,
        },
      };
      itemsToAdd.push(bundle_child);
    });
    data.properties['_bundle_children_ids'] = bundle_child_ids.join(',');
    itemsToAdd.push(data);
    const addToCartObj = {
      items: itemsToAdd,
    };
    this.addItemsToCart(addToCartObj);
  }
  buildBundleSelector(products) {
    const container = document.createElement('div');
    container.setAttribute('data-bundle-input-holder', true);
    container.classList.add('flex', 'flex-row', 'flex-wrap', 'gap-2');
    const bundleSelector = document.querySelector('[data-bundle-selector]');
    products.forEach((product) => this.buildBundleOption(product, container));
    if (bundleSelector) bundleSelector.appendChild(container);
  }
}

customElements.define('bundle-builder', BundleBuilder);
