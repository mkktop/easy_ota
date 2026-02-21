const btManager = require('../../utils/bluetooth')
const themeManager = require('../../utils/theme')

Component({
  data: {
    themeGradient: '',
    isBluetoothAvailable: false,
    isScanning: false,
    isConnected: false,
    connectedDevice: null,
    deviceList: [],
    showDeviceList: false,
    showTipModal: false
  },

  lifetimes: {
    attached() {
      this.loadTheme()
      this.initBluetooth()
    }
  },

  pageLifetimes: {
    show() {
      this.loadTheme()
      this.checkConnection()
      this.initBluetooth()
    }
  },

  methods: {
    loadTheme() {
      const theme = themeManager.getTheme()
      this.setData({
        themeGradient: theme.gradient
      })
    },

    initBluetooth() {
      btManager.init()
        .then(() => {
          this.setData({ isBluetoothAvailable: true })
        })
        .catch((err) => {
          console.error('蓝牙初始化失败', err)
          this.setData({ isBluetoothAvailable: false })
        })
    },

    checkConnection() {
      const isConnected = btManager.isConnected
      if (isConnected) {
        wx.redirectTo({
          url: '/pages/home/home'
        })
      }
    },

    onConnectBluetooth() {
      this.setData({ isScanning: true, showDeviceList: true, deviceList: [] })
      
      btManager.startSearch((devices) => {
        devices.forEach((device) => {
          const existDevice = this.data.deviceList.find(d => d.deviceId === device.deviceId)
          if (!existDevice) {
            this.data.deviceList.push(device)
          }
        })
        this.setData({ deviceList: this.data.deviceList })
      }).catch((err) => {
        console.error('搜索失败', err)
        wx.showToast({ title: '搜索失败', icon: 'none' })
        this.setData({ isScanning: false })
      })
    },

    onStopScan() {
      btManager.stopSearch()
      this.setData({ isScanning: false })
    },

    onCloseDeviceList() {
      btManager.stopSearch()
      this.setData({ 
        showDeviceList: false, 
        isScanning: false 
      })
    },

    onSelectDevice(e) {
      const device = e.currentTarget.dataset.device
      btManager.stopSearch()
      this.setData({ 
        isScanning: false, 
        showDeviceList: false
      })

      wx.showLoading({ title: '正在连接...' })

      btManager.connect(device.deviceId)
        .then(() => {
          wx.hideLoading()
          this.setData({ 
            isConnected: true, 
            connectedDevice: device
          })
          wx.showToast({ title: '连接成功', icon: 'success' })
          return btManager.getAllServicesAndCharacteristics()
        })
        .then(() => {
          setTimeout(() => {
            wx.redirectTo({
              url: '/pages/home/home'
            })
          }, 500)
        })
        .catch((err) => {
          wx.hideLoading()
          console.error('连接失败', err)
          wx.showToast({ title: '连接失败', icon: 'error' })
        })
    },

    onShowTip() {
      this.setData({ showTipModal: true })
    },

    onCloseTipModal() {
      this.setData({ showTipModal: false })
    }
  }
})
