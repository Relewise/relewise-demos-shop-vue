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
            path: '/product/:id',
            name: 'product',
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
    ],
});

export default router;
