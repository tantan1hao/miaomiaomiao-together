const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

const MASTER_PASSWORD = '000000'
const BISTU_ID = 'bistu'

exports.main = async (event, context) => {
  const { action, data, schoolId } = event
  
  switch (action) {
    case 'getSchools':
      return await getSchools()
    case 'addSchool':
      return await addSchool(data)
    case 'updateSchool':
      return await updateSchool(data)
    case 'deleteSchool':
      return await deleteSchool(data)
    case 'updateSchoolOrder':
      return await updateSchoolOrder(data)
    case 'verifyPassword':
      return await verifyPassword(data)
    case 'getCanteenData':
      return await getCanteenData(schoolId)
    case 'initCanteenData':
      return await initCanteenData(schoolId)
    case 'addCanteen':
      return await addCanteen(data, schoolId)
    case 'deleteCanteen':
      return await deleteCanteen(data, schoolId)
    case 'addShop':
      return await addShop(data, schoolId)
    case 'deleteShop':
      return await deleteShop(data, schoolId)
    case 'addFloor':
      return await addFloor(data, schoolId)
    case 'deleteFloor':
      return await deleteFloor(data, schoolId)
    case 'getStats':
      return await getStats()
    case 'incrementStats':
      return await incrementStats(schoolId)
    case 'getSchoolStats':
      return await getSchoolStats(schoolId)
    case 'getAllSchoolStats':
      return await getAllSchoolStats()
    case 'getAnnouncement':
      return await getAnnouncement(schoolId)
    case 'setAnnouncement':
      return await setAnnouncement(data, schoolId)
    case 'addToReputationShop':
      return await addToReputationShop(data, schoolId)
    case 'getReputationStats':
      return await getReputationStats(schoolId)
    case 'getShopStats':
      return await getShopStats(event.shopKey, schoolId)
    case 'submitRating':
      return await submitRating(event.shopKey, event.rating, schoolId)
    case 'updateShopInfo':
      return await updateShopInfo(data, schoolId)
    case 'getShopList':
      return await getShopList(schoolId)
    case 'getAllShopStats':
      return await getAllShopStats(schoolId)
    case 'submitSuggestion':
      return await submitSuggestion(data)
    case 'getSuggestions':
      return await getSuggestions()
    default:
      return { success: false, message: '未知操作' }
  }
}

async function getSchools() {
  try {
    const MAX_LIMIT = 100
    const res = await db.collection('schools').orderBy('order', 'asc').orderBy('createTime', 'asc').limit(MAX_LIMIT).get()
    return { success: true, data: res.data }
  } catch (e) {
    return { success: false, message: e.message }
  }
}

async function addSchool(data) {
  const { name, password, abbr, admin } = data
  
  if (!name || !name.trim()) {
    return { success: false, message: '学校名称不能为空' }
  }
  if (!password || !password.trim()) {
    return { success: false, message: '密码不能为空' }
  }
  if (!abbr || !abbr.trim()) {
    return { success: false, message: '英文简称不能为空' }
  }
  
  try {
    const existRes = await db.collection('schools').where({
      name: name.trim()
    }).get()
    
    if (existRes.data.length > 0) {
      return { success: false, message: '学校名称已存在' }
    }
    
    const res = await db.collection('schools').add({
      data: {
        name: name.trim(),
        password: password.trim(),
        abbr: abbr.trim().toUpperCase(),
        admin: admin ? admin.trim() : '',
        createTime: Date.now(),
        status: 1
      }
    })
    
    return { success: true, data: { _id: res._id, name: name.trim(), abbr: abbr.trim().toUpperCase(), admin: admin ? admin.trim() : '' } }
  } catch (e) {
    return { success: false, message: e.message }
  }
}

async function updateSchool(data) {
  const { schoolId, name, password, abbr, admin } = data
  
  try {
    const updateData = {}
    if (name && name.trim()) {
      updateData.name = name.trim()
    }
    if (password && password.trim()) {
      updateData.password = password.trim()
    }
    if (abbr && abbr.trim()) {
      updateData.abbr = abbr.trim().toUpperCase()
    }
    if (admin !== undefined) {
      updateData.admin = admin.trim()
    }
    
    if (Object.keys(updateData).length === 0) {
      return { success: false, message: '没有需要更新的内容' }
    }
    
    await db.collection('schools').doc(schoolId).update({
      data: updateData
    })
    
    return { success: true }
  } catch (e) {
    return { success: false, message: e.message }
  }
}

