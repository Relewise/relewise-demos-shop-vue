import { findImage } from '@/helpers/imageHelper';
import type { ProductResult } from '@relewise/client';
import type { TemplateExtensions } from '@relewise/web-components';

export const WebComponentProductTemplate = (product: ProductResult, { html, helpers }: TemplateExtensions) => {
    const path = `/product/${product.productId}`;
    return html`
        <style>
            a {
                text-decoration: none;
                color: inherit;
            }

            img {
                max-width: 100%;
                height: auto;
                display: block;
                vertical-align: middle;
            }

            .product-link {
                display: flex; 
                overflow: hidden; 
                position: relative; 
                padding-top: 0.75rem;
                padding-bottom: 0.75rem; 
                flex-direction: column; 
                border-radius: 0.25rem; 
                background-color: #ffffff; 
            }

            .image-container {
                display: flex; 
                overflow: hidden; 
                position: relative; 
                margin-left: 0.75rem;
                margin-right: 0.75rem; 
                justify-content: center; 
                height: 275px;
            }

            .image {
                object-fit: cover;
            }

            .on-sale {
                position: absolute; 
                top: 0; 
                left: 0; 
                padding-left: 0.5rem;
                padding-right: 0.5rem; 
                margin: 0.5rem; 
                border-radius: 9999px; 
                font-size: 0.875rem;
                line-height: 1.25rem; 
                font-weight: 500; 
                text-align: center; 
                color: #ffffff; 
                background-color: #000000; 
            }

            .padding {
                padding-left: 0.75rem;
                padding-right: 0.75rem; 
                margin-top: 0.75rem; 
            }

            .text-left {
                text-align: left;
            }

            .brand {
                color: #71717a;
                font-size: 0.875rem;
                line-height: 1.25rem; 
            }

            .display-name {
                height: 2.5rem; 
                font-weight: 600; 
                letter-spacing: -0.025em; 
                line-height: 1.25rem; 
                font-size: 1rem;
                margin-top: 0.5rem;
                margin-bottom: 0;
                text-overflow: ellipsis;
                overflow: hidden;
            }

            .price-container {
                display: flex; 
                margin-top: 0.5rem; 
                justify-content: space-between; 
                align-items: center; 
            }

            .sales-price {
                margin-right: 0.25rem; 
                font-size: 1.125rem;
                line-height: 1.75rem; 
                font-weight: 600; 
                line-height: 1; 
            }
            
            .list-price {
                text-decoration: line-through; 
            }

        </style>
        <a href="${path}" class="product-link">
            <div class="image-container">
                <img src="${findImage(product)}" class="image"/>
                ${product.salesPrice !== product.listPrice && product.listPrice !== null && product.listPrice !== undefined ? html`<span class="on-sale">ON SALE</span>` : html``}
                ${product.data && product.data.SoldOut && product.data.SoldOut.value === true ? html`<span class="on-sale">SOLD OUT</span>` : html``}
            </div>
            <div class="padding">
            <div class="text-left">
                ${product.brand ? html`<span class="brand">${product.brand.displayName}</span>` : ''}
                <h5 class="display-name">
                    ${product.displayName}
                </h5>
            </div>
            <div class="price-container">
                <p>
                    <span class="sales-price">${helpers.formatPrice(product.salesPrice)}</span>
                    ${product.salesPrice !== product.listPrice && product.listPrice !== null && product.listPrice !== undefined ? html`<span class="list-price">${helpers.formatPrice(product.listPrice)}</span>` : ''}
                </p>
            </div>
        </div>
        </a>
    `;
};