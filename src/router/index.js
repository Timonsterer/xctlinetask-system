import { createRouter, createWebHistory } from 'vue-router'

// 核心頁面
import LoginView from '@/views/LoginView.vue'
import BindView from '@/views/BindView.vue'
import HomeView from '@/views/HomeView.vue'
import TaskFormView from '@/views/TaskFormView.vue'
import TaskHistoryView from '@/views/TaskHistoryView.vue'

// 我很閒
import IdleFormView from '@/views/IdleFormView.vue'
import IdleMarketView from '@/views/IdleMarketView.vue'

// 聯絡人
import ContactListView from '@/views/ContactListView.vue'
import ContactFormView from '@/views/ContactFormView.vue'
import ContactDetailView from '@/views/ContactDetailView.vue'

// 生活套版
import LifeTemplateListView from '@/views/LifeTemplateListView.vue'
import LifeTemplateDetailView from '@/views/LifeTemplateDetailView.vue'

// 多人副本
import RaidView from '@/views/RaidView.vue'

// ✅ 口袋名單（新增）
import PocketPlaceView from '@/views/PocketPlaceView.vue'

const routes = [
  {
    path: '/',
    redirect: '/home',
  },

  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { public: true },
  },

  {
    path: '/bind',
    name: 'bind',
    component: BindView,
    meta: { public: true },
  },

  {
    path: '/home',
    name: 'home',
    component: HomeView,
    meta: { public: true },
  },

  {
    path: '/task-form',
    name: 'task-form',
    component: TaskFormView,
  },

  {
    path: '/task-history',
    name: 'task-history',
    component: TaskHistoryView,
  },

  {
    path: '/idle-form',
    name: 'idle-form',
    component: IdleFormView,
  },

  {
    path: '/idle-market',
    name: 'idle-market',
    component: IdleMarketView,
  },

  {
    path: '/raid',
    name: 'raid',
    component: RaidView,
  },

  {
    path: '/contacts',
    name: 'contacts',
    component: ContactListView,
  },

  {
    path: '/contacts/new',
    name: 'contact-new',
    component: ContactFormView,
  },

  {
    path: '/contacts/:id',
    name: 'contact-detail',
    component: ContactDetailView,
    props: true,
  },

  {
    path: '/contacts/:id/edit',
    name: 'contact-edit',
    component: ContactFormView,
    props: true,
  },

  {
    path: '/life-templates',
    name: 'life-templates',
    component: LifeTemplateListView,
  },

  {
    path: '/life-templates/:id',
    name: 'life-template-detail',
    component: LifeTemplateDetailView,
    props: true,
  },

  // ✅ 口袋名單頁面（新增）
  {
    path: '/pocket-places',
    name: 'pocket-places',
    component: PocketPlaceView,
  },

  // ⚠️ fallback 一定放最後
  {
    path: '/:pathMatch(.*)*',
    redirect: '/home',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to, from, next) => {
  next()
})

export default router
