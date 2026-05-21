const api = require('../../utils/api')

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

function normalizeDish(dish, index) {
  return {
    ...dish,
    rank: index + 1,
    scoreText: Number(dish.avgScore || 0).toFixed(1),
    ratingText: `${dish.ratingCount || 0} 人评分`,
    placeText: [dish.canteenName, dish.floorName, dish.shopName].filter(Boolean).join(' · ') || '校园食堂'
  }
}

Page({
  data: {
    schoolId: 'bistu',
    schoolName: '北京信息科技大学',
    activePanel: 'rank',
    categories: [],
    rankings: [],
    loading: true,
    submitting: false,
    ratingDishId: '',
    message: '',
    imagePath: '',
    imageName: '',
    form: {
      name: '',
      categoryName: '',
      description: '',
      shopName: '',
      floorName: ''
    }
  },

  onLoad(options) {
    const selectedSchool = wx.getStorageSync('selectedSchool') || {}
    const schoolId = options.schoolId || selectedSchool._id || 'bistu'
    const schoolName = options.schoolName
      ? decodeURIComponent(options.schoolName)
      : selectedSchool.name || '北京信息科技大学'

    this.setData({ schoolId, schoolName })
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh())
  },

  switchPanel(e) {
    this.setData({
      activePanel: e.currentTarget.dataset.panel
    })
  },

  async loadData() {
    this.setData({ loading: true, message: '' })
    try {
      const [categories, rankings] = await Promise.all([
        api.categories(this.data.schoolId),
        api.rankings(this.data.schoolId, 50)
      ])

      this.setData({
        categories: categories || [],
        rankings: (rankings || []).map(normalizeDish),
        message: rankings && rankings.length ? '' : '暂无菜品，先上传第一道',
        loading: false
      })
    } catch (e) {
      this.setData({
        loading: false,
        message: e.message || '榜单加载失败'
      })
    }
  },

  onFormInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      [`form.${field}`]: e.detail.value
    })
  },

  chooseCategory(e) {
    this.setData({
      'form.categoryName': e.currentTarget.dataset.name
    })
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        if (!file) return
        if (file.size > MAX_IMAGE_SIZE) {
          wx.showToast({ title: '图片不能超过 5MB', icon: 'none' })
          return
        }

        const pathParts = file.tempFilePath.split('/')
        this.setData({
          imagePath: file.tempFilePath,
          imageName: pathParts[pathParts.length - 1] || '已选择图片'
        })
      }
    })
  },

  clearImage() {
    this.setData({
      imagePath: '',
      imageName: ''
    })
  },

  resetForm() {
    this.setData({
      imagePath: '',
      imageName: '',
      form: {
        name: '',
        categoryName: '',
        description: '',
        shopName: '',
        floorName: ''
      }
    })
  },

  async submitDish() {
    const { form, schoolId, imagePath } = this.data
    const name = form.name.trim()
    if (!name) {
      wx.showToast({ title: '填写菜名', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '提交中...' })

    try {
      const token = await api.getUserToken()
      await api.uploadDish(token, {
        schoolId,
        name,
        categoryName: form.categoryName.trim(),
        description: form.description.trim(),
        shopName: form.shopName.trim(),
        floorName: form.floorName.trim()
      }, imagePath)

      wx.showToast({ title: '已上传', icon: 'success' })
      this.resetForm()
      this.setData({ activePanel: 'rank' })
      await this.loadData()
    } catch (e) {
      wx.showToast({ title: e.message || '上传失败', icon: 'none' })
    } finally {
      wx.hideLoading()
      this.setData({ submitting: false })
    }
  },

  async rateDish(e) {
    const { id, score } = e.currentTarget.dataset
    if (!id || !score || this.data.ratingDishId) return

    this.setData({ ratingDishId: id })
    try {
      const token = await api.getUserToken()
      await api.rateDish(token, id, Number(score))
      wx.showToast({ title: '评分已更新', icon: 'success' })
      await this.loadData()
    } catch (err) {
      wx.showToast({ title: err.message || '评分失败', icon: 'none' })
    } finally {
      this.setData({ ratingDishId: '' })
    }
  }
})
