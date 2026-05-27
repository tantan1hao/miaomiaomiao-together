const API_BASE_STORAGE_KEY = 'dishApiBaseUrl'
const TOKEN_STORAGE_KEY = 'dishUserToken'
const DEFAULT_API_BASE_URL = 'https://tantanzhang.cn/dish-api'

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '')
}

function getApiBaseUrl() {
  let appBaseUrl = ''

  try {
    const app = getApp()
    appBaseUrl = app && app.globalData ? app.globalData.apiBaseUrl : ''
  } catch (e) {
    appBaseUrl = ''
  }

  const storedBaseUrl = wx.getStorageSync(API_BASE_STORAGE_KEY)
  return trimTrailingSlash(storedBaseUrl || appBaseUrl || DEFAULT_API_BASE_URL)
}

function setApiBaseUrl(baseUrl) {
  const normalized = trimTrailingSlash(baseUrl)
  wx.setStorageSync(API_BASE_STORAGE_KEY, normalized)
  return normalized
}

function buildHeaders(headers = {}, token = '') {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers
  }
}

function buildAuthHeaders(token = '') {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function cleanPayload(payload = {}) {
  return Object.keys(payload).reduce((result, key) => {
    const value = payload[key]
    if (value !== undefined && value !== null && value !== '') {
      result[key] = value
    }
    return result
  }, {})
}

function queryString(params = {}) {
  const parts = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

function unwrap(body) {
  return body && body.data !== undefined ? body.data : body
}

function request(path, options = {}) {
  const {
    method = 'GET',
    data,
    headers,
    token,
    rejectOnBusinessError = true
  } = options

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${getApiBaseUrl()}${path}`,
      method,
      data,
      header: buildHeaders(headers, token),
      success(res) {
        const body = res.data || {}
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(body.message || `请求失败：${res.statusCode}`))
          return
        }
        if (rejectOnBusinessError && body.success === false) {
          reject(new Error(body.message || '请求失败'))
          return
        }
        resolve(body)
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络请求失败'))
      }
    })
  })
}

async function callFunction(data) {
  const result = await request('/miniprogram/call', {
    method: 'POST',
    data,
    rejectOnBusinessError: false
  })

  return { result }
}

async function categories(schoolId) {
  const body = await request(`/categories${queryString({ schoolId })}`)
  return unwrap(body)
}

async function rankings(schoolId, limit = 50) {
  const body = await request(`/rankings${queryString({ schoolId, limit })}`)
  return unwrap(body)
}

async function announcement(schoolId) {
  const body = await request(`/announcements${queryString({ schoolId })}`)
  return unwrap(body)
}

async function canteenData(schoolId = 'bistu') {
  const body = await request('/miniprogram/call', {
    method: 'POST',
    data: { action: 'getCanteenData', schoolId }
  })
  return unwrap(body)
}

async function adminLogin(password) {
  const body = await request('/admin/login', {
    method: 'POST',
    data: { password }
  })
  return unwrap(body)
}

async function dishes(schoolId, includeOffline = false) {
  const body = await request(`/dishes${queryString({
    schoolId,
    includeOffline: includeOffline ? '1' : '0',
    limit: 200
  })}`)
  return unwrap(body)
}

async function updateDish(token, dishId, patch) {
  const body = await request(`/dishes/${dishId}`, {
    method: 'PUT',
    token,
    data: patch
  })
  return unwrap(body)
}

async function setAnnouncement(token, schoolId, content) {
  const body = await request('/announcements', {
    method: 'PUT',
    token,
    data: { schoolId, content }
  })
  return unwrap(body)
}

async function createCategory(token, schoolId, name) {
  const body = await request('/categories', {
    method: 'POST',
    token,
    data: { schoolId, name }
  })
  return unwrap(body)
}

async function rateDish(token, dishId, score) {
  const body = await request('/ratings', {
    method: 'POST',
    token,
    data: { dishId, score }
  })
  return unwrap(body)
}

function uploadDish(token, payload, imagePath = '') {
  const formData = cleanPayload(payload)

  if (!imagePath) {
    return request('/dishes', {
      method: 'POST',
      token,
      data: formData
    }).then(unwrap)
  }

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${getApiBaseUrl()}/dishes`,
      filePath: imagePath,
      name: 'image',
      formData,
      header: buildAuthHeaders(token),
      success(res) {
        let body = {}
        try {
          body = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
        } catch (e) {
          reject(new Error('上传响应解析失败'))
          return
        }

        if (res.statusCode < 200 || res.statusCode >= 300 || body.success === false) {
          reject(new Error(body.message || `上传失败：${res.statusCode}`))
          return
        }
        resolve(unwrap(body))
      },
      fail(err) {
        reject(new Error(err.errMsg || '上传失败'))
      }
    })
  })
}

function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        if (res.code) {
          resolve(res.code)
        } else {
          reject(new Error('微信登录失败'))
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '微信登录失败'))
      }
    })
  })
}

async function login(profile = {}) {
  const code = await wxLogin()
  const body = await request('/auth/wechat', {
    method: 'POST',
    data: {
      code,
      nickname: profile.nickname || '',
      avatarUrl: profile.avatarUrl || ''
    }
  })
  const token = body.data && body.data.token
  if (token) {
    wx.setStorageSync(TOKEN_STORAGE_KEY, token)
  }
  return body.data
}

async function getUserToken() {
  const cached = wx.getStorageSync(TOKEN_STORAGE_KEY)
  if (cached) return cached

  const data = await login()
  return data.token
}

module.exports = {
  API_BASE_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  getApiBaseUrl,
  setApiBaseUrl,
  request,
  callFunction,
  categories,
  rankings,
  announcement,
  canteenData,
  adminLogin,
  dishes,
  updateDish,
  setAnnouncement,
  createCategory,
  rateDish,
  uploadDish,
  login,
  getUserToken
}
