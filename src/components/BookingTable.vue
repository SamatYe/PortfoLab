<template>
  <div class="wrapper" :class="theme">
    <div class="header">
      <div class="date-picker">
        <button
          v-for="(day, idx) in days"
          :key="idx"
          @click="selectedDate = idx"
          :class="{ active: selectedDate === idx }"
        >
          {{ formatDate(day) }}
        </button>
      </div>
      <div class="zones-picker">
        <button
          v-for="zone in allZones"
          :key="zone"
          @click="toggleZone(zone)"
          :class="{ active: selectedZones.includes(zone) }"
        >
          {{ zone }}
        </button>
      </div>
    </div>

    <div class="zoom-controls">
      <button @click="zoomIn">+</button>
      <button @click="zoomOut">−</button>
    </div>

    <div class="board-viewport">
      <div class="board" :style="boardTransformStyle">
        <div class="times">
          <div v-for="time in visibleHours" :key="time" class="time-label">{{ time }}</div>
        </div>
        <div class="tables">
          <div class="table-column" v-for="table in visibleTables" :key="table.id">
            <div class="table-header">
              #{{ table.number }} | {{ table.capacity }} чел
              <div class="zone-name">{{ table.zone }}</div>
            </div>
            <div class="table-cells">
              <div v-for="time in visibleHours" :key="time" class="cell"></div>
              <div
                v-for="item in getItemsForTable(table.id)"
                :key="item.id"
                :class="['event', getEventClass(item), { active: activeEventId === item.id }]"
                :style="getEventStyle(item)"
                @click="toggleActiveEvent(item.id)"
              >
                <div class="event-title">{{ getEventTitle(item) }}</div>
                <div class="event-details">
                  <div v-if="item.type === 'order'">
                    {{ formatTime((item as Order).start_time) }}–{{ formatTime((item as Order).end_time) }}<br />
                    Статус: {{ getOrderStatusText((item as Order).status) }}
                  </div>
                  <div v-else>
                    {{ (item as Reservation).name_for_reservation }} • {{ (item as Reservation).num_people }} чел<br />
                    📞 {{ (item as Reservation).phone_number }}<br />
                    {{ formatTime((item as Reservation).seating_time) }}–{{ formatTime((item as Reservation).end_time) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTheme } from '../assets/useTheme.ts'
const { theme } = useTheme()

interface Order {
  id: string
  status: string
  start_time: string
  end_time: string
  table_id: string
  zone: string
}
interface Reservation {
  id: number
  name_for_reservation: string
  num_people: number
  phone_number: string
  status: string
  seating_time: string
  end_time: string
  table_id: string
  zone: string
}
interface Table {
  id: string
  capacity: number
  number: string
  zone: string
  orders: Order[]
  reservations: Reservation[]
}
interface AnyItemBase {
  id: string | number
  start: Date
  end: Date
  xOffset?: number
  yOffset?: number
  widthFactor?: number
}
type AnyItem = (Order | Reservation) & { type: 'order' | 'reservation' } & AnyItemBase

const days = ref<string[]>([])
const selectedDate = ref(0)
const allZones = ref<string[]>([])
const selectedZones = ref<string[]>([])
const tables = ref<Table[]>([])
const openingTime = ref<string>('08:00')
const closingTime = ref<string>('23:00')
const zoomLevel = ref(1)

const zoomIn = () => {
  if (zoomLevel.value < 2) zoomLevel.value += 0.1
}
const zoomOut = () => {
  if (zoomLevel.value > 0.4) zoomLevel.value -= 0.1
}

const boardTransformStyle = computed(() => ({
  transform: `scale(${zoomLevel.value})`,
  transformOrigin: 'top left',
}))

const formatDate = (str: string) =>
  new Date(str).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })

const toggleZone = (zone: string) =>
  (selectedZones.value = selectedZones.value.includes(zone)
    ? selectedZones.value.filter((z) => z !== zone)
    : [...selectedZones.value, zone])

const visibleTables = computed(() =>
  tables.value.filter((t) => selectedZones.value.includes(t.zone)),
)