async function deleteSchool(data) {
  const { schoolId } = data
  
  try {
    await db.collection('schools').doc(schoolId).remove()
    
    await db.collection('canteen').where({
      schoolId: schoolId
    }).remove()
    
    await db.collection('config').where({
      schoolId: schoolId
    }).remove()
    
    return { success: true }
  } catch (e) {
    return { success: false, message: e.message }
  }
}

async function updateSchoolOrder(data) {
  const { schoolOrders } = data
  
  if (!schoolOrders || !Array.isArray(schoolOrders)) {
    return { success: false, message: '参数错误' }
  }
  
  try {
    for (let i = 0; i < schoolOrders.length; i++) {
      await db.collection('schools').doc(schoolOrders[i]).update({
        data: { order: i + 1 }
      })
    }
    return { success: true }
  } catch (e) {
    return { success: false, message: e.message }
  }
}

async function verifyPassword(data) {
  const { password } = data
  
  if (password === MASTER_PASSWORD) {
    return {
      success: true,
      data: {
        role: 'master',
        schoolId: BISTU_ID,
        schoolName: '北京信息科技大学'
      }
    }
  }
  
  try {
    const res = await db.collection('schools').where({
      password: password
    }).get()
    
    if (res.data.length > 0) {
      const school = res.data[0]
      return {
        success: true,
        data: {
          role: 'school',
          schoolId: school._id,
          schoolName: school.name
        }
      }
    }
    
    return { success: false, message: '密码错误' }
  } catch (e) {
    return { success: false, message: e.message }
  }
}

async function getCanteenData(schoolId) {
  try {
    let res
    if (schoolId && schoolId !== BISTU_ID) {
      res = await db.collection('canteen').where({
        schoolId: schoolId
      }).orderBy('order', 'asc').get()
    } else {
      res = await db.collection('canteen').where(_.or(
        { schoolId: BISTU_ID },
        { schoolId: null },
        { schoolId: _.exists(false) }
      )).orderBy('order', 'asc').get()
    }
    return { success: true, data: res.data }
  } catch (e) {
    return { success: false, message: e.message }
  }
}

async function initCanteenData(schoolId) {
  const defaultData = [
    {
      name: '一食堂',
      order: 1,
      floors: [
        { name: '一楼', shops: ['黄焖鸡米饭', '麻辣香锅', '兰州拉面', '重庆小面', '煎饼果子', '肉夹馍'] },
        { name: '二楼', shops: ['自助餐', '小炒肉', '酸菜鱼', '煲仔饭', '过桥米线', '铁板烧'] },
        { name: '三楼', shops: ['火锅', '烤肉', '韩式料理', '日式料理', '西餐厅', '甜品站'] }
      ]
    },
    {
      name: '二食堂',
      order: 2,
      floors: [
        { name: '一楼', shops: ['沙县小吃', '桂林米粉', '湘菜馆', '川菜馆', '粤菜馆', '饺子馆'] },
        { name: '二楼', shops: ['汉堡王', '肯德基', '必胜客', '赛百味', '奶茶店', '咖啡厅'] },
        { name: '三楼', shops: ['麻辣烫', '冒菜', '干锅', '烤鱼', '烧烤', '小龙虾'] },
        { name: '四楼', shops: ['精致自助', '海鲜餐厅', '牛排馆', '寿司店', '私房菜', '特色火锅'] }
      ]
    }
  ]

  try {
    for (const canteen of defaultData) {
      const dataToAdd = {
        ...canteen,
        schoolId: schoolId || BISTU_ID
      }
      await db.collection('canteen').add({ data: dataToAdd })
    }
    return { success: true, message: '初始化成功' }
  } catch (e) {
    return { success: false, message: e.message }
  }
}

async function addCanteen(data, schoolId) {
  const { name } = data
  
  if (!name || !name.trim()) {
    return { success: false, message: '食堂名称不能为空' }
  }
  
  try {
    let countRes
    if (schoolId && schoolId !== BISTU_ID) {
      countRes = await db.collection('canteen').where({
        schoolId: schoolId
      }).count()
    } else {
      countRes = await db.collection('canteen').where(_.or(
        { schoolId: BISTU_ID },
        { schoolId: null },
        { schoolId: _.exists(false) }
      )).count()
    }
    const order = countRes.total + 1
    
    await db.collection('canteen').add({
      data: {
        name: name.trim(),
        order: order,
        floors: [],
        schoolId: schoolId || BISTU_ID
      }
    })
    
    return { success: true }
  } catch (e) {
    return { success: false, message: e.message }
  }
}

