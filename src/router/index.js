import { createRouter, createWebHistory } from 'vue-router'

// 核心頁面
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

const routes = [
  {
    path: '/',
    redirect: '/home',
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
  },

  {
    path: '/task/new',
    name: 'task-new',
    component: TaskFormView,
  },

  {
    path: '/task/history',
    name: 'task-history',
    component: TaskHistoryView,
  },

  {
    path: '/idle',
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
    name: 'life-template-list',
    component: LifeTemplateListView,
  },

  {
    path: '/life-templates/:id',
    name: 'life-template-detail',
    component: LifeTemplateDetailView,
    props: true,
  },

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

/**
 * 🔥 修正重點：
 * 1. 不再強制跳 /bind
 * 2. 允許 /home 作為初始化入口
 * 3. 避免 LIFF 初始化被打斷
 */
router.beforeEach((to, from, next) => {
  const isPublic = to.meta?.public === true

  const userId =
    localStorage.getItem('userId') ||
    localStorage.getItem('lineUserId') ||
    localStorage.getItem('line_user_id')

  // 公開頁直接放行
  if (isPublic) {
    next()
    return
  }

  // 🔥 關鍵：允許首頁進行初始化
  if (to.path === '/home') {
    next()
    return
  }

  // 🔥 沒登入 → 回首頁（不是 /bind）
  if (!userId) {
    next('/home')
    return
  }

  next()
})

export default router
