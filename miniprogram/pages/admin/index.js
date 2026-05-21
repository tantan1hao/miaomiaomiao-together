const api = require('../../utils/api')

Page({
  data: {
    schoolId: '',
    schoolName: '',
    schoolAdmin: '',
    canteenList: [],
    loading: true,
    announcement: '',
    showCanteenModal: false,
    newCanteenName: '',
    showFloorModal: false,
    newFloorName: '',
    currentCanteenId: '',
    schoolStats: {
      total: 0,
      today: 0
    },
    showShopEditModal: false,
    currentEditShop: '',
    currentEditShopKey: '',
    shopEditData: {
      signature: '',
      description: '',
      openTime: '',
      closeTime: '',
      minPrice: '',
      maxPrice: '',
      tagsStr: ''
    }
  },

  onLoad(options) {
    const schoolId = options.schoolId || 'bistu'
    const schoolName = decodeURIComponent(options.schoolName || '北京信息科技大学')

    this.setData({ schoolId, schoolName })
    this.loadSchoolInfo()
    this.loadCanteenData()
    this.loadAnnouncement()
    this.loadSchoolStats()
  },

  async loadSchoolInfo() {
    if (this.data.schoolId === 'bistu') {
      this.setData({ schoolAdmin: '西风漂流' })
      return
    }

    try {
      const res = await api.callFunction({ action: 'getSchools' })

      if (res.result && res.result.success && res.result.data) {
        const school = res.result.data.find(s => s._id === this.data.schoolId)
        if (school && school.admin) {
          this.setData({ schoolAdmin: school.admin })
        }
      }
    } catch (e) {
      console.log('加载学校信息失败', e)
    }
  },

  async loadCanteenData() {
    wx.showLoading({ title: '加载中...' })

    try {
      const res = await api.callFunction({
          action: 'getCanteenData',
          schoolId: this.data.schoolId
        })

      if (res.result && res.result.success && res.result.data && res.result.data.length > 0) {
        const canteenList = res.result.data.map(canteen => {
          let totalShops = 0
          const floors = (canteen.floors || []).map(floor => {
            totalShops += (floor.shops || []).length
            return {
              name: floor.name,
              shops: floor.shops || [],
              expanded: false,
              newShopName: ''
            }
          })
          return {
            _id: canteen._id,
            name: canteen.name,
            order: canteen.order,
            floors: floors,
            totalShops: totalShops,
            expanded: false
          }
        })
        this.setData({ canteenList, loading: false })
      } else {
        await this.initDefaultData()
      }
    } catch (e) {
      console.log('加载数据失败', e)
      await this.initDefaultData()
    }

    wx.hideLoading()
  },

  async loadAnnouncement() {
    try {
      const res = await api.callFunction({
          action: 'getAnnouncement',
          schoolId: this.data.schoolId
        })
      if (res.result && res.result.success) {
        this.setData({ announcement: res.result.data })
      }
    } catch (e) {
      console.log('加载公告失败', e)
    }
  },

  async loadSchoolStats() {
    try {
      const res = await api.callFunction({
          action: 'getSchoolStats',
          schoolId: this.data.schoolId
        })
      if (res.result && res.result.success) {
        this.setData({ schoolStats: res.result.data })
      }
    } catch (e) {
      console.log('加载学校统计失败', e)
    }
  },

  onAnnouncementInput(e) {
    this.setData({ announcement: e.detail.value })
  },

  async saveAnnouncement() {
    try {
      const res = await api.callFunction({
          action: 'setAnnouncement',
          schoolId: this.data.schoolId,
          data: { content: this.data.announcement }
        })
      if (res.result && res.result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' })
      } else {
        wx.showToast({ title: '保存失败', icon: 'error' })
      }
    } catch (e) {
      console.log('保存公告失败', e)
      wx.showToast({ title: '保存失败', icon: 'error' })
    }
  },

  async initDefaultData() {
    try {
      const res = await api.callFunction({
          action: 'initCanteenData',
          schoolId: this.data.schoolId
        })

      if (res.result && res.result.success) {
        await this.loadCanteenData()
      }
    } catch (e) {
      console.log('初始化数据失败', e)
      wx.showToast({ title: '初始化失败', icon: 'error' })
    }
  },

  toggleCanteen(e) {
    const canteenId = e.currentTarget.dataset.canteen
    const canteenList = this.data.canteenList.map(c => {
      if (c._id === canteenId) {
        return { ...c, expanded: !c.expanded }
      }
      return c
    })
    this.setData({ canteenList })
  },

  toggleFloor(e) {
    const { canteen, floor } = e.currentTarget.dataset
    const canteenList = this.data.canteenList.map(c => {
      if (c._id === canteen) {
        return {
          ...c,
          floors: c.floors.map(f => {
            if (f.name === floor) {
              return { ...f, expanded: !f.expanded }
            }
            return f
          })
        }
      }
      return c
    })
    this.setData({ canteenList })
  },

  onShopInput(e) {
    const { canteen, floor } = e.currentTarget.dataset
    const value = e.detail.value
    const canteenList = this.data.canteenList.map(c => {
      if (c._id === canteen) {
        return {
          ...c,
          floors: c.floors.map(f => {
            if (f.name === floor) {
              return { ...f, newShopName: value }
            }
            return f
          })
        }
      }
      return c
    })
    this.setData({ canteenList })
  },

  async addShop(e) {
    const { canteen, floor } = e.currentTarget.dataset
    const canteenItem = this.data.canteenList.find(c => c._id === canteen._id)
    if (!canteenItem) return

    const floorItem = canteenItem.floors.find(f => f.name === floor)
    if (!floorItem) return

    const shopName = floorItem.newShopName
    if (!shopName || !shopName.trim()) {
      wx.showToast({ title: '请输入店铺名称', icon: 'none' })
      return
    }

    if (floorItem.shops.includes(shopName.trim())) {
      wx.showToast({ title: '该店铺已存在', icon: 'none' })
      return
    }

    try {
      const res = await api.callFunction({
          action: 'addShop',
          schoolId: this.data.schoolId,
          data: {
            canteenId: canteen._id,
            floorName: floor,
            shopName: shopName.trim()
          }
        })

      if (res.result && res.result.success) {
        const newShops = [...floorItem.shops, shopName.trim()]
        const canteenList = this.data.canteenList.map(c => {
          if (c._id === canteen._id) {
            return {
              ...c,
              totalShops: c.totalShops + 1,
              floors: c.floors.map(f => {
                if (f.name === floor) {
                  return { ...f, shops: newShops, newShopName: '' }
                }
                return f
              })
            }
          }
          return c
        })
        this.setData({ canteenList })
        wx.showToast({ title: '添加成功', icon: 'success' })
      } else {
        wx.showToast({ title: '添加失败', icon: 'error' })
      }
    } catch (err) {
      console.log('添加失败', err)
      wx.showToast({ title: '添加失败', icon: 'error' })
    }
  },

  async deleteShop(e) {
    const { canteen, floor, shop } = e.currentTarget.dataset

    wx.showModal({
      title: '确认删除',
      content: `确定要删除"${shop}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          const canteenItem = this.data.canteenList.find(c => c._id === canteen._id)
          if (!canteenItem) return

          const floorItem = canteenItem.floors.find(f => f.name === floor)
          if (!floorItem) return

          try {
            const result = await api.callFunction({
                action: 'deleteShop',
                schoolId: this.data.schoolId,
                data: {
                  canteenId: canteen._id,
                  floorName: floor,
                  shopName: shop
                }
              })

            if (result.result && result.result.success) {
              const newShops = floorItem.shops.filter(s => s !== shop)
              const canteenList = this.data.canteenList.map(c => {
                if (c._id === canteen._id) {
                  return {
                    ...c,
                    totalShops: c.totalShops - 1,
                    floors: c.floors.map(f => {
                      if (f.name === floor) {
                        return { ...f, shops: newShops }
                      }
                      return f
                    })
                  }
                }
                return c
              })
              this.setData({ canteenList })
              wx.showToast({ title: '删除成功', icon: 'success' })
            } else {
              wx.showToast({ title: '删除失败', icon: 'error' })
            }
          } catch (err) {
            console.log('删除失败', err)
            wx.showToast({ title: '删除失败', icon: 'error' })
          }
        }
      }
    })
  },

  showAddCanteenModal() {
    this.setData({
      showCanteenModal: true,
      newCanteenName: ''
    })
  },

  closeCanteenModal() {
    this.setData({
      showCanteenModal: false,
      newCanteenName: ''
    })
  },

  onCanteenNameInput(e) {
    this.setData({ newCanteenName: e.detail.value })
  },

  async addCanteen() {
    const name = this.data.newCanteenName.trim()
    if (!name) {
      wx.showToast({ title: '请输入食堂名称', icon: 'none' })
      return
    }

    wx.showLoading({ title: '添加中...' })

    try {
      const res = await api.callFunction({
          action: 'addCanteen',
          schoolId: this.data.schoolId,
          data: { name }
        })

      if (res.result && res.result.success) {
        wx.showToast({ title: '添加成功', icon: 'success' })
        this.closeCanteenModal()
        this.loadCanteenData()
      } else {
        wx.showToast({ title: res.result.message || '添加失败', icon: 'error' })
      }
    } catch (e) {
      console.log('添加食堂失败', e)
      wx.showToast({ title: '添加失败', icon: 'error' })
    }

    wx.hideLoading()
  },

  deleteCanteen(e) {
    const canteen = e.currentTarget.dataset.canteen

    wx.showModal({
      title: '确认删除',
      content: `确定要删除"${canteen.name}"吗？该食堂下的所有店铺都将被删除。`,
      confirmColor: '#ff6b6b',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })

          try {
            const result = await api.callFunction({
                action: 'deleteCanteen',
                schoolId: this.data.schoolId,
                data: { canteenId: canteen._id }
              })

            if (result.result && result.result.success) {
              wx.showToast({ title: '删除成功', icon: 'success' })
              this.loadCanteenData()
            } else {
              wx.showToast({ title: '删除失败', icon: 'error' })
            }
          } catch (err) {
            console.log('删除食堂失败', err)
            wx.showToast({ title: '删除失败', icon: 'error' })
          }

          wx.hideLoading()
        }
      }
    })
  },

  showAddFloorModal(e) {
    const canteen = e.currentTarget.dataset.canteen
    this.setData({
      showFloorModal: true,
      newFloorName: '',
      currentCanteenId: canteen._id
    })
  },

  closeFloorModal() {
    this.setData({
      showFloorModal: false,
      newFloorName: '',
      currentCanteenId: ''
    })
  },

  onFloorNameInput(e) {
    this.setData({ newFloorName: e.detail.value })
  },

  async addFloor() {
    const floorName = this.data.newFloorName.trim()
    if (!floorName) {
      wx.showToast({ title: '请输入楼层名称', icon: 'none' })
      return
    }

    wx.showLoading({ title: '添加中...' })

    try {
      const res = await api.callFunction({
          action: 'addFloor',
          schoolId: this.data.schoolId,
          data: {
            canteenId: this.data.currentCanteenId,
            floorName
          }
        })

      if (res.result && res.result.success) {
        wx.showToast({ title: '添加成功', icon: 'success' })
        this.closeFloorModal()
        this.loadCanteenData()
      } else {
        wx.showToast({ title: res.result.message || '添加失败', icon: 'error' })
      }
    } catch (e) {
      console.log('添加楼层失败', e)
      wx.showToast({ title: '添加失败', icon: 'error' })
    }

    wx.hideLoading()
  },

  deleteFloor(e) {
    const { canteen, floor } = e.currentTarget.dataset

    wx.showModal({
      title: '确认删除',
      content: `确定要删除"${floor.name}"吗？该楼层下的所有店铺都将被删除。`,
      confirmColor: '#ff6b6b',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })

          try {
            const result = await api.callFunction({
                action: 'deleteFloor',
                schoolId: this.data.schoolId,
                data: {
                  canteenId: canteen._id,
                  floorName: floor.name
                }
              })

            if (result.result && result.result.success) {
              wx.showToast({ title: '删除成功', icon: 'success' })
              this.loadCanteenData()
            } else {
              wx.showToast({ title: '删除失败', icon: 'error' })
            }
          } catch (err) {
            console.log('删除楼层失败', err)
            wx.showToast({ title: '删除失败', icon: 'error' })
          }

          wx.hideLoading()
        }
      }
    })
  },

  goBack() {
    wx.navigateBack()
  },

  async showShopEditModal(e) {
    const { canteen, floor, shop } = e.currentTarget.dataset
    const shopKey = `${canteen.name}-${floor}-${shop}`

    this.setData({
      showShopEditModal: true,
      currentEditShop: shop,
      currentEditShopKey: shopKey,
      shopEditData: {
        signature: '',
        description: '',
        openTime: '',
        closeTime: '',
        minPrice: '',
        maxPrice: '',
        tagsStr: ''
      }
    })

    try {
      const res = await api.callFunction({
          action: 'getShopStats',
          schoolId: this.data.schoolId,
          shopKey: shopKey
        })

      if (res.result && res.result.success && res.result.data) {
        const data = res.result.data
        this.setData({
          shopEditData: {
            signature: data.signature || '',
            description: data.description || '',
            openTime: data.openTime || '',
            closeTime: data.closeTime || '',
            minPrice: data.minPrice || '',
            maxPrice: data.maxPrice || '',
            tagsStr: (data.tags || []).join(',')
          }
        })
      }
    } catch (e) {
      console.log('加载店铺信息失败', e)
    }
  },

  closeShopEditModal() {
    this.setData({
      showShopEditModal: false,
      currentEditShop: '',
      currentEditShopKey: '',
      shopEditData: {
        signature: '',
        description: '',
        openTime: '',
        closeTime: '',
        minPrice: '',
        maxPrice: '',
        tagsStr: ''
      }
    })
  },

  onShopEditInput(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({
      [`shopEditData.${field}`]: value
    })
  },

  async saveShopEdit() {
    const { currentEditShopKey, shopEditData } = this.data

    if (!currentEditShopKey) {
      wx.showToast({ title: '店铺信息错误', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })

    try {
      const tags = shopEditData.tagsStr
        ? shopEditData.tagsStr.split(',').map(t => t.trim()).filter(t => t)
        : []

      const res = await api.callFunction({
          action: 'updateShopInfo',
          schoolId: this.data.schoolId,
          data: {
            shopKey: currentEditShopKey,
            signature: shopEditData.signature,
            description: shopEditData.description,
            openTime: shopEditData.openTime,
            closeTime: shopEditData.closeTime,
            minPrice: shopEditData.minPrice,
            maxPrice: shopEditData.maxPrice,
            tags: tags
          }
        })

      wx.hideLoading()

      if (res.result && res.result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' })
        this.closeShopEditModal()
      } else {
        wx.showToast({ title: res.result.message || '保存失败', icon: 'error' })
      }
    } catch (e) {
      wx.hideLoading()
      console.log('保存店铺信息失败', e)
      wx.showToast({ title: '保存失败', icon: 'error' })
    }
  }
})
