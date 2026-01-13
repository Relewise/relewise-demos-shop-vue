import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    scrollBehavior(_, __, savedPosition) {
        if (savedPosition) {
            return savedPosition;
        } else {
            return { top: 0 };
        }
    },
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView,
        },
        {
            path: '/app-settings',
            name: 'settings',
            component: () => import('../views/Settings.vue'),
        },
        {
            path: '/cart',
            name: 'cart',
            component: () => import('../views/Cart.vue'),
        },
        {
            path: '/receipt',
            name: 'receipt',
            component: () => import('../views/ReceiptPage.vue'),
        },
        {
            path: '/product/:id',
            name: 'product',
            component: () => import('../views/ProductDetails.vue'),
        },
        {
            path: '/product/:id/variant/:variant',
            name: 'variant',
            component: () => import('../views/ProductDetails.vue'),
        },
        {
            path: '/category/:id',
            name: 'category',
            component: () => import('../views/Category.vue'),
        },
        {
            path: '/category/:parent/:id',
            name: 'sub-category',
            component: () => import('../views/Category.vue'),
        },
        {
            path: '/category/:grand/:parent/:id',
            name: 'sub-sub-category',
            component: () => import('../views/Category.vue'),
        },
        {
            path: '/content/:id',
            name: 'content',
            component: () => import('../views/ContentDetails.vue'),
        },
        {
            path: '/favorites',
            name: 'favorites',
            component: () => import('../views/Favorites.vue'),
        },
        {
            path: "/feed",
            name: "feed",
            component: () => import('../views/Feed.vue'),
        },
        {
            path: "/product-feed/:id",
            name: "product-feed",
            component: () => import('../views/Feed.vue'),
        },
        {
            path: "/content-feed/:id",
            name: "content-feed",
            component: () => import('../views/Feed.vue'),
        }
    ],
});

export default router;
