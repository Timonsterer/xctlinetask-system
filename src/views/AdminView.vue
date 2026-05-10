<template>
  <div class="admin-page">
    <header class="admin-header">
      <div>
        <p class="eyebrow">管理者模式</p>
        <h1>後台管理中心</h1>
        <p class="subtitle">
          管理使用者、任務、人物生活套版、商家、優惠券
        </p>
      </div>

      <button class="home-btn" @click="goHome">
        回首頁
      </button>
    </header>

    <section v-if="loading" class="card">
      <p>讀取管理者資料中...</p>
    </section>

    <section v-else-if="!isAdmin" class="card denied">
      <h2>無權限進入</h2>
      <p>你目前不是管理者</p>
    </section>

    <main v-else class="admin-content">
      <!-- 統計 -->
      <section class="stats-grid">
        <div class="stat-card">
          <span>使用者數</span>
          <strong>{{ users.length }}</strong>
        </div>

        <div class="stat-card">
          <span>任務數</span>
          <strong>{{ tasks.length }}</strong>
        </div>

        <div class="stat-card">
          <span>人物套版</span>
          <strong>{{ lifeTemplates.length }}</strong>
        </div>

        <div class="stat-card">
          <span>商家數</span>
          <strong>{{ merchants.length }}</strong>
        </div>

        <div class="stat-card">
          <span>優惠券數</span>
          <strong>{{ coupons.length }}</strong>
        </div>
      </section>

      <!-- 任務管理 -->
      <section class="card">
        <h2>任務管理</h2>

        <div class="form-grid">
          <input
            v-model="taskSearch"
            placeholder="搜尋任務名稱"
          />

          <input
            v-model="userSearch"
            placeholder="搜尋使用者ID / 名稱"
          />
        </div>

        <div
          v-if="filteredTasks.length === 0"
          class="empty"
        >
          查無任務
        </div>

        <div v-else class="list">
          <div
            v-for="task in filteredTasks"
            :key="task.id"
            class="list-item"
          >
            <div class="left">
              <strong>
                {{ task.title || task.name || '未命名任務' }}
              </strong>

              <p>
                {{ task.description || '無描述' }}
              </p>

              <small>
                使用者：
                {{
                  task.ownerName ||
                  task.displayName ||
                  task.userName ||
                  task.ownerId ||
                  task.userId ||
                  '未知'
                }}
              </small>

              <br />

              <small>
                狀態：
                {{ task.status || '未設定' }}
              </small>
            </div>

            <div class="row-actions">
              <button
                class="small-btn danger"
                @click="deleteTask(task.id)"
              >
                刪除任務
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 商家新增 / 編輯 -->
      <section class="card">
        <h2>
          {{ editingMerchantId ? '編輯商家' : '新增商家' }}
        </h2>

        <div class="form-grid two">
          <input
            v-model="merchantForm.name"
            placeholder="商家名稱"
          />

          <input
            v-model="merchantForm.category"
            placeholder="分類，例如：餐廳 / 咖啡廳 / 景點"
          />

          <input
            v-model="merchantForm.phone"
            placeholder="電話"
          />

          <input
            v-model="merchantForm.address"
            placeholder="地址"
          />

          <input
            v-model="merchantForm.mapUrl"
            placeholder="Google Map 連結"
          />

          <input
            v-model="merchantForm.imageUrl"
            placeholder="圖片網址"
          />

          <input
            v-model="merchantForm.ownerId"
            placeholder="商家擁有者 userId / lineUserId，可留空"
          />

          <select v-model="merchantForm.status">
            <option value="active">啟用</option>
            <option value="hidden">隱藏</option>
            <option value="pending">待審核</option>
          </select>

          <textarea
            v-model="merchantForm.description"
            placeholder="商家介紹"
          />
        </div>

        <div class="actions">
          <button
            class="small-btn"
            @click="saveMerchant"
          >
            {{ editingMerchantId ? '更新商家' : '新增商家' }}
          </button>

          <button
            v-if="editingMerchantId"
            class="small-btn gray"
            @click="resetMerchantForm"
          >
            取消編輯
          </button>
        </div>
      </section>

      <!-- 商家列表 -->
      <section class="card">
        <h2>商家管理</h2>

        <input
          v-model="merchantSearch"
          placeholder="搜尋商家名稱 / 分類 / 地址"
          class="single-search"
        />

        <div
          v-if="filteredMerchants.length === 0"
          class="empty"
        >
          尚無商家
        </div>

        <div v-else class="list">
          <div
            v-for="merchant in filteredMerchants"
            :key="merchant.id"
            class="list-item"
          >
            <div class="left">
              <strong>
                {{ merchant.name || '未命名商家' }}
              </strong>

              <p>
                {{ merchant.description || '無介紹' }}
              </p>

              <small>
                分類：{{ merchant.category || '未分類' }}
              </small>

              <br />

              <small>
                地址：{{ merchant.address || '未填寫' }}
              </small>

              <br />

              <small>
                狀態：{{ merchant.status || 'active' }}
              </small>

              <br />

              <small>
                擁有者：{{ merchant.ownerId || '未綁定' }}
              </small>
            </div>

            <div class="row-actions">
              <button
                class="small-btn"
                @click="editMerchant(merchant)"
              >
                編輯
              </button>

              <button
                class="small-btn danger"
                @click="deleteMerchant(merchant.id)"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 優惠券新增 / 編輯 -->
      <section class="card">
        <h2>
          {{ editingCouponId ? '編輯優惠券' : '新增優惠券' }}
        </h2>

        <div class="form-grid two">
          <input
            v-model="couponForm.title"
            placeholder="優惠券標題，例如：飲品折抵 20 元"
          />

          <select v-model="couponForm.merchantId">
            <option value="">
              選擇商家，可留空
            </option>

            <option
              v-for="merchant in merchants"
              :key="merchant.id"
              :value="merchant.id"
            >
              {{ merchant.name || merchant.id }}
            </option>
          </select>

          <input
            v-model="couponForm.discountText"
            placeholder="優惠內容，例如：滿 200 折 50"
          />

          <input
            v-model="couponForm.code"
            placeholder="優惠碼，可留空"
          />

          <input
            v-model="couponForm.startDate"
            type="date"
            placeholder="開始日期"
          />

          <input
            v-model="couponForm.endDate"
            type="date"
            placeholder="結束日期"
          />

          <input
            v-model.number="couponForm.limit"
            type="number"
            min="0"
            placeholder="可使用數量，0 代表不限"
          />

          <select v-model="couponForm.status">
            <option value="active">啟用</option>
            <option value="hidden">隱藏</option>
            <option value="expired">已過期</option>
          </select>

          <textarea
            v-model="couponForm.description"
            placeholder="優惠券說明"
          />
        </div>

        <div class="actions">
          <button
            class="small-btn"
            @click="saveCoupon"
          >
            {{ editingCouponId ? '更新優惠券' : '新增優惠券' }}
          </button>

          <button
            v-if="editingCouponId"
            class="small-btn gray"
            @click="resetCouponForm"
          >
            取消編輯
          </button>
        </div>
      </section>

      <!-- 優惠券列表 -->
      <section class="card">
        <h2>優惠券管理</h2>

        <input
          v-model="couponSearch"
          placeholder="搜尋優惠券 / 商家 / 優惠內容"
          class="single-search"
        />

        <div
          v-if="filteredCoupons.length === 0"
          class="empty"
        >
          尚無優惠券
        </div>

        <div v-else class="list">
          <div
            v-for="coupon in filteredCoupons"
            :key="coupon.id"
            class="list-item"
          >
            <div class="left">
              <strong>
                {{ coupon.title || '未命名優惠券' }}
              </strong>

              <p>
                {{ coupon.description || coupon.discountText || '無說明' }}
              </p>

              <small>
                商家：{{ getMerchantName(coupon.merchantId) }}
              </small>

              <br />

              <small>
                優惠：{{ coupon.discountText || '未設定' }}
              </small>

              <br />

              <small>
                優惠碼：{{ coupon.code || '無' }}
              </small>

              <br />

              <small>
                效期：
                {{ coupon.startDate || '未設定' }}
                ～
                {{ coupon.endDate || '未設定' }}
              </small>

              <br />

              <small>
                狀態：{{ coupon.status || 'active' }}
              </small>
            </div>

            <div class="row-actions">
              <button
                class="small-btn"
                @click="editCoupon(coupon)"
              >
                編輯
              </button>

              <button
                class="small-btn danger"
                @click="deleteCoupon(coupon.id)"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 人物套版新增 -->
      <section class="card">
        <h2>
          {{ editingTemplateId ? '編輯人物套版' : '新增人物套版' }}
        </h2>

        <div class="form-grid">
          <input
            v-model="templateForm.title"
            placeholder="人物名稱，例如：彭于晏"
          />

          <input
            v-model="templateForm.category"
            placeholder="分類，例如：健身"
          />

          <input
            v-model="templateForm.imageUrl"
            placeholder="圖片網址"
          />

          <textarea
            v-model="templateForm.description"
            placeholder="人物介紹"
          />

          <textarea
            v-model="templateForm.tasksText"
            placeholder="任務內容，一行一個&#10;例如：&#10;晨跑30分鐘&#10;高蛋白早餐&#10;重訓60分鐘"
          />
        </div>

        <div class="actions">
          <button
            class="small-btn"
            @click="saveLifeTemplate"
          >
            {{ editingTemplateId ? '更新套版' : '新增套版' }}
          </button>

          <button
            v-if="editingTemplateId"
            class="small-btn gray"
            @click="resetTemplateForm"
          >
            取消編輯
          </button>
        </div>
      </section>

      <!-- 套版列表 -->
      <section class="card">
        <h2>人物套版管理</h2>

        <div
          v-if="lifeTemplates.length === 0"
          class="empty"
        >
          尚無人物套版
        </div>

        <div v-else class="list">
          <div
            v-for="item in lifeTemplates"
            :key="item.id"
            class="list-item"
          >
            <div class="left">
              <strong>
                {{ item.title || item.name }}
              </strong>

              <p>
                {{ item.description || '無介紹' }}
              </p>

              <small>
                分類：
                {{ item.category || '未分類' }}
              </small>

              <div
                v-if="item.tasks?.length"
                class="task-preview"
              >
                <div
                  v-for="task in item.tasks"
                  :key="task.id"
                >
                  • {{ task.name || task.title || task.text }}
                </div>
              </div>
            </div>

            <div class="row-actions">
              <button
                class="small-btn"
                @click="editLifeTemplate(item)"
              >
                編輯
              </button>

              <button
                class="small-btn danger"
                @click="deleteLifeTemplate(item.id)"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 使用者 -->
      <section class="card">
        <h2>使用者管理</h2>

        <div
          v-if="users.length === 0"
          class="empty"
        >
          尚無使用者
        </div>

        <div v-else class="list">
          <div
            v-for="user in users"
            :key="user.id"
            class="list-item"
          >
            <div>
              <strong>
                {{ user.displayName || '未命名使用者' }}
              </strong>

              <p>
                {{ user.lineUserId || user.id }}
              </p>

              <small>
                角色：
                {{ user.role || 'user' }}
              </small>
            </div>

            <button
              v-if="user.role !== 'admin'"
              class="small-btn"
              @click="setAdmin(user.id)"
            >
              設為管理者
            </button>

            <button
              v-else
              class="small-btn danger"
              @click="removeAdmin(user.id)"
            >
              移除管理者
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import {
  ref,
  onMounted,
  computed,
} from 'vue'

