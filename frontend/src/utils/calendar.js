/**
 * Utilitários de data do calendário da Agenda.
 *
 * Convenção do projeto (ver format.js): datas "de calendário" são manipuladas
 * como string 'YYYY-MM-DD' (dateKey) e NUNCA passam por new Date('YYYY-MM-DD'),
 * que interpretaria como UTC e deslocaria um dia em fusos brasileiros.
 * Quando um Date é necessário (aritmética/rótulos), ele é construído com
 * componentes locais: new Date(y, m - 1, d).
 *
 * Além disso, o backend (em UTC) armazena a "hora de parede" digitada pelo
 * usuário — o JSON volta como '...T10:00:00.000000Z'. Por isso o
 * posicionamento na grade extrai data/hora por string (parseDateTimeParts),
 * não via new Date(iso), que deslocaria -3h no Brasil.
 */

function toDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toKey(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Data de hoje como 'YYYY-MM-DD' no fuso local. */
export function todayKey() {
  return toKey(new Date())
}

/** Soma n dias (pode ser negativo) a um dateKey. */
export function addDays(dateKey, n) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return toKey(new Date(y, m - 1, d + n))
}

/** Segunda-feira da semana do dateKey. */
export function startOfWeek(dateKey) {
  const day = toDate(dateKey).getDay()
  return addDays(dateKey, -((day + 6) % 7))
}

/** Dia da semana (0=domingo … 6=sábado) — casa com horarios_trabalho.dia_semana. */
export function weekdayIndex(dateKey) {
  return toDate(dateKey).getDay()
}

/**
 * Extrai { dateKey, minutes } de um timestamp por string (sem Date).
 * Aceita '2030-01-10T10:00:00.000000Z' e '2030-01-10 10:00:00'.
 * Retorna null se o valor não casar.
 */
export function parseDateTimeParts(value) {
  const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/.exec(String(value ?? ''))
  if (!match) return null
  return { dateKey: match[1], minutes: Number(match[2]) * 60 + Number(match[3]) }
}

/** 'HH:MM' ou 'HH:MM:SS' → minutos desde 00:00. */
export function timeToMinutes(time) {
  const [h, m] = String(time).split(':').map(Number)
  return h * 60 + m
}

/** Minutos desde 00:00 → 'HH:MM'. */
export function minutesToTime(minutes) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

/** Rótulo curto do dia, ex: 'seg.' — Date construído com componentes locais. */
export function weekdayShortLabel(dateKey) {
  return toDate(dateKey).toLocaleDateString('pt-BR', { weekday: 'short' })
}

/** Rótulo dia/mês, ex: '14/07'. */
export function dayMonthLabel(dateKey) {
  const [, m, d] = dateKey.split('-')
  return `${d}/${m}`
}
