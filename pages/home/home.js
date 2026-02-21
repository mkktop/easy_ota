const btManager = require('../../utils/bluetooth')
const themeManager = require('../../utils/theme')

Component({
  data: {
    isConnected: false,
    connectedDevice: null,
    themeGradient: '',
    themePrimary: '',
    themeSecondary: '',
    menuItems: [
      {
        id: 'ota',
        icon: '📦',
        title: 'OTA升级',
        desc: '固件空中升级',
        url: '/pages/ota/ota'
      },
      {
        id: 'wifi',
        icon: '📶',
        title: 'WIFI配置',
        desc: '配置设备WiFi',
        url: '/pages/wifi/wifi'
      },
      {
        id: 'time',
        icon: '🕐',
        title: '蓝牙授时',
        desc: '同步设备时间',
        url: '/pages/time/time'
      },
      {
        id: 'settings',
        icon: '⚙️',
        title: '全局设置',
        desc: '主题与蓝牙设置',
        url: '/pages/settings/settings'
      }
    ]
  },

  lifetimes: {
    attached() {
      this.loadTheme()
      this.checkConnection()
    }
  },

  pageLifetimes: {
    show() {
      this.loadTheme()
      this.checkConnection()
    }
  },

  methods: {
    loadTheme() {
      const theme = themeManager.getTheme()
      this.setData({
        themeGradient: theme.gradient,
        themePrimary: theme.primary,
        themeSecondary: theme.secondary
      })
    },

    checkConnection() {
      const isConnected = btManager.isConnected
      this.setData({
        isConnected,
        connectedDevice: btManager.deviceId ? { name: '已连接设备' } : null
      })
    },

    onMenuItemTap(e) {
      const item = e.currentTarget.dataset.item
      
      if (item.id === 'wifi' || item.id === 'time') {
        wx.showModal({
          title: '敬请期待',
          content: '该功能正在开发中，敬请期待！',
          showCancel: false,
          confirmText: '知道了'
        })
        return
      }
      
      wx.navigateTo({
        url: item.url
      })
    },

    onDisconnect() {
      wx.showModal({
        title: '断开连接',
        content: '确定要断开当前蓝牙连接吗？',
        success: (res) => {
          if (res.confirm) {
            btManager.disconnect()
            this.setData({
              isConnected: false,
              connectedDevice: null
            })
            wx.showToast({ title: '已断开连接', icon: 'success' })
            setTimeout(() => {
              wx.redirectTo({
                url: '/pages/index/index'
              })
            }, 500)
          }
        }
      })
    }
  }
})
