<script setup>
import { computed } from 'vue'
import {
  todayKey,
  weekdayIndex,
  weekdayShortLabel,
  dayMonthLabel,
  parseDateTimeParts,
  timeToMinutes,
  minutesToTime,
} from '../../utils/calendar'

const props = defineProps({
  /** dateKeys visíveis: 7 na visão semana, 1 na visão dia */
  dias: { type: Array, required: true },
  agendamentos: { type: Array, default: () => [] },
  /** horários de trabalho do barbeiro selecionado ({ dia_semana, hora_inicio, hora_fim }) */
  horarios: { type: Array, default: () => [] },
  slotMinutos: { type: Number, default: 30 },
})

const emit = defineEmits(['select-slot', 'select-agendamento'])

const PX_POR_MINUTO = 1.2
const hoje = todayKey()

const STATUS_CARD = {
  pendente: 'bg-yellow-100 border-yellow-400 text-yellow-900 hover:bg-yellow-200',
  confirmado: 'bg-blue-100 border-blue-400 text-blue-900 hover:bg-blue-200',
  concluido: 'bg-green-100 border-green-400 text-green-900 hover:bg-green-200',
  cancelado: 'bg-red-100 border-red-400 text-red-900 opacity-60 hover:bg-red-200',
}

/** Expediente por dia da semana: { [dia_semana]: [{ ini, fim }] } em minutos. */
const expediente = computed(() => {
  const map = {}
  for (const h of props.horarios) {
    ;(map[h.dia_semana] ??= []).push({
      ini: timeToMinutes(h.hora_inicio),
      fim: timeToMinutes(h.hora_fim),
    })
  }
  return map
})

/** Eventos por dia visível, com início/fim em minutos extraídos por string. */
const eventosPorDia = computed(() => {
  const map = Object.fromEntries(props.dias.map((d) => [d, []]))
  for (const a of props.agendamentos) {
    const inicio = parseDateTimeParts(a.data_hora_inicio)
    if (!inicio || !(inicio.dateKey in map)) continue
    const fim = parseDateTimeParts(a.data_hora_fim)
    map[inicio.dateKey].push({
      agendamento: a,
      startMin: inicio.minutes,
      endMin: fim && fim.dateKey === inicio.dateKey ? fim.minutes : inicio.minutes + props.slotMinutos,
    })
  }
  return map
})

/**
 * Intervalo de horas da grade: derivado do expediente (±1h, arredondado à hora
 * cheia), fallback 07–21h, expandido se algum agendamento visível cair fora.
 */
const range = computed(() => {
  let min = Infinity
  let max = -Infinity

  for (const periods of Object.values(expediente.value)) {
    for (const p of periods) {
      min = Math.min(min, p.ini)
      max = Math.max(max, p.fim)
    }
  }

  if (min === Infinity) {
    min = 7 * 60
    max = 21 * 60
  } else {
    min = Math.max(0, Math.floor(min / 60) * 60 - 60)
    max = Math.min(24 * 60, Math.ceil(max / 60) * 60 + 60)
  }

  for (const eventos of Object.values(eventosPorDia.value)) {
    for (const ev of eventos) {
      min = Math.max(0, Math.min(min, Math.floor(ev.startMin / 60) * 60))
      max = Math.min(24 * 60, Math.max(max, Math.ceil(ev.endMin / 60) * 60))
    }
  }

  return { start: min, end: max }
})

const gridHeight = computed(() => (range.value.end - range.value.start) * PX_POR_MINUTO)

const slots = computed(() => {
  const list = []
  for (let m = range.value.start; m < range.value.end; m += props.slotMinutos) list.push(m)
  return list
})

/** Horas cheias para a régua (a primeira fica sem rótulo para não cortar no topo). */
const hourMarks = computed(() => {
  const list = []
  for (let m = Math.ceil(range.value.start / 60) * 60; m < range.value.end; m += 60) {
    if (m > range.value.start) list.push(m)
  }
  return list
})

function dentroExpediente(dateKey, slotStart) {
  const periods = expediente.value[weekdayIndex(dateKey)] ?? []
  return periods.some((p) => slotStart >= p.ini && slotStart + props.slotMinutos <= p.fim)
}

function slotStyle(slotStart) {
  return {
    top: `${(slotStart - range.value.start) * PX_POR_MINUTO}px`,
    height: `${props.slotMinutos * PX_POR_MINUTO}px`,
  }
}

function slotClasses(dateKey, slotStart) {
  const borda = slotStart % 60 === 0 ? 'border-t border-gray-200' : 'border-t border-gray-100'
  return dentroExpediente(dateKey, slotStart)
    ? `${borda} bg-white hover:bg-blue-50 cursor-pointer`
    : `${borda} bg-gray-200/60`
}

