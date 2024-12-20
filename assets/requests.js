const storefrontAccessToken = 'd361d4c2733c429312daf85fe5030681';
const storefrontUrl = '/api/2024-10/graphql.json';

// Storefront API Functions
async function getProductsByCollectionHandle(collectionHandle) {
  const query = `
    query($handle: String!) {
      collectionByHandle(handle: $handle) {
        id
        title
        products(first: 100) {
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
  const fetchProducts = async () => {
    const variables = {
      handle: collectionHandle,
    };

    const response = await fetch(storefrontUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    const data = await response.json();
    const products = data.data.collectionByHandle.products.edges.map((edge) => edge.node);
    return products;
  };

  try {
    const allProducts = await fetchProducts();
    return allProducts;
  } catch (error) {
    console.error('Error fetching products:', error);
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

    const response = await fetch(storefrontUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    const data = await response.json();
    const product = data.data.productByHandle;
    return product;
  };

  try {
    const product = await fetchProduct();
    return product;
  } catch (error) {
    console.error('Error fetching products:', error);
  }
}

// Cart API Functions
async function addItemToCart(variant_id, gwp_attribute) {
  const cart_items = document.querySelector('cart-drawer-items');
  const attributesObject = {};
  attributesObject[gwp_attribute] = true;
  const data = {
    id: variant_id,
    quantity: 1,
    properties: attributesObject,
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
    const cartUpdateEvent = new Event('gwpAtc');
    cart_items.dispatchEvent(cartUpdateEvent);
  } catch (error) {
    console.error('ERROR: ', error);
  }
}

async function removeItemsFromCart(items) {
  const cart_items = document.querySelector('cart-drawer-items');
  let updates = {};
  items.forEach((item) => {
    updates[item.key] = 0;
  });
  fetch(window.Shopify.routes.root + 'cart/update.js', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ updates }),
  })
    .then((response) => {
      const cartUpdateEvent = new Event('gwpAtc');
      cart_items.dispatchEvent(cartUpdateEvent);
      return response.json();
    })
    .catch((error) => {
      console.error('Error:', error);
    });
}
