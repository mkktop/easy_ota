const btManager = require('../../utils/bluetooth')
const themeManager = require('../../utils/theme')

Component({
  data: {
    themeGradient: '',
    themes: [],
    currentThemeId: '',
    services: [],
    characteristics: [],
    writeCharacteristics: [],
    notifyCharacteristics: [],
    selectedServiceId: '',
    selectedWriteCharId: '',
    selectedNotifyCharId: '',
    currentServiceId: '',
    currentWriteCharId: '',
    currentNotifyCharId: '',
    isConnected: false,
    loading: false
  },

  lifetimes: {
    attached() {
      this.loadThemes()
      this.loadBluetoothInfo()
    }
  },

  pageLifetimes: {
    show() {
      this.loadThemes()
      this.loadBluetoothInfo()
    }
  },

  methods: {
    loadThemes() {
      const themes = themeManager.getAllThemes()
      const currentTheme = themeManager.getTheme()
      this.setData({
        themes,
        currentThemeId: currentTheme.id,
        themeGradient: currentTheme.gradient
      })
    },

    loadBluetoothInfo() {
      const isConnected = btManager.isConnected
      this.setData({
        isConnected,
        currentServiceId: btManager.serviceId || '',
        currentWriteCharId: btManager.writeCharacteristicId || '',
        currentNotifyCharId: btManager.notifyCharacteristicId || ''
      })

      if (isConnected && btManager.allServices.length > 0) {
        this.setData({
          services: btManager.allServices,
          characteristics: btManager.allCharacteristics
        })
        this.filterCharacteristics()
      } else if (isConnected) {
        this.refreshServices()
      }
    },

    onThemeChange(e) {
      const themeId = e.currentTarget.dataset.id
      themeManager.setTheme(themeId)
      const theme = themeManager.getTheme()
      this.setData({
        currentThemeId: themeId,
        themeGradient: theme.gradient
      })
      wx.showToast({ title: '主题已更换', icon: 'success' })
    },

    refreshServices() {
      if (!btManager.isConnected) {
        wx.showToast({ title: '请先连接蓝牙', icon: 'none' })
        return
      }

      this.setData({ loading: true })
      btManager.getAllServicesAndCharacteristics()
        .then((result) => {
          this.setData({
            services: result.services,
            characteristics: result.characteristics,
            loading: false
          })
          this.filterCharacteristics()
          wx.showToast({ title: '刷新成功', icon: 'success' })
        })
        .catch((err) => {
          console.error('获取服务失败', err)
          this.setData({ loading: false })
          wx.showToast({ title: '获取服务失败', icon: 'none' })
        })
    },

    filterCharacteristics() {
      const writeChars = this.data.characteristics.filter(c => 
        c.properties.write || c.properties.writeNoResponse
      )
      const notifyChars = this.data.characteristics.filter(c => 
        c.properties.notify || c.properties.indicate
      )
      
      this.setData({
        writeCharacteristics: writeChars,
        notifyCharacteristics: notifyChars
      })
    },

    onWriteCharChange(e) {
      const index = e.detail.value
      const char = this.data.writeCharacteristics[index]
      if (char) {
        this.setData({ 
          selectedWriteCharId: char.uuid,
          selectedServiceId: char.serviceUuid
        })
      }
    },

    onNotifyCharChange(e) {
      const index = e.detail.value
      const char = this.data.notifyCharacteristics[index]
      if (char) {
        this.setData({ selectedNotifyCharId: char.uuid })
      }
    },

    onSaveSettings() {
      const { selectedServiceId, selectedWriteCharId, selectedNotifyCharId } = this.data

      if (!selectedWriteCharId) {
        wx.showToast({ title: '请选择写入特征值', icon: 'none' })
        return
      }

      if (!selectedServiceId) {
        wx.showToast({ title: '请选择服务', icon: 'none' })
        return
      }

      wx.showModal({
        title: '确认保存',
        content: '确定要应用新的特征值设置吗？',
        success: (res) => {
          if (res.confirm) {
            this.applySettings()
          }
        }
      })
    },

    applySettings() {
      const { selectedServiceId, selectedWriteCharId, selectedNotifyCharId } = this.data

      this.setData({ loading: true })

      btManager.setCustomCharacteristics(selectedServiceId, selectedWriteCharId, selectedNotifyCharId)
        .then(() => {
          this.setData({
            currentServiceId: selectedServiceId,
            currentWriteCharId: selectedWriteCharId,
            currentNotifyCharId: selectedNotifyCharId,
            loading: false
          })
          wx.showToast({ title: '设置已保存', icon: 'success' })
        })
        .catch((err) => {
          console.error('设置特征值失败', err)
          this.setData({ loading: false })
          wx.showToast({ title: '设置失败', icon: 'none' })
        })
    },

    onRefresh() {
      this.refreshServices()
    }
  }
})
