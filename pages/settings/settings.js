const btManager = require('../../utils/bluetooth')
const ota = require('../../utils/ota')

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
    loading: false,
    chunkSize: 256,
    chunkDelay: 150,
    defaultChunkSize: 256,
    defaultChunkDelay: 150,
    maxChunkSize: 4096,
    maxChunkDelay: 10000
  },

  lifetimes: {
    attached() {
      this.loadBluetoothInfo()
      this.loadOtaSettings()
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

    loadOtaSettings() {
      const settings = ota.getOtaSettings()
      this.setData({
        chunkSize: settings.chunkSize,
        chunkDelay: settings.chunkDelay,
        defaultChunkSize: settings.defaultChunkSize,
        defaultChunkDelay: settings.defaultChunkDelay,
        maxChunkSize: settings.maxChunkSize,
        maxChunkDelay: settings.maxChunkDelay
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

    onSaveOtaSettings() {
      const { chunkSize, chunkDelay, maxChunkSize, maxChunkDelay } = this.data
      
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
      wx.showToast({ title: 'OTA设置已保存', icon: 'success' })
    },

    onResetOtaSettings() {
      ota.resetToDefaults()
      this.setData({
        chunkSize: this.data.defaultChunkSize,
        chunkDelay: this.data.defaultChunkDelay
      })
      wx.showToast({ title: '已重置为默认值', icon: 'success' })
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