function onSlotClick(dateKey, slotStart) {
  if (!dentroExpediente(dateKey, slotStart)) return
  emit('select-slot', { dateKey, minutes: slotStart })
}

/**
 * Layout de sobreposição: agrupa eventos que se intersectam em clusters e
 * atribui colunas gulosamente; cada card recebe col/cols para left/width %.
 */
function layoutEventos(eventos) {
  const sorted = [...eventos].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin)
  const result = []
  let cluster = []
  let clusterEnd = -1
  let colEnds = []

  const flush = () => {
    const total = colEnds.length
    for (const ev of cluster) result.push({ ...ev, cols: total })
    cluster = []
    colEnds = []
  }

  for (const ev of sorted) {
    if (cluster.length && ev.startMin >= clusterEnd) flush()
    let col = colEnds.findIndex((end) => end <= ev.startMin)
    if (col === -1) {
      col = colEnds.length
      colEnds.push(0)
    }
    colEnds[col] = ev.endMin
    cluster.push({ ...ev, col })
    clusterEnd = Math.max(clusterEnd, ev.endMin)
  }
  if (cluster.length) flush()

  return result
}

const eventosLayout = computed(() =>
  Object.fromEntries(props.dias.map((d) => [d, layoutEventos(eventosPorDia.value[d])]))
)

function cardStyle(ev) {
  const top = Math.max(0, (ev.startMin - range.value.start) * PX_POR_MINUTO)
  const alturaMin = Math.max(ev.endMin - ev.startMin, props.slotMinutos) * PX_POR_MINUTO
  return {
    top: `${top}px`,
    height: `${Math.min(alturaMin, gridHeight.value - top)}px`,
    left: `calc(${(ev.col / ev.cols) * 100}% + 2px)`,
    width: `calc(${100 / ev.cols}% - 4px)`,
  }
}

function cardAltura(ev) {
  return Math.max(ev.endMin - ev.startMin, props.slotMinutos) * PX_POR_MINUTO
}

function nomesServicos(agendamento) {
  return (agendamento.servicos ?? []).map((s) => s.nome).join(', ')
}
</script>

<template>
  <div class="overflow-x-auto">
    <div :class="dias.length > 1 ? 'min-w-[840px]' : ''">
      <!-- Cabeçalho dos dias -->
      <div class="flex border-b border-gray-200">
        <div class="w-14 shrink-0 sticky left-0 bg-white z-20"></div>
        <div
          v-for="dia in dias"
          :key="dia"
          class="flex-1 py-2 text-center border-s border-gray-200"
          :class="dia === hoje ? 'text-blue-600' : 'text-gray-700'"
        >
          <span class="block text-xs uppercase">{{ weekdayShortLabel(dia) }}</span>
          <span class="block text-sm font-semibold">{{ dayMonthLabel(dia) }}</span>
        </div>
      </div>

      <!-- Corpo da grade -->
      <div class="flex">
        <!-- Régua de horas -->
        <div
          class="w-14 shrink-0 sticky left-0 bg-white z-20 relative"
          :style="{ height: `${gridHeight}px` }"
        >
          <span
            v-for="h in hourMarks"
            :key="h"
            class="absolute right-1.5 -translate-y-1/2 text-[11px] text-gray-400"
            :style="{ top: `${(h - range.start) * PX_POR_MINUTO}px` }"
          >
            {{ minutesToTime(h) }}
          </span>
        </div>

        <!-- Colunas de dia -->
        <div
          v-for="dia in dias"
          :key="dia"
          class="flex-1 relative border-s border-gray-200"
          :style="{ height: `${gridHeight}px` }"
        >
          <!-- Slots de fundo (expediente claro, fora escuro) -->
          <div
            v-for="slot in slots"
            :key="slot"
            class="absolute inset-x-0"
            :class="slotClasses(dia, slot)"
            :style="slotStyle(slot)"
            @click="onSlotClick(dia, slot)"
          ></div>

          <!-- Cards de agendamento -->
          <button
            v-for="ev in eventosLayout[dia]"
            :key="ev.agendamento.id"
            type="button"
            class="absolute z-10 rounded-md border-s-4 px-1.5 py-1 text-xs leading-tight text-start overflow-hidden cursor-pointer shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            :class="STATUS_CARD[ev.agendamento.status] ?? 'bg-gray-100 border-gray-400 text-gray-800'"
            :style="cardStyle(ev)"
            @click.stop="emit('select-agendamento', ev.agendamento)"
          >
            <span class="block font-semibold truncate">
              {{ minutesToTime(ev.startMin) }} · {{ ev.agendamento.cliente?.nome }}
            </span>
            <span v-if="cardAltura(ev) >= 54" class="block truncate">
              {{ nomesServicos(ev.agendamento) }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