async function deleteCanteen(data, schoolId) {
  const { canteenId } = data
  
  try {
    await db.collection('canteen').doc(canteenId).remove()
    return { success: true }
  } catch (e) {
    return { success: false, message: e.message }
  }
}

async function addShop(data, schoolId) {
  const { canteenId, floorName, shopName } = data
  
  try {
    const canteen = await db.collection('canteen').doc(canteenId).get()
    if (!canteen.data) {
      return { success: false, message: '食堂不存在' }
    }
    
    const floors = canteen.data.floors.map(floor => {
      if (floor.name === floorName) {
        if (floor.shops.includes(shopName)) {
          return floor
        }
        return { ...floor, shops: [...floor.shops, shopName] }
      }
      return floor
    })
    
    await db.collection('canteen').doc(canteenId).update({
      data: { floors: _.set(floors) }
    })
    
    return { success: true }
  } catch (e) {
    return { success: false, message: e.message }
  }
}

async function deleteShop(data, schoolId) {
  const { canteenId, floorName, shopName } = data
  
  try {
    const canteen = await db.collection('canteen').doc(canteenId).get()
    if (!canteen.data) {
      return { success: false, message: '食堂不存在' }
    }
    
    const floors = canteen.data.floors.map(floor => {
      if (floor.name === floorName) {
        return { ...floor, shops: floor.shops.filter(s => s !== shopName) }
      }
      return floor
    })
    
    await db.collection('canteen').doc(canteenId).update({
      data: { floors: _.set(floors) }
    })
    
    return { success: true }
  } catch (e) {
    return { success: false, message: e.message }
  }
}

async function addFloor(data, schoolId) {
  const { canteenId, floorName } = data
  
  if (!floorName || !floorName.trim()) {
    return { success: false, message: '楼层名称不能为空' }
  }
  
  try {
    const canteen = await db.collection('canteen').doc(canteenId).get()
    if (!canteen.data) {
      return { success: false, message: '食堂不存在' }
    }
    
    const existFloor = canteen.data.floors.find(f => f.name === floorName.trim())
    if (existFloor) {
      return { success: false, message: '该楼层已存在' }
    }
    
    const floors = [...canteen.data.floors, { name: floorName.trim(), shops: [] }]
    
    await db.collection('canteen').doc(canteenId).update({
      data: { floors: _.set(floors) }
    })
    
    return { success: true }
  } catch (e) {
    return { success: false, message: e.message }
  }
}

async function deleteFloor(data, schoolId) {
  const { canteenId, floorName } = data
  
  try {
    const canteen = await db.collection('canteen').doc(canteenId).get()
    if (!canteen.data) {
      return { success: false, message: '食堂不存在' }
    }
    
    const floors = canteen.data.floors.filter(f => f.name !== floorName)
    
    await db.collection('canteen').doc(canteenId).update({
      data: { floors: _.set(floors) }
    })
    
    return { success: true }
  } catch (e) {
    return { success: false, message: e.message }
  }
}

async function getStats() {
  const today = getTodayStr()
  
  try {
    let total = 0
    let todayCount = 0
    
    const totalRes = await db.collection('stats').doc('total').get().catch(() => null)
    if (totalRes && totalRes.data) {
      total = totalRes.data.count || 0
    }
    
    const todayRes = await db.collection('stats').doc(today).get().catch(() => null)
    if (todayRes && todayRes.data) {
      todayCount = todayRes.data.count || 0
    }
    
    return {
      success: true,
      data: {
        total: total,
        today: todayCount
      }
    }
  } catch (e) {
    console.error('getStats error:', e)
    return {
      success: true,
      data: {
        total: 0,
        today: 0
      }
    }
  }
}

