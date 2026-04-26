import { toRaw } from 'vue'

export default defineNuxtPlugin({
  name: 'theme-init',
  order: 100,
  setup(nuxtApp) {
    const vuetify = nuxtApp.vueApp.config.globalProperties.$vuetify
    if (!vuetify?.theme) return

    const theme = toRaw(vuetify.theme)

    const isDark = JSON.parse(localStorage.getItem('darkTheme')) === true

    const nameRef = theme.global?.name ?? theme.name
    if (nameRef && typeof nameRef === 'object' && 'value' in nameRef) {
      nameRef.value = isDark ? 'dark' : 'light'
    }

    const themes = theme.themes?.value ?? theme.themes
    if (themes) {
      if (localStorage.getItem('primaryDark'))
        themes.dark.colors.primary = localStorage.getItem('primaryDark')
      if (localStorage.getItem('primaryLight'))
        themes.light.colors.primary = localStorage.getItem('primaryLight')
      if (localStorage.getItem('backgroundDark'))
        themes.dark.colors.background = localStorage.getItem('backgroundDark')
      if (localStorage.getItem('backgroundLight'))
        themes.light.colors.background = localStorage.getItem('backgroundLight')
    }

    const current = theme.current?.value?.colors ?? theme.current?.colors ?? {}
    const backgroundColor = current.background || (isDark ? '#000000' : '#ffffff')

    document.documentElement.style.backgroundColor = backgroundColor

    nuxtApp.$vuetube?.navigationBar?.setTheme(backgroundColor, !isDark)
    nuxtApp.$vuetube?.statusBar?.setTheme(backgroundColor, isDark)
  },
})
