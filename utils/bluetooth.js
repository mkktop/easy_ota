const BluetoothManager = {
  deviceId: null,
  serviceId: null,
  writeCharacteristicId: null,
  notifyCharacteristicId: null,
  isConnected: false,
  onReceiveCallback: null,
  mtu: 20,
  writeWithResponse: false,
  allServices: [],
  allCharacteristics: [],
  adapterReady: false,

  init() {
    return new Promise((resolve, reject) => {
      if (this.adapterReady) {
        resolve()
        return
      }
      wx.openBluetoothAdapter({
        success: () => {
          console.log('蓝牙初始化成功')
          this.adapterReady = true
          resolve()
        },
        fail: (err) => {
          console.error('蓝牙初始化失败', err)
          if (err.errCode === 10001) {
            this.adapterReady = false
          }
          reject(err)
        }
      })
    })
  },

  startSearch(onDeviceFound) {
    return new Promise((resolve, reject) => {
      wx.startBluetoothDevicesDiscovery({
        allowDuplicatesKey: false,
        success: () => {
          wx.onBluetoothDeviceFound((res) => {
            const devices = res.devices.map(device => ({
              deviceId: device.deviceId,
              name: device.name || '未知设备',
              RSSI: device.RSSI,
              advertisData: device.advertisData
            }))
            onDeviceFound(devices)
          })
          resolve()
        },
        fail: (err) => {
          console.error('搜索蓝牙设备失败', err)
          reject(err)
        }
      })
    })
  },

  stopSearch() {
    wx.stopBluetoothDevicesDiscovery({
      success: () => {
        console.log('停止搜索蓝牙设备')
      }
    })
  },

  connect(deviceId) {
    return new Promise((resolve, reject) => {
      wx.createBLEConnection({
        deviceId: deviceId,
        timeout: 10000,
        success: () => {
          this.deviceId = deviceId
          console.log('蓝牙连接成功')
          this.setMTU().then(() => {
            return this.getServices()
          }).then(resolve).catch(reject)
        },
        fail: (err) => {
          console.error('蓝牙连接失败', err)
          reject(err)
        }
      })
    })
  },

  setMTU() {
    return new Promise((resolve) => {
      wx.setBLEMTU({
        deviceId: this.deviceId,
        mtu: 512,
        success: (res) => {
          this.mtu = res.mtu || 512
          console.log('MTU设置成功:', this.mtu)
          resolve()
        },
        fail: (err) => {
          console.log('MTU设置失败，使用默认值20')
          this.mtu = 20
          resolve()
        }
      })
    })
  },

  getServices() {
    return new Promise((resolve, reject) => {
      wx.getBLEDeviceServices({
        deviceId: this.deviceId,
        success: (res) => {
          console.log('获取服务列表成功:', res.services)
          this.allServices = res.services.map(s => ({
            uuid: s.uuid,
            isPrimary: s.isPrimary
          }))
          
          let ffe1Service = null
          let ffe2Service = null
          
          for (let i = 0; i < res.services.length; i++) {
            const service = res.services[i]
            const uuid = service.uuid.toUpperCase()
            console.log('服务UUID:', service.uuid)
            
            if (uuid.indexOf('FFE1') !== -1) {
              ffe1Service = service
              console.log('找到FFE1服务')
            }
            if (uuid.indexOf('FFE2') !== -1) {
              ffe2Service = service
              console.log('找到FFE2服务')
            }
          }
          
          const targetService = ffe1Service || ffe2Service
          
          if (targetService) {
            this.serviceId = targetService.uuid
            console.log('使用透传服务UUID:', this.serviceId)
            this.getCharacteristics().then(resolve).catch(reject)
          } else {
            console.log('未找到FFE1/FFE2服务，尝试使用第一个服务')
            if (res.services.length > 0) {
              this.serviceId = res.services[0].uuid
              this.getCharacteristics().then(resolve).catch(reject)
            } else {
              reject(new Error('未找到蓝牙服务'))
            }
          }
        },
        fail: (err) => {
          console.error('获取服务列表失败', err)
          reject(err)
        }
      })
    })
  },

  getAllServicesAndCharacteristics() {
    return new Promise((resolve, reject) => {
      wx.getBLEDeviceServices({
        deviceId: this.deviceId,
        success: async (res) => {
          console.log('获取所有服务列表成功:', res.services)
          this.allServices = res.services.map(s => ({
            uuid: s.uuid,
            isPrimary: s.isPrimary
          }))
          
          this.allCharacteristics = []
          
          for (let i = 0; i < res.services.length; i++) {
            const service = res.services[i]
            try {
              const charRes = await new Promise((res2, rej2) => {
                wx.getBLEDeviceCharacteristics({
                  deviceId: this.deviceId,
                  serviceId: service.uuid,
                  success: res2,
                  fail: rej2
                })
              })
              
              const chars = charRes.characteristics.map(c => ({
                uuid: c.uuid,
                serviceUuid: service.uuid,
                properties: {
                  read: c.properties.read || false,
                  write: c.properties.write || false,
                  writeNoResponse: c.properties.writeNoResponse || false,
                  notify: c.properties.notify || false,
                  indicate: c.properties.indicate || false
                }
              }))
              
              this.allCharacteristics.push(...chars)
              console.log('服务', service.uuid, '的特征值:', chars)
            } catch (err) {
              console.error('获取服务特征值失败:', service.uuid, err)
            }
          }
          
          resolve({
            services: this.allServices,
            characteristics: this.allCharacteristics
          })
        },
        fail: (err) => {
          console.error('获取服务列表失败', err)
          reject(err)
        }
      })
    })
  },

  setCustomCharacteristics(serviceId, writeCharId, notifyCharId) {
    return new Promise((resolve, reject) => {
      this.serviceId = serviceId
      this.writeCharacteristicId = writeCharId
      this.notifyCharacteristicId = notifyCharId
      
      const writeChar = this.allCharacteristics.find(c => c.uuid === writeCharId)
      if (writeChar) {
        this.writeWithResponse = writeChar.properties.write || false
      }
      
      console.log('设置自定义特征值:')
      console.log('服务UUID:', this.serviceId)
      console.log('写入特征值:', this.writeCharacteristicId)
      console.log('通知特征值:', this.notifyCharacteristicId)
      
      if (this.notifyCharacteristicId) {
        this.enableNotify().then(resolve).catch(reject)
      } else {
        resolve()
      }
    })
  },

  getCharacteristics() {
    return new Promise((resolve, reject) => {
      wx.getBLEDeviceCharacteristics({
        deviceId: this.deviceId,
        serviceId: this.serviceId,
        success: (res) => {
          console.log('获取特征值成功:', res.characteristics)
          const characteristics = res.characteristics
          
          let writeChar = null
          let notifyChar = null
          let fallbackWriteChar = null
          let fallbackNotifyChar = null
          
          for (let i = 0; i < characteristics.length; i++) {
            const item = characteristics[i]
            const uuid = item.uuid.toUpperCase()
            console.log('特征值:', item.uuid, '属性:', JSON.stringify(item.properties))
            
            const isFFE3 = uuid.indexOf('FFE3') !== -1
            
            if (item.properties.write || item.properties.writeNoResponse) {
              if (isFFE3) {
                fallbackWriteChar = item
                console.log('备用写入特征值(FFE3):', item.uuid)
              } else {
                writeChar = item
                console.log('写入特征值:', item.uuid)
              }
            }
            
            if (item.properties.notify || item.properties.indicate) {
              if (isFFE3) {
                fallbackNotifyChar = item
                console.log('备用通知特征值(FFE3):', item.uuid)
              } else {
                notifyChar = item
                console.log('通知特征值:', item.uuid)
              }
            }
          }
          
          const finalWriteChar = writeChar || fallbackWriteChar
          const finalNotifyChar = notifyChar || fallbackNotifyChar
          
          if (finalWriteChar) {
            this.writeCharacteristicId = finalWriteChar.uuid
            this.writeWithResponse = finalWriteChar.properties.write || false
            console.log('写入特征值:', this.writeCharacteristicId, '需要响应:', this.writeWithResponse)
          }
          
          if (finalNotifyChar) {
            this.notifyCharacteristicId = finalNotifyChar.uuid
            console.log('通知特征值:', this.notifyCharacteristicId)
          }
          
          console.log('最终写入特征值:', this.writeCharacteristicId)
          console.log('最终通知特征值:', this.notifyCharacteristicId)
          
          if (this.notifyCharacteristicId) {
            this.enableNotify().then(resolve).catch(reject)
          } else {
            this.isConnected = true
            resolve()
          }
        },
        fail: (err) => {
          console.error('获取特征值失败', err)
          reject(err)
        }
      })
    })
  },

  enableNotify() {
    return new Promise((resolve, reject) => {
      wx.notifyBLECharacteristicValueChange({
        deviceId: this.deviceId,
        serviceId: this.serviceId,
        characteristicId: this.notifyCharacteristicId,
        state: true,
        success: () => {
          console.log('启用通知成功, 特征值:', this.notifyCharacteristicId)
          wx.onBLECharacteristicValueChange((res) => {
            const data = this.ab2hex(res.value)
            console.log('收到数据:', data, '长度:', res.value.byteLength, '特征值:', res.characteristicId)
            if (this.onReceiveCallback) {
              this.onReceiveCallback(data)
            }
          })
          this.isConnected = true
          resolve()
        },
        fail: (err) => {
          console.error('启用通知失败', err)
          this.isConnected = true
          resolve()
        }
      })
    })
  },

  write(data) {
    return new Promise((resolve, reject) => {
      if (!this.deviceId || !this.serviceId || !this.writeCharacteristicId) {
        reject(new Error('蓝牙未连接或特征值未找到'))
        return
      }
      
      const buffer = this.hex2ab(data)
      const dataLen = buffer.byteLength
      const maxChunk = Math.min(this.mtu - 3, 20)
      
      console.log('准备发送数据:', data)
      console.log('数据长度:', dataLen, '字节, MTU:', this.mtu, '分包大小:', maxChunk)
      console.log('服务UUID:', this.serviceId)
      console.log('写入特征值:', this.writeCharacteristicId)
      
      if (dataLen <= maxChunk) {
        this.writeChunk(buffer, resolve, reject)
      } else {
        this.writeInChunks(buffer, maxChunk, resolve, reject)
      }
    })
  },

  writeChunk(buffer, resolve, reject) {
    const writeType = this.writeWithResponse ? 'write' : 'writeNoResponse'
    console.log('写入类型:', writeType)
    
    wx.writeBLECharacteristicValue({
      deviceId: this.deviceId,
      serviceId: this.serviceId,
      characteristicId: this.writeCharacteristicId,
      value: buffer,
      writeType: writeType,
      success: () => {
        console.log('发送成功, 长度:', buffer.byteLength, '字节')
        resolve()
      },
      fail: (err) => {
        console.error('写入数据失败', err)
        if (err.errCode === 10008) {
          console.log('错误码10008, 数据可能已发送成功')
          resolve()
        } else {
          reject(err)
        }
      }
    })
  },

  writeInChunks(buffer, chunkSize, resolve, reject) {
    const totalLen = buffer.byteLength
    let offset = 0
    const that = this
    const writeType = this.writeWithResponse ? 'write' : 'writeNoResponse'
    
    const writeNext = () => {
      if (offset >= totalLen) {
        console.log('所有分包发送完成')
        resolve()
        return
      }
      
      const end = Math.min(offset + chunkSize, totalLen)
      const chunk = buffer.slice(offset, end)
      
      wx.writeBLECharacteristicValue({
        deviceId: that.deviceId,
        serviceId: that.serviceId,
        characteristicId: that.writeCharacteristicId,
        value: chunk,
        writeType: writeType,
        success: () => {
          console.log('分包发送成功, 偏移:', offset, '长度:', chunk.byteLength)
          offset = end
          writeNext()
        },
        fail: (err) => {
          if (err.errCode === 10008) {
            console.log('iOS已知问题10008, 数据已发送, 继续下一包, 偏移:', offset)
            offset = end
            writeNext()
          } else {
            console.error('分包写入失败', err)
            reject(err)
          }
        }
      })
    }
    
    writeNext()
  },

  disconnect() {
    return new Promise((resolve, reject) => {
      if (this.deviceId) {
        wx.closeBLEConnection({
          deviceId: this.deviceId,
          success: () => {
            this.isConnected = false
            this.deviceId = null
            this.serviceId = null
            this.writeCharacteristicId = null
            this.notifyCharacteristicId = null
            this.allServices = []
            this.allCharacteristics = []
            console.log('断开蓝牙连接')
            resolve()
          },
          fail: (err) => {
            this.isConnected = false
            this.deviceId = null
            console.log('断开连接失败，但已重置状态')
            resolve()
          }
        })
      } else {
        this.isConnected = false
        resolve()
      }
    })
  },

  closeAdapter() {
    wx.closeBluetoothAdapter({
      success: () => {
        console.log('关闭蓝牙适配器')
      }
    })
  },

  onReceive(callback) {
    this.onReceiveCallback = callback
  },

  hex2ab(hexStr) {
    const hex = hexStr.replace(/\s/g, '')
    const buffer = new ArrayBuffer(hex.length / 2)
    const dataView = new DataView(buffer)
    for (let i = 0; i < hex.length; i += 2) {
      dataView.setUint8(i / 2, parseInt(hex.substr(i, 2), 16))
    }
    return buffer
  },

  ab2hex(buffer) {
    const hexArr = Array.prototype.map.call(
      new Uint8Array(buffer),
      function (bit) {
        return ('00' + bit.toString(16)).slice(-2).toUpperCase()
      }
    )
    return hexArr.join('')
  }
}

module.exports = BluetoothManager