const formatTime = (time: string) =>
  new Date(time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

const getItemsForTable = (tableId: string): AnyItem[] => {
  const selected = new Date(days.value[selectedDate.value])
  const table = tables.value.find((t) => t.id === tableId)
  if (!table) return []

  const allItems: AnyItem[] = [
    ...table.orders.map((order) => ({
      ...order,
      type: 'order' as const,
      start: new Date(order.start_time),
      end: new Date(order.end_time),
    })),
    ...table.reservations.map((res) => ({
      ...res,
      type: 'reservation' as const,
      start: new Date(res.seating_time),
      end: new Date(res.end_time),
    })),
  ].filter((item) => item.start.toDateString() === selected.toDateString())

  return layoutEvents(allItems)
}

const layoutEvents = (items: AnyItem[]) => {
  const sorted = [...items].sort((a, b) => a.start.getTime() - b.start.getTime())
  const used = Array(sorted.length).fill(false)

  for (let i = 0; i < sorted.length; i++) {
    if (used[i]) continue
    const base = sorted[i]
    base.xOffset = 0
    base.widthFactor = 1
    used[i] = true

    const overlapping = []
    for (let j = i + 1; j < sorted.length; j++) {
      if (used[j]) continue
      const item = sorted[j]
      if (item.start < base.end) {
        overlapping.push(item)
        used[j] = true
      }
    }
    overlapping.forEach((item, index) => {
      item.xOffset = index
      item.widthFactor = 1 / overlapping.length
    })
    if (overlapping.length > 0) base.widthFactor = 1
  }

  return sorted
}

const getOverlappingCount = (item: AnyItem) =>
  getItemsForTable(item.table_id).filter(
    (other) => other.id !== item.id && other.start < item.end && other.end > item.start,
  ).length

const getEventStyle = (item: AnyItem) => {
  const startMinutes = item.start.getHours() * 60 + item.start.getMinutes()
  const endMinutes = item.end.getHours() * 60 + item.end.getMinutes()
  const top = (startMinutes - minTime.value) * (40 / 30) + (item.yOffset || 0)
  const height = (endMinutes - startMinutes) * (37 / 30) || 40
  const widthPercent = (item.widthFactor || 1) * 100
  const leftPercent = (item.xOffset || 0) * widthPercent

  return {
    top: `${top}px`,
    height: `${height}px`,
    left: `${leftPercent}%`,
    width: `${widthPercent}%`,
    position: 'absolute' as const,
    zIndex: 999999999999999999999 - getOverlappingCount(item),
  }

}

const activeEventId = ref<string | number | null>(null)
const toggleActiveEvent = (id: string | number) => {
  activeEventId.value = activeEventId.value === id ? null : id
}

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

const minTime = computed(() =>
  Math.min(
    ...tables.value
      .flatMap((t) => [
        ...t.orders.map((o) => new Date(o.start_time)),
        ...t.reservations.map((r) => new Date(r.seating_time)),
      ])
      .map((d) => d.getHours() * 60 + d.getMinutes()),
    timeToMinutes(openingTime.value),
  ),
)

const maxTime = computed(() =>
  Math.max(
    ...tables.value
      .flatMap((t) => [
        ...t.orders.map((o) => new Date(o.end_time)),
        ...t.reservations.map((r) => new Date(r.end_time)),
      ])
      .map((d) => d.getHours() * 60 + d.getMinutes()),
    timeToMinutes(closingTime.value),
  ),
)

const visibleHours = computed(() => {
  const result = []
  for (let i = minTime.value; i <= maxTime.value; i += 30) {
    const h = `${Math.floor(i / 60)}`.padStart(2, '0')
    const m = `${i % 60}`.padStart(2, '0')
    result.push(`${h}:${m}`)
  }
  return result
})

const getEventClass = (item: AnyItem) =>
  item.type === 'order'
    ? { New: 'order-new', Bill: 'order-bill', Closed: 'order-closed', Banquet: 'order-banquet' }[
        item.status
      ] || ''
    : {
        'Живая очередь': 'queue',
        Новая: 'reservation-new',
        Заявка: 'reservation-pending',
        Открыт: 'reservation-open',
        Закрыт: 'reservation-cancelled',
      }[item.status] || ''

const getEventTitle = (item: AnyItem) => (item.type === 'order' ? 'Заказ' : 'Бронь')
const getOrderStatusText = (status: string) =>
  ({ New: 'Новый', Bill: 'Счет', Closed: 'Оплачен', Banquet: 'Банкет' })[status] || status

onMounted(async () => {
  const res = await fetch('https://hh.frontend.ark.software/api/booking')
  const data: {
    available_days: string[]
    tables: Table[]
    restaurant: { opening_time: string; closing_time: string }
  } = await res.json()
  days.value = data.available_days
  const zones = data.tables.map((t: Table) => t.zone)
  allZones.value = [...new Set(zones)]
  selectedZones.value = [...allZones.value]
  tables.value = data.tables
  openingTime.value = data.restaurant.opening_time
  closingTime.value = data.restaurant.closing_time
})
</script>

<style scoped>
.wrapper {
  font-family: sans-serif;
  padding: 20px;
  background: #121212;
  color: #eee;
  position: relative;
}
.header {
  margin-bottom: 16px;
}
.date-picker,
.zones-picker {
  margin-bottom: 12px;
}
.date-picker button,
.zones-picker button {
  margin-right: 10px;
  padding: 6px 12px;
  background: #333;
  border: 1px solid #555;
  border-radius: 4px;
  color: #eee;
  cursor: pointer;
}
.date-picker button.active,
.zones-picker button.active {
  background: #007bff;
  border-color: #007bff;
}
.board-viewport {
  width: 100%;
  height: 90vh;
  overflow: auto;
  border-top: 1px solid #444;
  position: relative;
}
.board {
  display: flex;
}
.times {
  flex: 0 0 70px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #444;
}
.time-label {
  height: 40px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #333;
}
.tables {
  display: flex;
  flex: 1;
}
.table-column {
  min-width: 180px;
  border-right: 1px solid #333;
}
.table-header {
  height: 40px;
  background: #222;
  text-align: center;
  font-weight: bold;
  font-size: 13px;
  line-height: 16px;
  padding: 4px 0;
  border-bottom: 1px solid #333;
}
.zone-name {
  font-size: 10px;
  color: #aaa;
}
.table-cells {
  position: relative;
  height: calc(40px * 22);
  background: #1a1a1a;
  overflow: visible;
}
.cell {
  height: 40px;
  border-bottom: 1px solid #222;
}

.event {
  position: absolute;
  left: 0;
  width: 100%;
  padding: 3px 1px 1px 5px;
  box-sizing: border-box;
  font-size: 12px;
  color: white;
  box-shadow: #1a1a1a 2px;
  background-color: #1b3d3d;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-left: 5px solid;
  transition: all 0.2s ease-in-out;
  z-index: 1;
  cursor: pointer;
}

.event.active {
  z-index: 9999;
  transform: scale(1.6);
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.6);
}

