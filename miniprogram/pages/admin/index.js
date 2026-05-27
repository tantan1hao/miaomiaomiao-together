const api = require('../../utils/api')

const ADMIN_TOKEN_KEY = 'dishAdminToken'
const DISH_PLACEHOLDER = '/images/dish-placeholder.svg'
const STATUS_TEXT = {
  ACTIVE: '上架',
  OFFLINE: '下架',
  PENDING: '待审核',
  REJECTED: '已拒绝'
}

function buildDishHeadline(dish) {
  const name = dish.name || '这道菜'
  const count = Number(dish.ratingCount || 0)
  if (dish.headline) return dish.headline
  if (count >= 20) return `${name}收获${count}张食堂票，继续留在今日版面`
  if (count > 0) return `${name}拿到${count}张新票，正在冲上风味榜`
  if (dish.shopName) return `${dish.shopName}把${name}送上今日候选`
  if (dish.categoryName) return `${name}登上${dish.categoryName}栏目，等待第一张票`
  return `${name}成为今天的食堂头条候选`
}

function normalizeDish(dish) {
  return {
    ...dish,
    imageUrl: dish.imageUrl || DISH_PLACEHOLDER,
    headlineText: buildDishHeadline(dish),
    placeText: [dish.canteenName, dish.floorName, dish.shopName].filter(Boolean).join(' · ') || '校园食堂',
    scoreText: Number(dish.avgScore || 0).toFixed(1),
    ratingText: `${dish.ratingCount || 0} 人评分`,
    statusText: STATUS_TEXT[dish.status] || '上架',
    statusClass: String(dish.status || 'ACTIVE').toLowerCase()
  }
}

function countByStatus(rows, status) {
  return rows.filter((dish) => (dish.status || 'ACTIVE') === status).length
}

