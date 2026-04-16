import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import TaskFormView from '@/views/TaskFormView.vue'
import TaskHistoryView from '@/views/TaskHistoryView.vue'
import IdleFormView from '@/views/IdleFormView.vue'
import IdleMarketView from '@/views/IdleMarketView.vue'
import ContactListView from '@/views/ContactListView.vue'
import ContactFormView from '@/views/ContactFormView.vue'
import ContactDetailView from '@/views/ContactDetailView.vue'
import LifeTemplateListView from '@/views/LifeTemplateListView.vue'
import LifeTemplateDetailView from '@/views/LifeTemplateDetailView.vue'

const routes = [
  {
    path: '/',
    redirect: '/home',
  },
  {
    path: '/home',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/task/new',
    name: 'task-form',
    component: TaskFormView,
  },
  {
    path: '/task/history',
    name: 'task-history',
    component: TaskHistoryView,
  },
  {
    path: '/idle/new',
    name: 'idle-form',
    component: IdleFormView,
  },
  {
    path: '/idle/market',
    name: 'idle-market',
    component: IdleMarketView,
  },
  {
    path: '/contacts',
    name: 'contact-list',
    component: ContactListView,
  },
  {
    path: '/contacts/new',
    name: 'contact-form',
    component: ContactFormView,
  },
  {
    path: '/contacts/:id',
    name: 'contact-detail',
    component: ContactDetailView,
    props: true,
  },
  {
    path: '/life-templates',
    name: 'life-template-list',
    component: LifeTemplateListView,
  },
  {
    path: '/life-templates/:id',
    name: 'life-template-detail',
    component: LifeTemplateDetailView,
    props: true,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
