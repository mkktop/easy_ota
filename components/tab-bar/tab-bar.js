const btManager = require('../../utils/bluetooth')

Component({
  properties: {
    current: {
      type: String,
      value: 'bluetooth'
    }
  },

  data: {
    isConnected: false
  },

  lifetimes: {
    attached() {
      this.checkConnection()
    }
  },

  pageLifetimes: {
    show() {
      this.checkConnection()
    }
  },

  methods: {
    checkConnection() {
      this.setData({
        isConnected: btManager.isConnected
      })
    },

    onBluetoothTap() {
      if (this.properties.current !== 'bluetooth') {
        wx.redirectTo({ url: '/pages/bluetooth/bluetooth' })
      }
    },

    onFeatureTap() {
      if (this.properties.current !== 'feature') {
        wx.redirectTo({ url: '/pages/home/home' })
      }
    }
  }
})