async function incrementStats(schoolId) {
  const today = getTodayStr()
  const currentSchoolId = schoolId || BISTU_ID
  
  try {
    let total = 0
    let todayCount = 0
    
    const totalDoc = await db.collection('stats').doc('total').get().catch(() => null)
    if (totalDoc && totalDoc.data) {
      await db.collection('stats').doc('total').update({
        data: { count: _.inc(1) }
      })
      total = totalDoc.data.count + 1
    } else {
      await db.collection('stats').add({
        data: { _id: 'total', count: 1 }
      })
      total = 1
    }

    const todayDoc = await db.collection('stats').doc(today).get().catch(() => null)
    if (todayDoc && todayDoc.data) {
      await db.collection('stats').doc(today).update({
        data: { count: _.inc(1) }
      })
      todayCount = todayDoc.data.count + 1
    } else {
      await db.collection('stats').add({
        data: { _id: today, count: 1 }
      })
      todayCount = 1
    }

    const schoolTotalId = `${currentSchoolId}_total`
    const schoolTotalDoc = await db.collection('schoolStats').doc(schoolTotalId).get().catch(() => null)
    if (schoolTotalDoc && schoolTotalDoc.data) {
      await db.collection('schoolStats').doc(schoolTotalId).update({
        data: { count: _.inc(1) }
      })
    } else {
      await db.collection('schoolStats').add({
        data: { 
          _id: schoolTotalId, 
          count: 1, 
          schoolId: currentSchoolId, 
          type: 'total' 
        }
      })
    }

    const schoolTodayId = `${currentSchoolId}_${today}`
    const schoolTodayDoc = await db.collection('schoolStats').doc(schoolTodayId).get().catch(() => null)
    if (schoolTodayDoc && schoolTodayDoc.data) {
      await db.collection('schoolStats').doc(schoolTodayId).update({
        data: { count: _.inc(1) }
      })
    } else {
      await db.collection('schoolStats').add({
        data: { 
          _id: schoolTodayId, 
          count: 1, 
          schoolId: currentSchoolId, 
          type: 'daily',
          date: today
        }
      })
    }

    return { 
      success: true, 
      data: {
        total: total,
        today: todayCount
      }
    }
  } catch (e) {
    console.error('incrementStats error:', e)
    return { success: false, message: e.message }
  }
}

async function getSchoolStats(schoolId) {
  const today = getTodayStr()
  const currentSchoolId = schoolId || BISTU_ID
  
  try {
    let total = 0
    let todayCount = 0
    
    const totalId = `${currentSchoolId}_total`
    const totalRes = await db.collection('schoolStats').doc(totalId).get().catch(() => null)
    if (totalRes && totalRes.data) {
      total = totalRes.data.count || 0
    }
    
    const todayId = `${currentSchoolId}_${today}`
    const todayRes = await db.collection('schoolStats').doc(todayId).get().catch(() => null)
    if (todayRes && todayRes.data) {
      todayCount = todayRes.data.count || 0
    }
    
    return {
      success: true,
      data: {
        total: total,
        today: todayCount
      }
    }
  } catch (e) {
    console.error('getSchoolStats error:', e)
    return {
      success: true,
      data: {
        total: 0,
        today: 0
      }
    }
  }
}

async function getAllSchoolStats() {
  const today = getTodayStr()
  
  try {
    const MAX_LIMIT = 100
    const schoolsRes = await db.collection('schools').limit(MAX_LIMIT).get()
    const schools = schoolsRes.data || []
    
    const allSchools = [
      { _id: BISTU_ID, name: '北京信息科技大学', abbr: 'BISTU' },
      ...schools
    ]
    
    let globalTotal = 0
    const globalTotalRes = await db.collection('stats').doc('total').get().catch(() => null)
    if (globalTotalRes && globalTotalRes.data) {
      globalTotal = globalTotalRes.data.count || 0
    }
    
    const result = []
    
    for (const school of allSchools) {
      let total = 0
      let todayCount = 0
      
      const totalId = `${school._id}_total`
      const schoolTotalRes = await db.collection('schoolStats').doc(totalId).get().catch(() => null)
      if (schoolTotalRes && schoolTotalRes.data) {
        total = schoolTotalRes.data.count || 0
      }
      
      const todayId = `${school._id}_${today}`
      const todayRes = await db.collection('schoolStats').doc(todayId).get().catch(() => null)
      if (todayRes && todayRes.data) {
        todayCount = todayRes.data.count || 0
      }
      
      result.push({
        _id: school._id,
        name: school.name,
        abbr: school.abbr,
        total: total,
        today: todayCount
      })
    }
    
    return {
      success: true,
      data: {
        globalTotal: globalTotal,
        schools: result
      }
    }
  } catch (e) {
    console.error('getAllSchoolStats error:', e)
    return {
      success: true,
      data: {
        globalTotal: 0,
        schools: []
      }
    }
  }
}