import { useRouter } from 'vue-router'

import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'

import { db } from '@/firebase'

const router = useRouter()

const loading = ref(true)
const isAdmin = ref(false)

const users = ref([])
const tasks = ref([])
const lifeTemplates = ref([])
const merchants = ref([])
const coupons = ref([])

const taskSearch = ref('')
const userSearch = ref('')
const merchantSearch = ref('')
const couponSearch = ref('')

const editingTemplateId = ref(null)
const editingMerchantId = ref(null)
const editingCouponId = ref(null)

const templateForm = ref({
  title: '',
  category: '',
  imageUrl: '',
  description: '',
  tasksText: '',
})

const merchantForm = ref({
  name: '',
  category: '',
  phone: '',
  address: '',
  mapUrl: '',
  imageUrl: '',
  ownerId: '',
  status: 'active',
  description: '',
})

const couponForm = ref({
  title: '',
  merchantId: '',
  discountText: '',
  code: '',
  startDate: '',
  endDate: '',
  limit: 0,
  status: 'active',
  description: '',
})

const filteredTasks = computed(() => {
  return tasks.value.filter((task) => {
    const taskName = (
      task.title ||
      task.name ||
      ''
    ).toLowerCase()

    const ownerText = (
      task.ownerName ||
      task.displayName ||
      task.userName ||
      task.ownerId ||
      task.userId ||
      ''
    ).toLowerCase()

    const matchTask =
      !taskSearch.value ||
      taskName.includes(
        taskSearch.value.toLowerCase()
      )

    const matchUser =
      !userSearch.value ||
      ownerText.includes(
        userSearch.value.toLowerCase()
      )

    return matchTask && matchUser
  })
})

