<script setup lang="ts">
import { useTheme } from '../assets/useTheme.ts'
const { theme, toggleTheme } = useTheme()
</script>

<template>
  <header :class="['header', theme]">
    <div class="logo">
      <span>AIRESTO</span><span class="sep">|</span><span class="place">Супра</span>
    </div>

    <div class="controls">
      <div class="search">
        <span class="icon">🔍</span>
        <input type="text" placeholder="⌘+L поиск по имени" />
      </div>

      <button class="btn" @click="toggleTheme">
        {{ theme === 'dark' ? '🌙' : '☀️' }}
      </button>

      <button class="btn">⎋ Выйти</button>
    </div>
  </header>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.header {
  width: 100%;
  height: 48px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  font-family: sans-serif;
}

.header.dark {
  background-color: #2c2c2c;
  color: white;
}

.header.light {
  background-color: #f3f3f3;
  color: #222;
}

.logo {
  font-weight: bold;
  font-size: 14px;
  display: flex;
  align-items: center;
}

.sep {
  margin: 0 6px;
  color: #999;
}

.place {
  color: inherit;
}

.controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search {
  display: flex;
  align-items: center;
  background-color: inherit;
  border: 1px solid rgba(128, 128, 128, 0.3);
  padding: 6px 10px;
  border-radius: 6px;
}

.search .icon {
  margin-right: 6px;
  font-size: 14px;
  opacity: 0.6;
}

.search input {
  background: transparent;
  border: none;
  outline: none;
  color: inherit;
  font-size: 14px;
  width: 180px;
}

.btn {
  background-color: rgba(128, 128, 128, 0.2);
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  color: inherit;
  cursor: pointer;
  font-size: 14px;
}

.btn:hover {
  background-color: rgba(128, 128, 128, 0.3);
}
</style>
