const storefrontAccessToken = '';
const url = '/api/2024-10/graphql.json';

class BundleBuilder extends HTMLElement {
  constructor() {
    super();
    this.bundleSize = this.getAttribute('data-bundle-size');
    this.bundleOptions = JSON.parse(this.getAttribute('data-bundle-options'));
    this.bundleProducts = [];
    this.getProductsByIds(this.bundleOptions).then((x) => this.buildBundleSelector(x));
  }

  async getProductsByIds(ids) {
    const query = `
      query getProductsByIds($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            title
            handle
            descriptionHtml
            vendor
            productType
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  priceV2 {
                    amount
                    currencyCode
                  }
                  availableForSale
                }
              }
            }
            images(first: 5) {
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
      console.log(data);

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

  buildBundleSelector(products) {
    const container = document.createElement('div');
    container.setAttribute('data-bundle-input-holder', true);
    container.classList.add('flex', 'flex-row', 'flex-wrap', 'gap-2');
    const bundleSelector = document.querySelector('[data-bundle-selector]');
    products.forEach((product) => {
      const variantId = product.variants.edges[0].node.id.split('/ProductVariant/').pop();
      const bundleLabel = document.createElement('label');
      bundleLabel.classList.add('w-[100px]', 'flex');

      const bundleInput = document.createElement('input');
      bundleInput.type = 'checkbox';
      bundleInput.id = variantId;
      bundleInput.name = 'bundle-option';
      bundleInput.value = variantId;
      bundleInput.setAttribute('data-bundle-product', variantId);
      bundleInput.addEventListener('click', (e) => {
        const bundleInputs = container.querySelectorAll('input');
        const selectedBundleOptions = [...bundleInputs].filter((i) => i.checked);
        const siblingImage = e.target.nextElementSibling;
        if (selectedBundleOptions.length > this.bundleSize) {
          e.target.checked = false;
        } else {
          siblingImage.classList.toggle('border', e.target.checked);
        }
      });

      const bundleImage = document.createElement('img');
      bundleImage.src = product.images.edges[0].node.src;
      bundleImage.alt = product.title;
      bundleLabel.appendChild(bundleInput);
      bundleLabel.appendChild(bundleImage);
      container.appendChild(bundleLabel);
    });
    bundleSelector.appendChild(container);
  }
}

customElements.define('bundle-builder', BundleBuilder);
