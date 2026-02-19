const btManager = require('../../utils/bluetooth')
const ota = require('../../utils/ota')

Component({
  data: {
    isBluetoothAvailable: false,
    isScanning: false,
    isConnected: false,
    connectedDevice: null,
    deviceList: [],
    showDeviceList: false,
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
      this.initBluetooth()
      this.initOTACallbacks()
    },
    detached() {
      btManager.disconnect()
      btManager.closeAdapter()
    }
  },

  methods: {
    initBluetooth() {
      btManager.init()
        .then(() => {
          this.setData({ isBluetoothAvailable: true })
          wx.showToast({ title: '蓝牙已就绪', icon: 'success' })
        })
        .catch((err) => {
          console.error('蓝牙初始化失败', err)
          wx.showModal({
            title: '提示',
            content: '请开启蓝牙后重试',
            showCancel: false
          })
        })
    },

    initOTACallbacks() {
      ota.onProgress((progress) => {
        this.setData({ otaProgress: progress })
      })
      ota.onStatus((status) => {
        this.setData({ otaStatus: status })
      })
    },

    onConnectBluetooth() {
      if (!this.data.isBluetoothAvailable) {
        this.initBluetooth()
        return
      }

      this.setData({ isScanning: true, deviceList: [], showDeviceList: true })

      btManager.startSearch((devices) => {
        const newDevices = devices.filter(d => d.name && d.name !== '')
        const existingIds = this.data.deviceList.map(d => d.deviceId)
        const uniqueNewDevices = newDevices.filter(d => !existingIds.includes(d.deviceId))
        
        if (uniqueNewDevices.length > 0) {
          this.setData({
            deviceList: [...this.data.deviceList, ...uniqueNewDevices]
          })
        }
      }).catch((err) => {
        wx.showToast({ title: '搜索失败', icon: 'error' })
        this.setData({ isScanning: false })
      })
    },

    onStopScan() {
      btManager.stopSearch()
      this.setData({ isScanning: false })
    },

    onCloseDeviceList() {
      btManager.stopSearch()
      this.setData({ showDeviceList: false, isScanning: false })
    },

    onSelectDevice(e) {
      const device = e.currentTarget.dataset.device
      btManager.stopSearch()
      this.setData({ 
        isScanning: false, 
        showDeviceList: false,
        otaStatus: '正在连接...'
      })

      btManager.connect(device.deviceId)
        .then(() => {
          this.setData({ 
            isConnected: true, 
            connectedDevice: device,
            otaStatus: '已连接: ' + device.name
          })
          wx.showToast({ title: '连接成功', icon: 'success' })
          return btManager.getAllServicesAndCharacteristics()
        })
        .then((result) => {
          console.log('获取所有服务和特征值成功', result)
        })
        .catch((err) => {
          console.error('连接或获取服务失败', err)
          if (!this.data.isConnected) {
            wx.showToast({ title: '连接失败', icon: 'error' })
            this.setData({ otaStatus: '连接失败' })
          }
        })
    },

    onDisconnect() {
      btManager.disconnect()
      this.setData({ 
        isConnected: false, 
        connectedDevice: null,
        otaStatus: '',
        otaProgress: 0,
        isUpgrading: false
      })
      wx.showToast({ title: '已断开连接', icon: 'none' })
    },

    onGoToSettings() {
      wx.navigateTo({
        url: '/pages/settings/settings'
      })
    },

    onShowTip() {
      this.setData({ showTipModal: true })
    },

    onCloseTipModal() {
      this.setData({ showTipModal: false })
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
          if (err.message !== '选择文件取消') {
            wx.showToast({ title: err.message, icon: 'none' })
          }
        })
    },

    onShowFirmwareInput() {
      this.setData({ showFirmwareInput: true })
    },

    onFirmwareUrlInput(e) {
      this.setData({ firmwareUrl: e.detail.value })
    },

    onConfirmFirmwareUrl() {
      if (!this.data.firmwareUrl) {
        wx.showToast({ title: '请输入固件URL', icon: 'none' })
        return
      }
      ota.setFirmwareUrl(this.data.firmwareUrl)
      this.setData({ 
        showFirmwareInput: false,
        firmwareName: '网络下载',
        firmwareSource: 'URL'
      })
      wx.showToast({ title: '固件URL已设置', icon: 'success' })
    },

    onCancelFirmwareInput() {
      this.setData({ showFirmwareInput: false })
    },

    onStartOTA() {
      if (!this.data.isConnected) {
        wx.showToast({ title: '请先连接蓝牙', icon: 'none' })
        return
      }

      if (!this.data.firmwareSource) {
        wx.showActionSheet({
          itemList: ['从聊天记录选择文件', '输入下载链接'],
          success: (res) => {
            if (res.tapIndex === 0) {
              this.onChooseFile()
            } else {
              this.setData({ showFirmwareInput: true })
            }
          }
        })
        return
      }

      wx.showModal({
        title: '确认升级',
        content: `确定要开始OTA升级吗？\n固件: ${this.data.firmwareName || '未知'}\n大小: ${this.data.firmwareSize || '?'} 字节`,
        success: (res) => {
          if (res.confirm) {
            this.doOTA()
          }
        }
      })
    },

    doOTA() {
      this.setData({ isUpgrading: true, otaProgress: 0 })
      
      ota.startUpgrade()
        .then(() => {
          wx.showModal({
            title: '升级完成',
            content: 'OTA升级已成功完成！',
            showCancel: false
          })
          this.setData({ isUpgrading: false })
        })
        .catch((err) => {
          wx.showModal({
            title: '升级失败',
            content: err.message || 'OTA升级失败',
            showCancel: false
          })
          this.setData({ isUpgrading: false })
        })
    },

    onCancelOTA() {
      ota.cancel()
      this.setData({ isUpgrading: false, otaProgress: 0 })
    }
  }
})
