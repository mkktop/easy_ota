const themeManager = require('../../utils/theme')

Component({
  data: {
    themeGradient: ''
  },

  lifetimes: {
    attached() {
      this.loadTheme()
    }
  },

  pageLifetimes: {
    show() {
      this.loadTheme()
    }
  },

  methods: {
    loadTheme() {
      const theme = themeManager.getTheme()
      this.setData({ themeGradient: theme.gradient })
    }
  }
})
