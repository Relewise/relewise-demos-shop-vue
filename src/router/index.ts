import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
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
    // {
    //   path: '/about',
    //   name: 'about',
    //   // route level code-splitting
    //   // this generates a separate chunk (About.[hash].js) for this route
    //   // which is lazy-loaded when the route is visited.
    //   component: () => import('../views/AboutView.vue')
    // }
    ],
});

export default router;
