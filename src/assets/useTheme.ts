import { ref, watchEffect } from 'vue'

const theme = ref('dark')

watchEffect(() => {
  document.body.className = theme.value
  localStorage.setItem('theme', theme.value)
})

export function useTheme() {
  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  const saved = localStorage.getItem('theme')
  if (saved) theme.value = saved

  return { theme, toggleTheme }
}