const filteredMerchants = computed(() => {
  const keyword = merchantSearch.value.toLowerCase().trim()

  if (!keyword) return merchants.value

  return merchants.value.filter((merchant) => {
    const text = [
      merchant.name,
      merchant.category,
      merchant.address,
      merchant.phone,
      merchant.ownerId,
      merchant.status,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return text.includes(keyword)
  })
})

const filteredCoupons = computed(() => {
  const keyword = couponSearch.value.toLowerCase().trim()

  if (!keyword) return coupons.value

  return coupons.value.filter((coupon) => {
    const text = [
      coupon.title,
      coupon.discountText,
      coupon.code,
      coupon.status,
      coupon.description,
      getMerchantName(coupon.merchantId),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return text.includes(keyword)
  })
})

const goHome = () => {
  router.push('/home')
}

const checkAdmin = async () => {
  const lineUserId =
    localStorage.getItem('lineUserId')

  if (!lineUserId) {
    isAdmin.value = false
    return
  }

  const userRef = doc(
    db,
    'users',
    lineUserId
  )

  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) {
    isAdmin.value = false
    return
  }

  isAdmin.value =
    userSnap.data().role === 'admin'
}

const loadUsers = async () => {
  const snap = await getDocs(
    collection(db, 'users')
  )

  users.value = snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }))
}