function getTodayStr() {
  const date = new Date(Date.now() + 8 * 60 * 60 * 1000)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

async function addToReputationShop(data, schoolId) {
  const { shopName } = data
  const currentSchoolId = schoolId || BISTU_ID
  
  if (!shopName || !shopName.trim()) {
    return { success: false, message: '店铺名称不能为空' }
  }
  
  try {
    const docId = `${currentSchoolId}_${shopName.trim()}`
    
    const existDoc = await db.collection('reputationShops').doc(docId).get().catch(() => null)
    
    if (existDoc && existDoc.data) {
      await db.collection('reputationShops').doc(docId).update({
        data: { count: _.inc(1), updatedAt: Date.now() }
      })
    } else {
      await db.collection('reputationShops').add({
        data: {
          _id: docId,
          schoolId: currentSchoolId,
          shopName: shopName.trim(),
          count: 1,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      })
    }
    
    const res = await db.collection('reputationShops')
      .where({
        schoolId: currentSchoolId
      })
      .orderBy('count', 'desc')
      .orderBy('updatedAt', 'asc')
      .limit(10)
      .get()
    
    const list = (res.data || []).map(item => ({
      shopName: item.shopName,
      count: item.count
    }))
    
    return { 
      success: true, 
      data: {
        count: list.length,
        list: list
      }
    }
  } catch (e) {
    console.error('addToReputationShop error:', e)
    return { success: false, message: e.message }
  }
}

async function getReputationStats(schoolId) {
  const currentSchoolId = schoolId || BISTU_ID
  
  try {
    const res = await db.collection('reputationShops')
      .where({
        schoolId: currentSchoolId
      })
      .orderBy('count', 'desc')
      .orderBy('updatedAt', 'asc')
      .limit(10)
      .get()
    
    const list = (res.data || []).map(item => ({
      shopName: item.shopName,
      count: item.count
    }))
    
    return {
      success: true,
      data: {
        count: list.length,
        list: list
      }
    }
  } catch (e) {
    console.error('getReputationStats error:', e)
    return {
      success: true,
      data: {
        count: 0,
        list: []
      }
    }
  }
}

async function getAnnouncement(schoolId) {
  try {
    let res
    if (schoolId && schoolId !== BISTU_ID) {
      res = await db.collection('config').where({
        schoolId: schoolId,
        type: 'announcement'
      }).get()
    } else {
      res = await db.collection('config').where(_.or(
        { schoolId: BISTU_ID, type: 'announcement' },
        { schoolId: null, type: 'announcement' },
        { schoolId: _.exists(false), type: 'announcement' },
        { _id: 'announcement' }
      )).get()
    }
    if (res.data && res.data.length > 0) {
      return { success: true, data: res.data[0].content || '' }
    }
    return { success: true, data: '' }
  } catch (e) {
    return { success: true, data: '' }
  }
}

async function setAnnouncement(data, schoolId) {
  const { content } = data
  try {
    let existRes
    if (schoolId && schoolId !== BISTU_ID) {
      existRes = await db.collection('config').where({
        schoolId: schoolId,
        type: 'announcement'
      }).get()
    } else {
      existRes = await db.collection('config').where(_.or(
        { schoolId: BISTU_ID, type: 'announcement' },
        { schoolId: null, type: 'announcement' },
        { schoolId: _.exists(false), type: 'announcement' },
        { _id: 'announcement' }
      )).get()
    }
    
    if (existRes.data && existRes.data.length > 0) {
      await db.collection('config').doc(existRes.data[0]._id).update({
        data: { content: content }
      })
    } else {
      await db.collection('config').add({
        data: {
          type: 'announcement',
          content: content,
          schoolId: schoolId || BISTU_ID
        }
      })
    }
    return { success: true }
  } catch (e) {
    return { success: false, message: e.message }
  }
}

async function getShopStats(shopKey, schoolId) {
  const currentSchoolId = schoolId || BISTU_ID
  
  if (!shopKey) {
    return { success: false, message: '店铺标识不能为空' }
  }
  
  try {
    const docId = `${currentSchoolId}_${shopKey}`
    
    const res = await db.collection('shopStats').doc(docId).get().catch(() => null)
    
    if (res && res.data) {
      const data = res.data
      const avgRating = data.totalRatings > 0 
        ? Math.round((data.totalScore / data.totalRatings) * 10) / 10 
        : 0
      
      return {
        success: true,
        data: {
          avgRating: avgRating,
          totalRatings: data.totalRatings || 0,
          rating5: data.rating5 || 0,
          rating4: data.rating4 || 0,
          rating3: data.rating3 || 0,
          rating2: data.rating2 || 0,
          rating1: data.rating1 || 0,
          selectCount: data.selectCount || 0,
          signature: data.signature || '',
          description: data.description || '',
          openTime: data.openTime || '',
          closeTime: data.closeTime || '',
          minPrice: data.minPrice || '',
          maxPrice: data.maxPrice || '',
          tags: data.tags || []
        }
      }
    }
    
    return {
      success: true,
      data: {
        avgRating: 0,
        totalRatings: 0,
        rating5: 0,
        rating4: 0,
        rating3: 0,
        rating2: 0,
        rating1: 0,
        selectCount: 0,
        signature: '',
        description: '',
        openTime: '',
        closeTime: '',
        minPrice: '',
        maxPrice: '',
        tags: []
      }
    }
  } catch (e) {
    console.error('getShopStats error:', e)
    return { success: false, message: e.message }
  }
}

async function submitRating(shopKey, rating, schoolId) {
  const currentSchoolId = schoolId || BISTU_ID
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  if (!shopKey) {
    return { success: false, message: '店铺标识不能为空' }
  }
  
  if (!rating || rating < 1 || rating > 5) {
    return { success: false, message: '评分必须在1-5之间' }
  }
  
  try {
    const ratingDocId = `${currentSchoolId}_${shopKey}_${openid}`
    
    const existRating = await db.collection('userRatings').doc(ratingDocId).get().catch(() => null)
    
    if (existRating && existRating.data) {
      return { success: false, message: '您已经评分过了' }
    }
    
    await db.collection('userRatings').add({
      data: {
        _id: ratingDocId,
        schoolId: currentSchoolId,
        shopKey: shopKey,
        openid: openid,
        rating: rating,
        createdAt: Date.now()
      }
    })
    
    const docId = `${currentSchoolId}_${shopKey}`
    const shopStatsDoc = await db.collection('shopStats').doc(docId).get().catch(() => null)
    
    if (shopStatsDoc && shopStatsDoc.data) {
      const updateData = {
        totalRatings: _.inc(1),
        totalScore: _.inc(rating),
        [`rating${rating}`]: _.inc(1),
        updatedAt: Date.now()
      }
      
      await db.collection('shopStats').doc(docId).update({
        data: updateData
      })
    } else {
      const initData = {
        _id: docId,
        schoolId: currentSchoolId,
        shopKey: shopKey,
        totalRatings: 1,
        totalScore: rating,
        rating5: rating === 5 ? 1 : 0,
        rating4: rating === 4 ? 1 : 0,
        rating3: rating === 3 ? 1 : 0,
        rating2: rating === 2 ? 1 : 0,
        rating1: rating === 1 ? 1 : 0,
        selectCount: 0,
        signature: '',
        description: '',
        openTime: '',
        closeTime: '',
        minPrice: '',
        maxPrice: '',
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      
      await db.collection('shopStats').add({
        data: initData
      })
    }
    
    return await getShopStats(shopKey, currentSchoolId)
  } catch (e) {
    console.error('submitRating error:', e)
    return { success: false, message: e.message }
  }
}

async function updateShopInfo(data, schoolId) {
  const currentSchoolId = schoolId || BISTU_ID
  const { shopKey, signature, description, openTime, closeTime, minPrice, maxPrice, tags } = data
  
  if (!shopKey) {
    return { success: false, message: '店铺标识不能为空' }
  }
  
  try {
    const docId = `${currentSchoolId}_${shopKey}`
    const shopStatsDoc = await db.collection('shopStats').doc(docId).get().catch(() => null)
    
    const updateData = {
      signature: signature || '',
      description: description || '',
      openTime: openTime || '',
      closeTime: closeTime || '',
      minPrice: minPrice || '',
      maxPrice: maxPrice || '',
      tags: tags || [],
      updatedAt: Date.now()
    }
    
    if (shopStatsDoc && shopStatsDoc.data) {
      await db.collection('shopStats').doc(docId).update({
        data: updateData
      })
    } else {
      await db.collection('shopStats').add({
        data: {
          _id: docId,
          schoolId: currentSchoolId,
          shopKey: shopKey,
          totalRatings: 0,
          totalScore: 0,
          rating5: 0,
          rating4: 0,
          rating3: 0,
          rating2: 0,
          rating1: 0,
          selectCount: 0,
          ...updateData,
          createdAt: Date.now()
        }
      })
    }
    
    return { success: true, message: '更新成功' }
  } catch (e) {
    console.error('updateShopInfo error:', e)
    return { success: false, message: e.message }
  }
}

async function getShopList(schoolId) {
  const currentSchoolId = schoolId || BISTU_ID
  
  try {
    const canteenData = await getCanteenData(currentSchoolId)
    
    if (!canteenData.success || !canteenData.data) {
      return { success: false, message: '获取食堂数据失败' }
    }
    
    const shopList = []
    
    for (const canteen of canteenData.data) {
      for (const floor of (canteen.floors || [])) {
        for (const shop of (floor.shops || [])) {
          const shopKey = `${canteen.name}-${floor.name}-${shop}`
          shopList.push({
            shopName: shop,
            canteenName: canteen.name,
            floorName: floor.name,
            shopKey: shopKey
          })
        }
      }
    }
    
    return { success: true, data: shopList }
  } catch (e) {
    console.error('getShopList error:', e)
    return { success: false, message: e.message }
  }
}

async function getAllShopStats(schoolId) {
  const currentSchoolId = schoolId || BISTU_ID
  
  try {
    const shopListRes = await getShopList(currentSchoolId)
    
    if (!shopListRes.success || !shopListRes.data) {
      return { success: false, message: '获取店铺列表失败' }
    }
    
    const shops = shopListRes.data
    const shopKeys = shops.map(s => s.shopKey)
    
    const MAX_LIMIT = 100
    const statsRes = await db.collection('shopStats')
      .where({
        schoolId: currentSchoolId,
        shopKey: _.in(shopKeys)
      })
      .limit(MAX_LIMIT)
      .get()
    
    const statsMap = {}
    if (statsRes.data) {
      for (const stat of statsRes.data) {
        statsMap[stat.shopKey] = {
          avgRating: stat.totalRatings > 0 
            ? Math.round((stat.totalScore / stat.totalRatings) * 10) / 10 
            : 0,
          totalRatings: stat.totalRatings || 0,
          rating5: stat.rating5 || 0,
          rating4: stat.rating4 || 0,
          rating3: stat.rating3 || 0,
          rating2: stat.rating2 || 0,
          rating1: stat.rating1 || 0,
          selectCount: stat.selectCount || 0
        }
      }
    }
    
    const shopsWithStats = shops.map(shop => ({
      ...shop,
      stats: statsMap[shop.shopKey] || {
        avgRating: 0,
        totalRatings: 0,
        rating5: 0,
        rating4: 0,
        rating3: 0,
        rating2: 0,
        rating1: 0,
        selectCount: 0
      }
    }))
    
    return { success: true, data: shopsWithStats }
  } catch (e) {
    console.error('getAllShopStats error:', e)
    return { success: false, message: e.message }
  }
}

async function submitSuggestion(data) {
  const { type, content, contact } = data
  const wxContext = cloud.getWXContext()
  
  if (!content || !content.trim()) {
    return { success: false, message: '建议内容不能为空' }
  }
  
  try {
    await db.collection('suggestions').add({
      data: {
        type: type || '其他',
        content: content.trim(),
        contact: contact ? contact.trim() : '',
        openid: wxContext.OPENID,
        status: 'pending',
        createdAt: Date.now()
      }
    })
    
    return { success: true, message: '提交成功' }
  } catch (e) {
    console.error('submitSuggestion error:', e)
    return { success: false, message: e.message }
  }
}

async function getSuggestions() {
  try {
    const MAX_LIMIT = 100
    const res = await db.collection('suggestions')
      .orderBy('createdAt', 'desc')
      .limit(MAX_LIMIT)
      .get()
    
    return { success: true, data: res.data || [] }
  } catch (e) {
    console.error('getSuggestions error:', e)
    return { success: false, message: e.message }
  }
}
