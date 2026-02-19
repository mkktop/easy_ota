const btManager = require('./bluetooth')

const OTA = {
  FRAME_HEAD: '5D6C',
  FRAME_TAIL: '7E5A',
  OTA_ACK_CMD: '5D6CAABBCC7E5A',
  CHUNK_SIZE: 256,
  CHUNK_DELAY: 150,
  DEFAULT_CHUNK_SIZE: 256,
  DEFAULT_CHUNK_DELAY: 150,
  firmwareUrl: '',
  firmwareData: null,
  firmwareName: '',
  onProgressCallback: null,
  onStatusCallback: null,
  isUpgrading: false,

  setChunkSize(size) {
    if (size && size > 0 && size <= 512) {
      this.CHUNK_SIZE = size
      console.log('设置分包大小:', size)
    }
  },

  setChunkDelay(delay) {
    if (delay !== undefined && delay >= 0 && delay <= 1000) {
      this.CHUNK_DELAY = delay
      console.log('设置包间隔:', delay)
    }
  },

  getChunkSize() {
    return this.CHUNK_SIZE
  },

  getChunkDelay() {
    return this.CHUNK_DELAY
  },

  resetToDefaults() {
    this.CHUNK_SIZE = this.DEFAULT_CHUNK_SIZE
    this.CHUNK_DELAY = this.DEFAULT_CHUNK_DELAY
    console.log('重置为默认值: 分包大小=', this.CHUNK_SIZE, '包间隔=', this.CHUNK_DELAY)
  },

  getOtaSettings() {
    return {
      chunkSize: this.CHUNK_SIZE,
      chunkDelay: this.CHUNK_DELAY,
      defaultChunkSize: this.DEFAULT_CHUNK_SIZE,
      defaultChunkDelay: this.DEFAULT_CHUNK_DELAY
    }
  },

  setFirmwareUrl(url) {
    this.firmwareUrl = url
    this.firmwareData = null
    this.firmwareName = ''
  },

  setFirmwareData(data, name) {
    this.firmwareData = data
    this.firmwareName = name || '未知文件'
    this.firmwareUrl = ''
  },

  buildOtaStartCmd(firmwareSize) {
    const sizeHex = this.sizeToBigEndianHex(firmwareSize)
    const dataLen = sizeHex.length / 2
    const lenHex = this.byteToHex(dataLen)
    const cmd = this.FRAME_HEAD + lenHex + sizeHex + this.FRAME_TAIL
    console.log('构建OTA启动命令, 固件大小:', firmwareSize, '数据长度:', dataLen, '命令:', cmd)
    return cmd
  },

  sizeToLittleEndianHex(size) {
    if (size === 0) return '00'
    let hex = ''
    while (size > 0) {
      const byte = size & 0xFF
      hex += this.byteToHex(byte)
      size = size >> 8
    }
    return hex
  },

  sizeToBigEndianHex(size) {
    if (size === 0) return '00'
    let bytes = []
    while (size > 0) {
      bytes.unshift(size & 0xFF)
      size = size >> 8
    }
    return bytes.map(b => this.byteToHex(b)).join('')
  },

  byteToHex(byte) {
    return ('00' + byte.toString(16)).slice(-2).toUpperCase()
  },

  chooseFile() {
    return new Promise((resolve, reject) => {
      wx.chooseMessageFile({
        count: 1,
        type: 'file',
        extension: ['bin', 'hex', 'ota', 'fw', 'dat'],
        success: (res) => {
          const file = res.tempFiles[0]
          console.log('选择文件:', file.name, '大小:', file.size)
          
          this.updateStatus('正在读取文件...')
          
          const fs = wx.getFileSystemManager()
          fs.readFile({
            filePath: file.path,
            success: (data) => {
              this.firmwareData = data.data
              this.firmwareName = file.name
              this.firmwareUrl = ''
              const size = this.firmwareData.byteLength || this.firmwareData.length || 0
              this.updateStatus('文件读取成功: ' + file.name + ' (' + size + ' 字节)')
              console.log('固件读取成功，大小:', size)
              resolve({
                name: file.name,
                size: size,
                data: this.firmwareData
              })
            },
            fail: (err) => {
              console.error('读取文件失败:', err)
              reject(new Error('读取文件失败: ' + (err.errMsg || JSON.stringify(err))))
            }
          })
        },
        fail: (err) => {
          console.log('选择文件取消或失败:', err)
          reject(new Error('选择文件取消'))
        }
      })
    })
  },

  downloadFirmware() {
    return new Promise((resolve, reject) => {
      if (!this.firmwareUrl) {
        reject(new Error('固件URL未设置'))
        return
      }
      this.updateStatus('正在下载固件...')
      console.log('开始下载固件:', this.firmwareUrl)
      
      wx.downloadFile({
        url: this.firmwareUrl,
        timeout: 60000,
        success: (res) => {
          console.log('下载响应:', res.statusCode, res.tempFilePath)
          if (res.statusCode === 200) {
            const fs = wx.getFileSystemManager()
            fs.readFile({
              filePath: res.tempFilePath,
              success: (data) => {
                this.firmwareData = data.data
                const size = this.firmwareData.byteLength || this.firmwareData.length || 0
                this.updateStatus('固件下载完成，大小: ' + size + ' 字节')
                console.log('固件读取成功，大小:', size)
                resolve(this.firmwareData)
              },
              fail: (err) => {
                console.error('读取文件失败:', err)
                reject(new Error('读取固件文件失败: ' + (err.errMsg || JSON.stringify(err))))
              }
            })
          } else {
            reject(new Error('下载失败，HTTP状态码: ' + res.statusCode))
          }
        },
        fail: (err) => {
          console.error('下载固件失败:', err)
          let errMsg = '下载固件失败'
          if (err.errMsg) {
            if (err.errMsg.indexOf('url not in domain list') > -1) {
              errMsg = '域名未配置白名单，请在小程序后台添加downloadFile合法域名'
            } else if (err.errMsg.indexOf('fail') > -1) {
              errMsg = '网络请求失败，请检查链接是否正确'
            } else {
              errMsg = err.errMsg
            }
          }
          reject(new Error(errMsg))
        }
      })
    })
  },

  startUpgrade() {
    return new Promise(async (resolve, reject) => {
      if (this.isUpgrading) {
        reject(new Error('升级正在进行中'))
        return
      }
      this.isUpgrading = true
      
      try {
        if (!this.firmwareData && this.firmwareUrl) {
          await this.downloadFirmware()
        }
        
        if (!this.firmwareData || this.firmwareData.byteLength === 0) {
          throw new Error('请先选择或下载固件文件')
        }
        
        const firmwareSize = this.firmwareData.byteLength
        const otaStartCmd = this.buildOtaStartCmd(firmwareSize)
        
        this.updateStatus('发送OTA启动命令...')
        console.log('发送OTA启动命令:', otaStartCmd)
        await btManager.write(otaStartCmd)
        this.updateStatus('等待设备响应...')
        
        const ackReceived = await this.waitForAck(10000)
        if (!ackReceived) {
          this.isUpgrading = false
          reject(new Error('设备未响应OTA启动命令（超时10秒）'))
          return
        }
        
        this.updateStatus('开始传输固件...')
        await this.sendFirmware()
        
        this.updateStatus('OTA升级完成!')
        this.isUpgrading = false
        resolve()
      } catch (err) {
        this.isUpgrading = false
        console.error('OTA升级失败:', err)
        reject(err)
      }
    })
  },

  waitForAck(timeout) {
    return new Promise((resolve) => {
      let resolved = false
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true
          console.log('等待ACK超时')
          resolve(false)
        }
      }, timeout)

      btManager.onReceive((data) => {
        console.log('收到设备数据:', data)
        if (data === this.OTA_ACK_CMD && !resolved) {
          clearTimeout(timer)
          resolved = true
          console.log('收到正确的ACK')
          resolve(true)
        }
      })
    })
  },

  async sendFirmware() {
    const totalSize = this.firmwareData.byteLength
    const totalChunks = Math.ceil(totalSize / this.CHUNK_SIZE)
    console.log('固件总大小:', totalSize, '分片数:', totalChunks)
    
    for (let i = 0; i < totalChunks; i++) {
      if (!this.isUpgrading) {
        throw new Error('升级已取消')
      }
      
      const offset = i * this.CHUNK_SIZE
      const endOffset = Math.min(offset + this.CHUNK_SIZE, totalSize)
      const chunk = this.firmwareData.slice(offset, endOffset)
      const hexData = this.arrayBufferToHex(chunk)
      
      console.log('发送第', i + 1, '包, 大小:', chunk.byteLength || chunk.length)
      await btManager.write(hexData)
      
      const progress = Math.round(((i + 1) / totalChunks) * 100)
      this.updateProgress(progress)
      this.updateStatus(`传输中: ${i + 1}/${totalChunks} 包 (${progress}%)`)
      
      if (i < totalChunks - 1) {
        await this.delay(this.CHUNK_DELAY)
      }
    }
  },

  arrayBufferToHex(buffer) {
    const hexArr = Array.prototype.map.call(
      new Uint8Array(buffer),
      function (bit) {
        return ('00' + bit.toString(16)).slice(-2).toUpperCase()
      }
    )
    return hexArr.join('')
  },

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  },

  onProgress(callback) {
    this.onProgressCallback = callback
  },

  onStatus(callback) {
    this.onStatusCallback = callback
  },

  updateProgress(progress) {
    if (this.onProgressCallback) {
      this.onProgressCallback(progress)
    }
  },

  updateStatus(status) {
    console.log('OTA状态:', status)
    if (this.onStatusCallback) {
      this.onStatusCallback(status)
    }
  },

  cancel() {
    this.isUpgrading = false
    this.firmwareData = null
    this.updateStatus('升级已取消')
  },

  getFirmwareInfo() {
    return {
      name: this.firmwareName || '未选择',
      size: this.firmwareData ? this.firmwareData.byteLength : 0,
      source: this.firmwareUrl ? 'URL' : (this.firmwareData ? '文件' : '无')
    }
  }
}

module.exports = OTA