Page({
  data: {
    schoolId: 'bistu',
    schoolName: '北京信息科技大学',
    adminToken: '',
    password: '',
    loading: false,
    saving: false,
    activeStatus: 'all',
    statusTabs: [
      { key: 'all', label: '全部' },
      { key: 'ACTIVE', label: '上架' },
      { key: 'OFFLINE', label: '下架' },
      { key: 'PENDING', label: '待审核' }
    ],
    stats: {
      total: 0,
      active: 0,
      offline: 0,
      pending: 0
    },
    announcement: '',
    categoryName: '',
    categories: [],
    dishes: [],
    visibleDishes: [],
    showEditSheet: false,
    editingDishId: '',
    editForm: {
      name: '',
      categoryName: '',
      shopName: '',
      floorName: '',
      description: '',
      imageUrl: ''
    }
  },

  onLoad(options) {
    const selectedSchool = wx.getStorageSync('selectedSchool') || {}
    const schoolId = options.schoolId || selectedSchool._id || 'bistu'
    const schoolName = options.schoolName
      ? decodeURIComponent(options.schoolName)
      : selectedSchool.name || '北京信息科技大学'
    const adminToken = wx.getStorageSync(ADMIN_TOKEN_KEY) || ''

    this.setData({ schoolId, schoolName, adminToken })
    if (adminToken) this.loadAdminData()
  },

  onPullDownRefresh() {
    this.loadAdminData().finally(() => wx.stopPullDownRefresh())
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  async loginAdmin() {
    const password = this.data.password.trim()
    if (!password) {
      wx.showToast({ title: '请输入管理密码', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    wx.showLoading({ title: '登录中' })
    try {
      const session = await api.adminLogin(password)
      wx.setStorageSync(ADMIN_TOKEN_KEY, session.token)
      this.setData({ adminToken: session.token, password: '' })
      wx.showToast({ title: '已登录', icon: 'success' })
      await this.loadAdminData()
    } catch (err) {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' })
    } finally {
      wx.hideLoading()
      this.setData({ loading: false })
    }
  },

  logoutAdmin() {
    wx.removeStorageSync(ADMIN_TOKEN_KEY)
    this.setData({ adminToken: '', dishes: [], visibleDishes: [] })
  },

  async loadAdminData() {
    if (!this.data.adminToken) return
    this.setData({ loading: true })
    try {
      const [announcement, categories, dishes] = await Promise.all([
        api.announcement(this.data.schoolId),
        api.categories(this.data.schoolId),
        api.dishes(this.data.schoolId, true)
      ])
      const normalizedDishes = (dishes || []).map(normalizeDish)
      this.setData({
        announcement: announcement || '',
        categories: categories || [],
        dishes: normalizedDishes,
        stats: {
          total: normalizedDishes.length,
          active: countByStatus(normalizedDishes, 'ACTIVE'),
          offline: countByStatus(normalizedDishes, 'OFFLINE'),
          pending: countByStatus(normalizedDishes, 'PENDING')
        }
      })
      this.applyStatusFilter()
    } catch (err) {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  applyStatusFilter() {
    const { activeStatus, dishes } = this.data
    const visibleDishes = activeStatus === 'all'
      ? dishes
      : dishes.filter((dish) => (dish.status || 'ACTIVE') === activeStatus)
    this.setData({ visibleDishes })
  },

  switchStatus(e) {
    this.setData({ activeStatus: e.currentTarget.dataset.status })
    this.applyStatusFilter()
  },

  onAnnouncementInput(e) {
    this.setData({ announcement: e.detail.value })
  },

  async saveAnnouncement() {
    this.setData({ saving: true })
    try {
      await api.setAnnouncement(this.data.adminToken, this.data.schoolId, this.data.announcement.trim())
      wx.showToast({ title: '公告已保存', icon: 'success' })
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  },

  onCategoryInput(e) {
    this.setData({ categoryName: e.detail.value })
  },

  async addCategory() {
    const name = this.data.categoryName.trim()
    if (!name) {
      wx.showToast({ title: '请输入分类名', icon: 'none' })
      return
    }

    try {
      const category = await api.createCategory(this.data.adminToken, this.data.schoolId, name)
      this.setData({
        categoryName: '',
        categories: [...this.data.categories, category]
      })
      wx.showToast({ title: '分类已添加', icon: 'success' })
    } catch (err) {
      wx.showToast({ title: err.message || '添加失败', icon: 'none' })
    }
  },

  async updateDishStatus(e) {
    const { id, status } = e.currentTarget.dataset
    if (!id || !status) return

    try {
      await api.updateDish(this.data.adminToken, id, { status })
      wx.showToast({ title: status === 'ACTIVE' ? '已上架' : '已下架', icon: 'success' })
      await this.loadAdminData()
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    }
  },

  openEditSheet(e) {
    const dish = this.data.dishes.find((item) => item.id === e.currentTarget.dataset.id)
    if (!dish) return
    this.setData({
      showEditSheet: true,
      editingDishId: dish.id,
      editForm: {
        name: dish.name || '',
        categoryName: dish.categoryName || '',
        shopName: dish.shopName || '',
        floorName: dish.floorName || '',
        description: dish.description || '',
        imageUrl: dish.imageUrl === DISH_PLACEHOLDER ? '' : dish.imageUrl || ''
      }
    })
  },

  closeEditSheet() {
    this.setData({ showEditSheet: false, editingDishId: '' })
  },

  onEditInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`editForm.${field}`]: e.detail.value })
  },

  async saveDishEdit() {
    const { editForm, editingDishId } = this.data
    if (!editingDishId) return
    if (!editForm.name.trim()) {
      wx.showToast({ title: '菜名不能为空', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    try {
      await api.updateDish(this.data.adminToken, editingDishId, {
        name: editForm.name.trim(),
        categoryName: editForm.categoryName.trim(),
        shopName: editForm.shopName.trim(),
        floorName: editForm.floorName.trim(),
        description: editForm.description.trim(),
        imageUrl: editForm.imageUrl.trim()
      })
      wx.showToast({ title: '菜品已保存', icon: 'success' })
      this.closeEditSheet()
      await this.loadAdminData()
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  },

  goBack() {
    wx.navigateBack()
  }
})