.event-title {
  font-weight: 600;
  font-size: 10px;
}

.table-column {
  position: relative;
  z-index: 1;
}

.order-new {
  background-color: #1b3d3d;
  border-left-color: #00b8b8;
}
.order-bill {
  background-color: #1e3b50;
  border-left-color: #3399cc;
}
.order-closed {
  background-color: #2e4d3a;
  border-left-color: #4caf50;
}
.order-banquet {
  background-color: #3e2e4d;
  border-left-color: #9b59b6;
}

.queue {
  background-color: #1e3b50;
  border-left-color: #007bff;
}

.reservation-new {
  background-color: #4a2b1d;
  border-left-color: #ff7043;
}
.reservation-pending {
  background-color: #4b3a1e;
  border-left-color: #ffa726;
}
.reservation-open {
  background-color: #2e4d3a;
  border-left-color: #66bb6a;
}
.reservation-cancelled {
  background-color: #4d2e2e;
  border-left-color: #b71c1c;
}

.zoom-controls {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 1000;
}
.zoom-controls button {
  font-size: 32px;
  width: 70px;
  height: 70px;
  margin-left: 10px;
  border: none;
  border-radius: 50%;
  background: #007bff;
  color: white;
  cursor: pointer;
}
.wrapper.dark {
  background: #121212;
  color: #eee;
}

.wrapper.light {
  background: #f3f3f3;
  color: #111;
}

.wrapper.light .table-header {
  background: #e0e0e0;
  color: #222;
}

.wrapper.light .table-cells {
  background: #fff;
}

.wrapper.light .date-picker button,
.wrapper.light .zones-picker button {
  background: #ddd;
  border-color: #bbb;
  color: #222;
}

.wrapper.light .date-picker button.active,
.wrapper.light .zones-picker button.active {
  background: #007bff;
  color: white;
}
</style>
