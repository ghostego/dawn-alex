

class thresholdProgressBar extends HTMLElement {
  constructor() {
    super();
    this.cartTotal = parseFloat(this.getAttribute('data-cart-value'));
    this.thresholdValue = parseFloat(this.getAttribute('data-threshold-value'));
    this.progress = this.querySelector('[data-progress]');
    this.gwpMessage = this.querySelector('[data-gift-message]');
    this.updateProgressBar();
  }

  updateProgressBar() {
    const progressPercent = Math.min((this.cartTotal / this.thresholdValue) * 100, 100);

    if (this.progress) this.progress.style.width = progressPercent + '%';
    if (this.gwpMessage) {
      if (progressPercent == 100) this.gwpMessage.textContent = "You've earned a free gift!";
      else {
        const formattedThresholdDiff = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format((this.thresholdValue - this.cartTotal) / 100);
        this.gwpMessage.textContent = `Spend ${formattedThresholdDiff} to earn a free gift`;
      }
      this.gwpMessage.classList.remove('hidden');
    }

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
    this.cartItems = JSON.parse(this.getAttribute('data-cart-items'));
    this.cartTotal = parseFloat(this.getAttribute('data-cart-value'));
    this.thresholdValue = parseFloat(this.getAttribute('data-threshold-value'));
    this.thresholdPercentage = Math.min((this.cartTotal / this.thresholdValue) * 100, 100);
    this.thresholdMet = this.thresholdPercentage == 100;
    getProductsByCollectionHandle(this.gwpCollectionHandle).then((x) => this.renderThresholdGWP(x));

    this.toggleGWP(this.thresholdMet);
  }
  hasGwpInCart(gwp_prop) {
    const tempThresholdProducts = this.cartItems.filter((item) => item.properties?.[gwp_prop]);
    return tempThresholdProducts;
  }
  validateGWPItems() {
    const tempThresholdProducts = this.cartItems.filter((item) => item.properties?.['_threshold_gwp_product']);
    const thresholdProductInCart = tempThresholdProducts.slice(1);
    if (tempThresholdProducts.length > 1) removeItemsFromCart(tempThresholdProducts);
    return thresholdProductInCart.length == 1;
  }
  toggleGWP() {
    this.validateGWPItems();
    const gwpInCart = this.hasGwpInCart('_threshold_gwp_product').length > 0;
    if (this.thresholdMet && !gwpInCart) {
      this.classList.remove('max-h-0', 'overflow-hidden');
    } else {
      this.classList.add('max-h-0', 'overflow-hidden');
    }
    if (!this.thresholdMet && gwpInCart) {
      removeItemsFromCart(this.hasGwpInCart('_threshold_gwp_product'));
    }
  }
  renderThresholdGWP(items = []) {
    const gwp_container = document.createElement('div');
    const threshold_gwp_container = document.querySelector('threshold-gwp');
    gwp_container.classList.add('flex', 'flex-row', 'gap-2');
    items.forEach((item) => {
      const new_product_card = document.createElement('div');
      const product_image = document.createElement('img');
      const button = document.createElement('button');
      button.textContent = 'add to cart';
      button.classList.add(
        'bg-black',
        'text-white',
        'pointer-cursor',
        'py-1',
        'px-2',
        'm-4',
        'transition-all',
        'hover:bg-white',
        'hover:text-black',
        'border',
        'border-solid',
        'border-black',
        'w-fit',
        'text-[12px]'
      );
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
}

customElements.define('threshold-gwp', thresholdGWP);

class customerGWP extends HTMLElement {
  constructor() {
    super();
    this.customerGWPHandle = this.getAttribute('data-customer-gwp');
    this.customerIsValid = this.getAttribute('data-valid-customer-group');
    this.cartItems = JSON.parse(this.getAttribute('data-cart-items'));
    const customerGWPInCart = this.cartItems.filter((item) => item.properties?.['_customer_gwp_product']);
    if (customerGWPInCart.length > 0) {
      if (this.customerIsValid == 'false') removeItemsFromCart(customerGWPInCart);
    } else if (this.customerIsValid !== 'false')
      getProductByHandle(this.customerGWPHandle).then((x) => this.renderCustomerGWP(x));
  }

  toggleGWP() {
    const gwpInCart = this.hasGWPInCart('_customer_gwp_product').length > 0;
    if (!gwpInCart) {
      this.classList.remove('max-h-0', 'overflow-hidden');
    } else {
      this.classList.add('max-h-0', 'overflow-hidden');
    }
  }

  renderCustomerGWP(item = {}) {
    const gwp_container = document.createElement('div');
    const image_container = document.querySelector('[data-image-holder]');
    const customer_gwp_container = document.querySelector('customer-gwp');
    const product_image = document.createElement('img');
    const button = document.querySelector('[data-free-gift-atc]');
    button.addEventListener('click', () => {
      addItemToCart(item.variants.edges[0].node.id.split('ProductVariant/').pop(), '_customer_gwp_product');
    });
    if (image_container.children.length == 0) {
      product_image.src = item.images.edges[0].node.src;
      image_container.appendChild(product_image);
    }
    customer_gwp_container.append(gwp_container);
    customer_gwp_container.classList.remove('max-h-0');
  }
}

customElements.define('customer-gwp', customerGWP);
