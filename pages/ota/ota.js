const btManager = require('../../utils/bluetooth')
const ota = require('../../utils/ota')
const themeManager = require('../../utils/theme')

Component({
  data: {
    isConnected: false,
    connectedDevice: null,
    themeGradient: '',
    otaProgress: 0,
    otaStatus: '',
    isUpgrading: false,
    firmwareUrl: '',
    firmwareName: '',
    firmwareSize: 0,
    firmwareSource: '',
    showFirmwareInput: false,
    showTipModal: false
  },

  lifetimes: {
    attached() {
      this.loadTheme()
      this.checkConnection()
      this.initOTACallbacks()
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
        themeGradient: theme.gradient
      })
    },

    checkConnection() {
      const isConnected = btManager.isConnected
      this.setData({
        isConnected,
        connectedDevice: btManager.deviceId ? { name: '已连接设备' } : null
      })
      if (!isConnected) {
        wx.showModal({
          title: '提示',
          content: '请先连接蓝牙设备',
          showCancel: false,
          success: () => {
            wx.navigateBack()
          }
        })
      }
    },

    initOTACallbacks() {
      ota.onProgress((progress) => {
        this.setData({ otaProgress: progress })
      })
      ota.onStatus((status) => {
        this.setData({ otaStatus: status })
      })
    },

    onChooseFile() {
      ota.chooseFile()
        .then((file) => {
          this.setData({
            firmwareName: file.name,
            firmwareSize: file.size,
            firmwareSource: '文件',
            firmwareUrl: ''
          })
          wx.showToast({ title: '文件已选择', icon: 'success' })
        })
        .catch((err) => {
          console.log('选择文件失败:', err)
        })
    },

    onShowFirmwareInput() {
      this.setData({ showFirmwareInput: true })
    },

    onCancelFirmwareInput() {
      this.setData({ showFirmwareInput: false, firmwareUrl: '' })
    },

    onFirmwareUrlInput(e) {
      this.setData({ firmwareUrl: e.detail.value })
    },

    onConfirmFirmwareUrl() {
      const url = this.data.firmwareUrl.trim()
      if (!url) {
        wx.showToast({ title: '请输入固件链接', icon: 'none' })
        return
      }
      ota.setFirmwareUrl(url)
      this.setData({
        firmwareName: '网络固件',
        firmwareSource: '链接',
        showFirmwareInput: false
      })
      wx.showToast({ title: '链接已设置', icon: 'success' })
    },

    onStartOTA() {
      if (!this.data.firmwareSource && !ota.firmwareData) {
        wx.showToast({ title: '请先选择固件', icon: 'none' })
        return
      }

      wx.showModal({
        title: '确认升级',
        content: '确定要开始OTA升级吗？升级过程中请勿断开蓝牙连接。',
        success: (res) => {
          if (res.confirm) {
            this.doOTA()
          }
        }
      })
    },

    doOTA() {
      this.setData({ isUpgrading: true, otaProgress: 0, otaStatus: '准备升级...' })
      
      ota.startUpgrade()
        .then(() => {
          this.setData({ isUpgrading: false })
          wx.showModal({
            title: '升级成功',
            content: 'OTA升级已完成！',
            showCancel: false
          })
        })
        .catch((err) => {
          this.setData({ isUpgrading: false })
          wx.showModal({
            title: '升级失败',
            content: err.message || 'OTA升级失败，请重试',
            showCancel: false
          })
        })
    },

    onCancelOTA() {
      ota.cancel()
      this.setData({ isUpgrading: false, otaStatus: '已取消' })
    },

    onShowTip() {
      this.setData({ showTipModal: true })
    },

    onCloseTipModal() {
      this.setData({ showTipModal: false })
    },

    onGoToSettings() {
      wx.navigateTo({
        url: '/pages/ota-settings/ota-settings'
      })
    }
  }
})