const loadTasks = async () => {
  const snap = await getDocs(
    collection(db, 'tasks')
  )

  tasks.value = snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }))
}

const loadLifeTemplates = async () => {
  const snap = await getDocs(
    collection(db, 'life_templates')
  )

  lifeTemplates.value = snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }))
}

const loadMerchants = async () => {
  const snap = await getDocs(
    collection(db, 'merchants')
  )

  merchants.value = snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }))
}

const loadCoupons = async () => {
  const snap = await getDocs(
    collection(db, 'coupons')
  )

  coupons.value = snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }))
}

const getMerchantName = (merchantId) => {
  if (!merchantId) return '未綁定商家'

  const merchant = merchants.value.find(
    (item) => item.id === merchantId
  )

  return merchant?.name || merchantId
}

/* 商家管理 */
const resetMerchantForm = () => {
  editingMerchantId.value = null

  merchantForm.value = {
    name: '',
    category: '',
    phone: '',
    address: '',
    mapUrl: '',
    imageUrl: '',
    ownerId: '',
    status: 'active',
    description: '',
  }
}

const buildMerchantPayload = () => {
  return {
    name: merchantForm.value.name.trim(),

    category:
      merchantForm.value.category.trim(),

    phone:
      merchantForm.value.phone.trim(),

    address:
      merchantForm.value.address.trim(),

    mapUrl:
      merchantForm.value.mapUrl.trim(),

    imageUrl:
      merchantForm.value.imageUrl.trim(),

    ownerId:
      merchantForm.value.ownerId.trim(),

    status:
      merchantForm.value.status || 'active',

    description:
      merchantForm.value.description.trim(),

    updatedAt: serverTimestamp(),
  }
}

const saveMerchant = async () => {
  if (!merchantForm.value.name.trim()) {
    alert('請輸入商家名稱')
    return
  }

  const payload = buildMerchantPayload()

  if (editingMerchantId.value) {
    await setDoc(
      doc(
        db,
        'merchants',
        editingMerchantId.value
      ),
      payload,
      { merge: true }
    )
  } else {
    await addDoc(
      collection(db, 'merchants'),
      {
        ...payload,
        createdAt: serverTimestamp(),
        source: 'admin',
      }
    )
  }

  resetMerchantForm()

  await loadMerchants()
}

