const ThemeManager = {
  themes: [
    {
      id: 'purple',
      name: '紫罗兰',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      primary: '#667eea',
      secondary: '#764ba2'
    },
    {
      id: 'blue',
      name: '海洋蓝',
      gradient: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)',
      primary: '#2193b0',
      secondary: '#6dd5ed'
    },
    {
      id: 'green',
      name: '森林绿',
      gradient: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
      primary: '#134e5e',
      secondary: '#71b280'
    },
    {
      id: 'orange',
      name: '日落橙',
      gradient: 'linear-gradient(135deg, #ff512f 0%, #f09819 100%)',
      primary: '#ff512f',
      secondary: '#f09819'
    },
    {
      id: 'pink',
      name: '樱花粉',
      gradient: 'linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)',
      primary: '#ee9ca7',
      secondary: '#ffdde1'
    },
    {
      id: 'dark',
      name: '暗夜黑',
      gradient: 'linear-gradient(135deg, #232526 0%, #414345 100%)',
      primary: '#232526',
      secondary: '#414345'
    }
  ],

  currentTheme: null,

  init() {
    const savedThemeId = wx.getStorageSync('themeId') || 'purple'
    this.setTheme(savedThemeId)
  },

  setTheme(themeId) {
    const theme = this.themes.find(t => t.id === themeId)
    if (theme) {
      this.currentTheme = theme
      wx.setStorageSync('themeId', themeId)
      console.log('主题已切换为:', theme.name)
    }
  },

  getTheme() {
    if (!this.currentTheme) {
      this.init()
    }
    return this.currentTheme
  },

  getAllThemes() {
    return this.themes
  },

  getCurrentThemeId() {
    if (!this.currentTheme) {
      this.init()
    }
    return this.currentTheme.id
  }
}

module.exports = ThemeManager
