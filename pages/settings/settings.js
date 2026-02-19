const btManager = require('../../utils/bluetooth')

Component({
  data: {
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
      this.loadBluetoothInfo()
    }
  },

  methods: {
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

    onServiceChange(e) {
      const index = e.detail.value
      const service = this.data.services[index]
      if (service) {
        this.setData({ selectedServiceId: service.uuid })
      }
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
        content: '确定要应用新的特征值设置吗？这将重新配置蓝牙连接。',
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
    },

    formatUuid(uuid) {
      if (!uuid) return ''
      if (uuid.length > 8) {
        return uuid.substring(4, 8).toUpperCase()
      }
      return uuid.toUpperCase()
    }
  }
})
