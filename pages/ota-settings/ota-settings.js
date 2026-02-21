const ota = require('../../utils/ota')
const themeManager = require('../../utils/theme')

Component({
  data: {
    themeGradient: '',
    chunkSize: 256,
    chunkDelay: 100,
    defaultChunkSize: 256,
    defaultChunkDelay: 100,
    maxChunkSize: 4096,
    maxChunkDelay: 10000,
    handshakeEnabled: true,
    defaultHandshakeEnabled: true
  },

  lifetimes: {
    attached() {
      this.loadTheme()
      this.loadOtaSettings()
    }
  },

  pageLifetimes: {
    show() {
      this.loadTheme()
      this.loadOtaSettings()
    }
  },

  methods: {
    loadTheme() {
      const theme = themeManager.getTheme()
      this.setData({
        themeGradient: theme.gradient
      })
    },

    loadOtaSettings() {
      const settings = ota.getOtaSettings()
      this.setData({
        chunkSize: settings.chunkSize,
        chunkDelay: settings.chunkDelay,
        defaultChunkSize: settings.defaultChunkSize,
        defaultChunkDelay: settings.defaultChunkDelay,
        maxChunkSize: settings.maxChunkSize,
        maxChunkDelay: settings.maxChunkDelay,
        handshakeEnabled: settings.handshakeEnabled,
        defaultHandshakeEnabled: settings.defaultHandshakeEnabled
      })
    },

    onChunkSizeInput(e) {
      let value = parseInt(e.detail.value) || 0
      if (value > this.data.maxChunkSize) value = this.data.maxChunkSize
      if (value < 1) value = 1
      this.setData({ chunkSize: value })
    },

    onChunkDelayInput(e) {
      let value = parseInt(e.detail.value) || 0
      if (value > this.data.maxChunkDelay) value = this.data.maxChunkDelay
      if (value < 0) value = 0
      this.setData({ chunkDelay: value })
    },

    onHandshakeChange(e) {
      this.setData({ handshakeEnabled: e.detail.value })
    },

    onSaveOtaSettings() {
      const { chunkSize, chunkDelay, maxChunkSize, maxChunkDelay, handshakeEnabled } = this.data
      
      if (chunkSize < 1 || chunkSize > maxChunkSize) {
        wx.showToast({ title: '分包大小范围: 1-' + maxChunkSize, icon: 'none' })
        return
      }
      
      if (chunkDelay < 0 || chunkDelay > maxChunkDelay) {
        wx.showToast({ title: '包间隔范围: 0-' + maxChunkDelay + 'ms', icon: 'none' })
        return
      }
      
      ota.setChunkSize(chunkSize)
      ota.setChunkDelay(chunkDelay)
      ota.setHandshakeEnabled(handshakeEnabled)
      wx.showToast({ title: '设置已保存', icon: 'success' })
    },

    onResetOtaSettings() {
      ota.resetToDefaults()
      const settings = ota.getOtaSettings()
      this.setData({
        chunkSize: settings.defaultChunkSize,
        chunkDelay: settings.defaultChunkDelay,
        handshakeEnabled: settings.defaultHandshakeEnabled
      })
      wx.showToast({ title: '已重置为默认值', icon: 'success' })
    }
  }
})