const editMerchant = (merchant) => {
  editingMerchantId.value = merchant.id

  merchantForm.value = {
    name: merchant.name || '',
    category: merchant.category || '',
    phone: merchant.phone || '',
    address: merchant.address || '',
    mapUrl: merchant.mapUrl || '',
    imageUrl: merchant.imageUrl || '',
    ownerId: merchant.ownerId || '',
    status: merchant.status || 'active',
    description: merchant.description || '',
  }

  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

const deleteMerchant = async (id) => {
  const relatedCoupons = coupons.value.filter(
    (coupon) => coupon.merchantId === id
  )

  let message = '確定刪除這個商家？'

  if (relatedCoupons.length > 0) {
    message =
      `這個商家目前有 ${relatedCoupons.length} 張優惠券綁定。\n` +
      '刪除商家不會自動刪除優惠券，但優惠券會變成找不到商家。\n\n' +
      '確定繼續？'
  }

  const ok = confirm(message)

  if (!ok) return

  await deleteDoc(
    doc(db, 'merchants', id)
  )

  await loadMerchants()

  if (editingMerchantId.value === id) {
    resetMerchantForm()
  }
}

/* 優惠券管理 */
const resetCouponForm = () => {
  editingCouponId.value = null

  couponForm.value = {
    title: '',
    merchantId: '',
    discountText: '',
    code: '',
    startDate: '',
    endDate: '',
    limit: 0,
    status: 'active',
    description: '',
  }
}

const buildCouponPayload = () => {
  const merchant = merchants.value.find(
    (item) => item.id === couponForm.value.merchantId
  )

  return {
    title: couponForm.value.title.trim(),

    merchantId:
      couponForm.value.merchantId || '',

    merchantName:
      merchant?.name || '',

    discountText:
      couponForm.value.discountText.trim(),

    code:
      couponForm.value.code.trim(),

    startDate:
      couponForm.value.startDate || '',

    endDate:
      couponForm.value.endDate || '',

    limit:
      Number(couponForm.value.limit || 0),

    status:
      couponForm.value.status || 'active',

    description:
      couponForm.value.description.trim(),

    updatedAt: serverTimestamp(),
  }
}

const saveCoupon = async () => {
  if (!couponForm.value.title.trim()) {
    alert('請輸入優惠券標題')
    return
  }

  const payload = buildCouponPayload()

  if (editingCouponId.value) {
    await setDoc(
      doc(
        db,
        'coupons',
        editingCouponId.value
      ),
      payload,
      { merge: true }
    )
  } else {
    await addDoc(
      collection(db, 'coupons'),
      {
        ...payload,
        usedCount: 0,
        createdAt: serverTimestamp(),
        source: 'admin',
      }
    )
  }

  resetCouponForm()

  await loadCoupons()
}

const editCoupon = (coupon) => {
  editingCouponId.value = coupon.id

  couponForm.value = {
    title: coupon.title || '',
    merchantId: coupon.merchantId || '',
    discountText: coupon.discountText || '',
    code: coupon.code || '',
    startDate: coupon.startDate || '',
    endDate: coupon.endDate || '',
    limit: Number(coupon.limit || 0),
    status: coupon.status || 'active',
    description: coupon.description || '',
  }

  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

const deleteCoupon = async (id) => {
  const ok = confirm(
    '確定刪除這張優惠券？'
  )

  if (!ok) return

  await deleteDoc(
    doc(db, 'coupons', id)
  )

  await loadCoupons()

  if (editingCouponId.value === id) {
    resetCouponForm()
  }
}

/* 人物套版 */
const resetTemplateForm = () => {
  editingTemplateId.value = null

  templateForm.value = {
    title: '',
    category: '',
    imageUrl: '',
    description: '',
    tasksText: '',
  }
}

const buildTemplatePayload = () => {
  const tasks = templateForm.value.tasksText
    .split('\n')
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, index) => ({
      id: `task_${index + 1}`,
      name: text,
      title: text,
      text: text,
      done: false,
      order: index + 1,
    }))

  return {
    title: templateForm.value.title.trim(),

    name: templateForm.value.title.trim(),

    category:
      templateForm.value.category.trim(),

    imageUrl:
      templateForm.value.imageUrl.trim(),

    description:
      templateForm.value.description.trim(),

    tasks,

    updatedAt: serverTimestamp(),
  }
}

