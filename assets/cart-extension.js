const url = '/api/2024-10/graphql.json';
let staticCartId;
let storedCartId = localStorage.getItem('cartId');
console.log(storedCartId);

async function cartInit(storedCartId) {
  const getCartQuery = `
    query getCart($cartId: ID!) {
      cart(id: $cartId) {
        id
        lines(first: 10) {
          edges {
            node {
              id
              quantity
            }
          }
        }
      }
    }
  `;

  const variables = { cartId: storedCartId };
  try {
    const cartResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': '', // Replace with your token
      },
      body: JSON.stringify({ query: getCartQuery, variables }),
    });

    const cartData = await cartResponse.json();
    return cartData;
  } catch (e) {
    console.error('ERROR EEK', e);
  }
}
if (storedCartId) {
  console.log('we have a stored cart');
  // Fetch cart data using the saved Cart ID
  cartInit(storedCartId).then((x) => {
    console.log('the cart has inited', x);
  });
} else {
  console.log('NO STORED CART ID');
  createCart().then((cartId) => {
    staticCartId = cartId;
    localStorage.setItem('cartId', cartId);
    console.log(staticCartId);
  });
}

async function getProductsByCollectionHandle(collectionHandle) {
  const query = `
    query($handle: String!, $cursor: String) {
      collectionByHandle(handle: $handle) {
        id
        title
        products(first: 100, after: $cursor) {
          edges {
            node {
              id
              title
              handle
              productType
              vendor
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    sku
                    priceV2 {
                      amount
                      currencyCode
                    }
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
      }
    }
  `;
  const fetchProducts = async (cursor = null) => {
    const variables = {
      handle: collectionHandle,
      cursor: cursor,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': '', // replace with your token
      },
      body: JSON.stringify({ query, variables }),
    });

    const data = await response.json();
    const products = data.data.collectionByHandle.products.edges.map((edge) => edge.node);
    return products;
  };

  try {
    const allProducts = await fetchProducts();
    console.log('All Products:', allProducts);
    return allProducts;
  } catch (error) {
    console.error('Error fetching products:', error);
    console.log(error);
  }
}

async function getProductByHandle(productHandle) {
  const query = `query getProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      descriptionHtml
      productType
      vendor
      handle
      tags
      variants(first: 10) {
        edges {
          node {
            id
            title
            sku
            priceV2 {
              amount
              currencyCode
            }
            availableForSale
          }
        }
      }
      images(first: 10) {
        edges {
          node {
            src
            altText
          }
        }
      }
    }
  }`;
  const fetchProduct = async () => {
    const variables = {
      handle: productHandle,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': '', // replace with your token
      },
      body: JSON.stringify({ query, variables }),
    });

    const data = await response.json();
    console.log('DATA', data);
    const product = data.data.productByHandle;
    console.log('product', product);
    return product;
  };

  try {
    const product = await fetchProduct();
    console.log('All Products:', product);
    return product;
  } catch (error) {
    console.error('Error fetching products:', error);
    console.log(error);
  }
}

async function addItemToCart(variant_id, gwp_attribute) {
  const attributesObject = {};
  attributesObject[gwp_attribute] = true;
  const data = {
    id: variant_id,
    quantity: 1,
    attributes: attributesObject,
  };
  const url = '/cart/add.js';
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    console.log('RESULT');
  } catch (error) {
    console.error('ERROR: ', error);
  }
}

async function createCart() {
  const query = `
    mutation CreateCart {
      cartCreate {
        cart {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': '', // Replace with your Storefront API token
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL Errors:', data.errors);
      throw new Error(data.errors[0].message);
    }

    if (data.data.cartCreate.userErrors.length > 0) {
      console.error('User Errors:', data.data.cartCreate.userErrors);
      throw new Error(data.data.cartCreate.userErrors[0].message);
    }

    const cartId = data.data.cartCreate.cart.id;
    return cartId;
  } catch (error) {
    console.error('Error creating cart:', error);
    return null;
  }
}

// Example usage

function renderThresholdGWP(items = []) {
  const gwp_container = document.createElement('div');
  const threshold_gwp_container = document.querySelector('threshold-gwp');
  gwp_container.classList.add('flex', 'flex-row', 'gap-2');
  items.forEach((item) => {
    const new_product_card = document.createElement('div');
    const product_image = document.createElement('img');
    const button = document.createElement('button');
    button.textContent = 'add to cart';
    button.addEventListener('click', () =>
      addItemToCart(item.variants.edges[0].node.id.split('ProductVariant/').pop(), '_threshold_gwp_product')
    );
    product_image.src = item.images.edges[0].node.src;
    new_product_card.append(product_image);
    new_product_card.append(button);
    gwp_container.appendChild(new_product_card);
  });
  threshold_gwp_container.append(gwp_container);
}

function renderCustomerGWP(item = {}) {
  const gwp_container = document.createElement('div');
  const customer_gwp_container = document.querySelector('customer-gwp');
  const new_product_card = document.createElement('div');
  const product_image = document.createElement('img');
  const button = document.createElement('button');
  button.textContent = 'add to cart';
  console.log('staticCartId', staticCartId);
  console.log(item.variants.edges[0].node.id.split('ProductVariant/').pop());
  button.addEventListener('click', () => {
    addItemToCart(item.variants.edges[0].node.id.split('ProductVariant/').pop(), '_customer_gwp_product');
  });
  product_image.src = item.images.edges[0].node.src;
  new_product_card.append(product_image);
  new_product_card.append(button);
  gwp_container.appendChild(new_product_card);
  customer_gwp_container.append(gwp_container);
}

class thresholdProgressBar extends HTMLElement {
  constructor() {
    super();
    this.cartTotal = parseFloat(this.getAttribute('data-cart-value'));
    this.thresholdValue = parseFloat(this.getAttribute('data-threshold-value'));
    this.progress = this.querySelector('[data-progress]');
    this.gwpMessage = this.querySelector('[data-gift-message]');
  }

  connectedCallback() {
    this.updateProgressBar();
  }

  updateProgressBar() {
    const progressPercent = Math.min((this.cartTotal / this.thresholdValue) * 100, 100);

    if (this.progress) {
      this.progress.style.width = progressPercent + '%';
    }

    if (this.gwpMessage) {
      this.gwpMessage.classList.toggle('hidden', progressPercent !== 100);
    }

    // Dispatch event to parent component if threshold is met
    const thresholdGWP = this.parentElement.querySelector('threshold-gwp');
    if (thresholdGWP) {
      thresholdGWP.dispatchEvent(
        new CustomEvent('thresholdChanged', {
          detail: {
            thresholdMet: progressPercent === 100,
          },
        })
      );
    }
  }
}

customElements.define('threshold-progress-bar', thresholdProgressBar);

class thresholdGWP extends HTMLElement {
  constructor() {
    super();
    this.productCards = this.querySelectorAll('[data-gwp-product]');
    this.gwpCollectionHandle = this.getAttribute('data-gwp-collection');
    getProductsByCollectionHandle(this.gwpCollectionHandle).then((x) => {
      renderThresholdGWP(x);
    });
  }
}

customElements.define('threshold-gwp', thresholdGWP);

class customerGWP extends HTMLElement {
  constructor() {
    super();
    this.customerGWPHandle = this.getAttribute('data-customer-gwp');
    getProductByHandle(this.customerGWPHandle).then((x) => {
      renderCustomerGWP(x);
    });
  }
}

customElements.define('customer-gwp', customerGWP);
