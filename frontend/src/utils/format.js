/**
 * Formata uma data (YYYY-MM-DD, com sufixo de hora opcional descartado) como DD/MM/AAAA.
 * Nunca usa `Date` — só manipulação de string. Isso é proposital: `new Date("2022-08-23")`
 * é interpretado como meia-noite UTC, e `.toLocaleDateString()` converte para o fuso local
 * do navegador, o que em qualquer fuso brasileiro (UTC-3 a UTC-5) empurra a data um dia
 * para trás (vira 22/08/2022). Datas "de calendário" (nascimento, data de um lançamento)
 * não têm instante real associado, então não devem passar por conversão de fuso nenhuma.
 */
export function formatDate(value) {
  if (!value) return ''
  const datePart = String(value).split('T')[0].split(' ')[0]
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart)
  if (!match) return String(value)
  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

/**
 * Formata um timestamp real (tem hora, ex: Agendamento.data_hora_inicio) como
 * data e hora localizadas em pt-BR. Aqui a conversão de fuso via Date é CORRETA
 * e desejada, ao contrário de formatDate — isso representa um instante real.
 */
export function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

/**
 * Formata um número ou string decimal com ponto (ex: "42.96", 42.96) como string
 * no padrão brasileiro (ex: "42,96"), com separador de milhar. Retorna '' para
 * valor ausente/vazio/inválido — importante para não "vazar" 0,00 em campos de
 * formulário que foram resetados para string vazia após salvar.
 */
export function formatDecimal(value, decimals = 2) {
  if (value === null || value === undefined || value === '') return ''
  const num = Number(value)
  if (Number.isNaN(num)) return ''
  return num.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/**
 * Converte um valor digitado pelo usuário (pode ter vírgula decimal, ex: "8,99",
 * ou já vir com ponto, ex: "8.99") para um número JS pronto para a API.
 * Regra: se tiver ponto E vírgula, ponto é separador de milhar (removido) e
 * vírgula é decimal (ex: "1.234,56" -> 1234.56). Se só tiver vírgula, vírgula
 * vira ponto. Se só tiver ponto, já está em formato válido, não mexe.
 */
export function parseDecimal(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return value
  let s = String(value).trim()
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (s.includes(',')) {
    s = s.replace(',', '.')
  }
  const num = Number(s)
  return Number.isNaN(num) ? null : num
}