const saveLifeTemplate = async () => {
  if (!templateForm.value.title.trim()) {
    alert('請輸入套版名稱')
    return
  }

  const payload = buildTemplatePayload()

  if (editingTemplateId.value) {
    await setDoc(
      doc(
        db,
        'life_templates',
        editingTemplateId.value
      ),
      payload,
      { merge: true }
    )
  } else {
    await addDoc(
      collection(db, 'life_templates'),
      {
        ...payload,

        createdAt: serverTimestamp(),

        isPublic: true,

        source: 'admin',
      }
    )
  }

  resetTemplateForm()

  await loadLifeTemplates()
}

const editLifeTemplate = (item) => {
  editingTemplateId.value = item.id

  templateForm.value = {
    title:
      item.title || item.name || '',

    category:
      item.category || '',

    imageUrl:
      item.imageUrl || '',

    description:
      item.description || '',

    tasksText: Array.isArray(item.tasks)
      ? item.tasks
          .map(
            (task) =>
              task.name ||
              task.title ||
              task.text ||
              ''
          )
          .join('\n')
      : '',
  }

  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

const deleteLifeTemplate = async (id) => {
  const ok = confirm(
    '確定刪除這個人物套版？'
  )

  if (!ok) return

  await deleteDoc(
    doc(db, 'life_templates', id)
  )

  await loadLifeTemplates()

  if (editingTemplateId.value === id) {
    resetTemplateForm()
  }
}

const deleteTask = async (taskId) => {
  const ok = confirm(
    '確定刪除這個任務？'
  )

  if (!ok) return

  await deleteDoc(
    doc(db, 'tasks', taskId)
  )

  await loadTasks()
}

const setAdmin = async (userId) => {
  await updateDoc(
    doc(db, 'users', userId),
    {
      role: 'admin',
    }
  )

  await loadUsers()
}

const removeAdmin = async (userId) => {
  await updateDoc(
    doc(db, 'users', userId),
    {
      role: 'user',
    }
  )

  await loadUsers()
}

onMounted(async () => {
  try {
    await checkAdmin()

    if (isAdmin.value) {
      await Promise.all([
        loadUsers(),
        loadTasks(),
        loadLifeTemplates(),
        loadMerchants(),
        loadCoupons(),
      ])
    }
  } catch (err) {
    console.error(err)
    alert('讀取管理資料失敗，請檢查 Firestore 權限或集合名稱')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  padding: 24px;
  background: #f4f7fb;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.eyebrow {
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
}

.subtitle {
  color: #6b7280;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}

.stat-card,
.card {
  background: white;
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.stat-card span {
  display: block;
  color: #6b7280;
  font-size: 14px;
  margin-bottom: 8px;
}

.stat-card strong {
  font-size: 30px;
}

.card h2 {
  margin-top: 0;
  margin-bottom: 14px;
}

.form-grid {
  display: grid;
  gap: 12px;
}

.form-grid.two {
  grid-template-columns: repeat(2, 1fr);
}

input,
textarea,
select {
  width: 100%;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid #ddd;
  box-sizing: border-box;
  font-size: 15px;
  background: white;
}

textarea {
  min-height: 120px;
  resize: vertical;
  grid-column: 1 / -1;
}

.single-search {
  margin-bottom: 14px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list-item {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  padding: 14px;
  border-radius: 16px;
  background: #f9fafb;
}

.left {
  flex: 1;
}

.left p {
  color: #4b5563;
  margin: 8px 0;
}

.left small {
  color: #6b7280;
}

.task-preview {
  margin-top: 10px;
  color: #374151;
  font-size: 14px;
}

.actions,
.row-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.actions {
  margin-top: 14px;
}

.small-btn,
.home-btn {
  border: none;
  padding: 10px 14px;
  border-radius: 12px;
  background: #2563eb;
  color: white;
  font-weight: bold;
  cursor: pointer;
  white-space: nowrap;
}

.small-btn:hover,
.home-btn:hover {
  opacity: 0.9;
}

.danger {
  background: #dc2626;
}

.gray {
  background: #6b7280;
}

.empty {
  color: #6b7280;
  padding: 14px 0;
}

.denied {
  text-align: center;
}

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .admin-page {
    padding: 16px;
  }

  .admin-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .form-grid.two {
    grid-template-columns: 1fr;
  }

  .list-item {
    flex-direction: column;
  }

  .small-btn,
  .home-btn {
    width: 100%;
  }

  .row-actions {
    width: 100%;
  }
}
</style>
