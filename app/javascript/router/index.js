import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomePage
  },
  // Diğer rotalar buraya eklenecek
  {
    path: '/timeline',
    name: 'Timeline',
    component: HomePage // Şimdilik HomePage'i kullanıyoruz
  },
  {
    path: '/series',
    name: 'Series',
    component: HomePage
  },
  {
    path: '/books',
    name: 'Books',
    component: HomePage
  },
  {
    path: '/videos',
    name: 'Videos',
    component: HomePage
  },
  {
    path: '/people',
    name: 'People',
    component: HomePage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
