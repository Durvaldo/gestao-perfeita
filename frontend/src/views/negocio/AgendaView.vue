<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { authState } from '../../stores/auth'
import { agendamentosApi, comandasApi } from '../../api/negocio'
import { clientesApi, barbeirosApi, servicosApi, horariosTrabalhoApi } from '../../api/cadastro'
import { formatDate } from '../../utils/format'
import {
  todayKey,
  addDays,
  startOfWeek,
  parseDateTimeParts,
  minutesToTime,
  dayMonthLabel,
} from '../../utils/calendar'
import { toastSuccess, toastError, confirmAction } from '../../utils/alerts'
import AppModal from '../../components/AppModal.vue'
import AgendaCalendar from '../../components/agenda/AgendaCalendar.vue'

const router = useRouter()

const agendamentos = ref([])
const clientes = ref([])
const barbeiros = ref([])
const servicos = ref([])
const horariosTrabalho = ref([])
const error = ref('')
const showModal = ref(false)
const detalhe = ref(null)

const visao = ref('semana')
const dataBase = ref(todayKey())
const barbeiroSelecionadoId = ref('')

const isAdmin = computed(() => authState.user?.tipo === 'admin')
// Prestador não escolhe: a agenda é sempre a dele (o /api/user traz o barbeiro vinculado)
if (authState.user?.tipo === 'prestador_de_servico') {
  barbeiroSelecionadoId.value = authState.user.barbeiro?.id ?? ''
}

const STATUS_BADGE = {
  pendente: 'badge-yellow',
  confirmado: 'badge-blue',
  concluido: 'badge-green',
  cancelado: 'badge-red',
}

const STATUS_LABEL = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  concluido: 'Atendido',
  cancelado: 'Cancelado',
}

const form = reactive({
  cliente_id: '',
  barbeiro_id: '',
  data_hora_inicio: '',
  servico_ids: [],
  observacoes: '',
})

const diasVisiveis = computed(() => {
  if (visao.value === 'dia') return [dataBase.value]
  const inicio = startOfWeek(dataBase.value)
  return Array.from({ length: 7 }, (_, i) => addDays(inicio, i))
})

const periodoLabel = computed(() => {
  const dias = diasVisiveis.value
  if (dias.length === 1) return formatDate(dias[0])
  return `${dayMonthLabel(dias[0])} – ${dayMonthLabel(dias[dias.length - 1])}`
})

async function loadAgendamentos() {
  if (!barbeiroSelecionadoId.value) {
    agendamentos.value = []
    return
  }
  const dias = diasVisiveis.value
  agendamentos.value = await agendamentosApi.list({
    barbeiro_id: barbeiroSelecionadoId.value,
    de: `${dias[0]}T00:00`,
    ate: `${addDays(dias[dias.length - 1], 1)}T00:00`,
  })
}

async function loadHorarios() {
  if (!barbeiroSelecionadoId.value) {
    horariosTrabalho.value = []
    return
  }
  horariosTrabalho.value = await horariosTrabalhoApi(barbeiroSelecionadoId.value).list()
}

watch(diasVisiveis, loadAgendamentos)
watch(barbeiroSelecionadoId, () => Promise.all([loadAgendamentos(), loadHorarios()]))

function navegar(direcao) {
  dataBase.value = addDays(dataBase.value, (visao.value === 'semana' ? 7 : 1) * direcao)
}

function irParaHoje() {
  dataBase.value = todayKey()
}

function openCreate(prefill = null) {
  error.value = ''
  Object.assign(form, {
    cliente_id: '',
    barbeiro_id: barbeiroSelecionadoId.value || '',
    data_hora_inicio: prefill ? `${prefill.dateKey}T${minutesToTime(prefill.minutes)}` : '',
    servico_ids: [],
    observacoes: '',
  })
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function handleSubmit() {
  error.value = ''
  try {
    await agendamentosApi.create(form)
    toastSuccess('Agendamento criado.')
    closeModal()
    await loadAgendamentos()
  } catch (e) {
    error.value = e.response?.data?.message || 'Não foi possível criar o agendamento.'
  }
}

const STATUS_TOAST = {
  confirmado: 'Agendamento confirmado.',
  concluido: 'Agendamento marcado como atendido.',
  cancelado: 'Agendamento cancelado.',
}

async function mudarStatus(agendamento, status) {
  try {
    await agendamentosApi.update(agendamento.id, {
      cliente_id: agendamento.cliente_id,
      barbeiro_id: agendamento.barbeiro_id,
      data_hora_inicio: agendamento.data_hora_inicio,
      servico_ids: agendamento.servicos.map((s) => s.id),
      status,
    })
    toastSuccess(STATUS_TOAST[status] ?? 'Agendamento atualizado.')
    detalhe.value = null
    await loadAgendamentos()
  } catch (e) {
    toastError(e.response?.data?.message || 'Não foi possível atualizar o agendamento.')
  }
}

async function cancelarAgendamento(agendamento) {
  const ok = await confirmAction(
    `Cancelar o agendamento de "${agendamento.cliente?.nome}"?`,
    { confirmText: 'Sim, cancelar', cancelText: 'Voltar' }
  )
  if (!ok) return
  await mudarStatus(agendamento, 'cancelado')
}

async function criarComanda(agendamento) {
  try {
    const comanda = await comandasApi.create({ agendamento_id: agendamento.id })
    toastSuccess('Comanda criada.')
    router.push(`/comandas/${comanda.id}`)
  } catch (e) {
    toastError(e.response?.data?.message || 'Não foi possível criar a comanda.')
  }
}

function horarioDetalhe(agendamento) {
  const inicio = parseDateTimeParts(agendamento.data_hora_inicio)
  const fim = parseDateTimeParts(agendamento.data_hora_fim)
  if (!inicio) return ''
  const horas = fim ? `${minutesToTime(inicio.minutes)} – ${minutesToTime(fim.minutes)}` : minutesToTime(inicio.minutes)
  return `${formatDate(inicio.dateKey)}, ${horas}`
}

const acoesDisponiveis = computed(
  () => detalhe.value && !['concluido', 'cancelado'].includes(detalhe.value.status)
)

onMounted(async () => {
  await Promise.all([
    loadAgendamentos(),
    loadHorarios(),
    clientesApi.list().then(({ data }) => (clientes.value = data)),
    barbeirosApi.list().then(({ data }) => (barbeiros.value = data)),
    servicosApi.list().then(({ data }) => (servicos.value = data)),
  ])

  // Admin entra com o primeiro barbeiro já selecionado (o watch carrega a agenda)
  if (!barbeiroSelecionadoId.value && barbeiros.value.length > 0) {
    barbeiroSelecionadoId.value = barbeiros.value[0].id
  }
})
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h1 class="text-xl font-bold text-gray-800">
        <i class="fa-solid fa-calendar-days text-blue-600 me-2"></i>Agenda
      </h1>
      <button type="button" class="btn-primary" @click="openCreate()">
        <i class="fa-solid fa-plus"></i>Novo agendamento
      </button>
    </div>

    <!-- Toolbar do calendário -->
    <div class="card p-3 mb-4 flex flex-wrap items-center gap-3">
      <select
        v-if="isAdmin"
        v-model="barbeiroSelecionadoId"
        class="form-select w-56"
        aria-label="Barbeiro"
      >
        <option value="" disabled>Selecione um barbeiro</option>
        <option v-for="b in barbeiros" :key="b.id" :value="b.id">{{ b.user.name }}</option>
      </select>

      <div class="inline-flex bg-gray-100 rounded-lg p-1" role="group">
        <button
          type="button"
          class="py-1.5 px-3 text-sm font-medium rounded-md"
          :class="visao === 'semana' ? 'bg-white text-gray-800 shadow-2xs' : 'text-gray-500 hover:text-gray-800'"
          @click="visao = 'semana'"
        >
          Semana
        </button>
        <button
          type="button"
          class="py-1.5 px-3 text-sm font-medium rounded-md"
          :class="visao === 'dia' ? 'bg-white text-gray-800 shadow-2xs' : 'text-gray-500 hover:text-gray-800'"
          @click="visao = 'dia'"
        >
          Dia
        </button>
      </div>

      <div class="inline-flex items-center gap-x-1">
        <button type="button" class="btn-ghost" aria-label="Anterior" @click="navegar(-1)">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <button type="button" class="btn-white" @click="irParaHoje">Hoje</button>
        <button type="button" class="btn-ghost" aria-label="Próximo" @click="navegar(1)">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>

      <span class="text-sm font-medium text-gray-600 ms-auto">{{ periodoLabel }}</span>
    </div>

    <!-- Calendário -->
    <div class="card overflow-hidden">
      <div v-if="!barbeiroSelecionadoId" class="p-10 text-center text-gray-500">
        <i class="fa-solid fa-user-clock text-3xl mb-3 block text-gray-400"></i>
        Selecione um barbeiro para ver a agenda.
      </div>
      <AgendaCalendar
        v-else
        :dias="diasVisiveis"
        :agendamentos="agendamentos"
        :horarios="horariosTrabalho"
        @select-slot="openCreate"
        @select-agendamento="detalhe = $event"
      />
    </div>

    <!-- Modal: novo agendamento -->
    <AppModal :show="showModal" title="Novo agendamento" @close="closeModal">
      <form @submit.prevent="handleSubmit">
        <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="form-label">Cliente</label>
            <select v-model="form.cliente_id" class="form-select" required>
              <option value="" disabled>Selecione</option>
              <option v-for="c in clientes" :key="c.id" :value="c.id">{{ c.nome }}</option>
            </select>
          </div>
          <div>
            <label class="form-label">Barbeiro</label>
            <select v-model="form.barbeiro_id" class="form-select" required>
              <option value="" disabled>Selecione</option>
              <option v-for="b in barbeiros" :key="b.id" :value="b.id">{{ b.user.name }}</option>
            </select>
          </div>
          <div class="sm:col-span-2">
            <label class="form-label">Data/Hora</label>
            <input v-model="form.data_hora_inicio" type="datetime-local" class="form-input" required />
          </div>
          <div class="sm:col-span-2">
            <label class="form-label">Serviços</label>
            <div class="border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
              <label
                v-for="s in servicos"
                :key="s.id"
                class="flex items-center gap-x-2 text-sm text-gray-700"
              >
                <input v-model="form.servico_ids" type="checkbox" :value="s.id" class="form-checkbox" />
                {{ s.nome }} ({{ s.duracao_minutos }}min)
              </label>
              <p v-if="servicos.length === 0" class="text-sm text-gray-500">Nenhum serviço cadastrado.</p>
            </div>
          </div>
          <div class="sm:col-span-2">
            <label class="form-label">Observações</label>
            <input v-model="form.observacoes" class="form-input" />
          </div>
          <p v-if="error" class="sm:col-span-2 text-sm text-red-600">{{ error }}</p>
        </div>
        <div class="flex justify-end items-center gap-x-2 py-3 px-4 border-t border-gray-200">
          <button type="button" class="btn-white" @click="closeModal">Cancelar</button>
          <button type="submit" class="btn-primary">Agendar</button>
        </div>
      </form>
    </AppModal>

    <!-- Modal: detalhes do agendamento -->
    <AppModal :show="!!detalhe" title="Detalhes do agendamento" @close="detalhe = null">
      <template v-if="detalhe">
        <div class="p-4 space-y-3 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-gray-500">Status</span>
            <span :class="STATUS_BADGE[detalhe.status] ?? 'badge-gray'">
              {{ STATUS_LABEL[detalhe.status] ?? detalhe.status }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-500">Cliente</span>
            <span class="font-medium text-gray-800">{{ detalhe.cliente?.nome }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-500">Barbeiro</span>
            <span class="font-medium text-gray-800">{{ detalhe.barbeiro?.user?.name }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-500">Horário</span>
            <span class="font-medium text-gray-800">{{ horarioDetalhe(detalhe) }}</span>
          </div>
          <div>
            <span class="text-gray-500 block mb-1">Serviços</span>
            <ul class="space-y-1">
              <li v-for="s in detalhe.servicos" :key="s.id" class="flex items-center gap-x-2 text-gray-800">
                <i class="fa-solid fa-check text-blue-600 text-xs"></i>
                {{ s.nome }} ({{ s.duracao_minutos }}min)
              </li>
            </ul>
          </div>
          <div v-if="detalhe.observacoes">
            <span class="text-gray-500 block mb-1">Observações</span>
            <p class="text-gray-800">{{ detalhe.observacoes }}</p>
          </div>
        </div>
        <div class="flex flex-wrap justify-end items-center gap-2 py-3 px-4 border-t border-gray-200">
          <button
            v-if="acoesDisponiveis"
            type="button"
            class="btn-ghost-danger"
            @click="cancelarAgendamento(detalhe)"
          >
            <i class="fa-solid fa-ban"></i>Cancelar agendamento
          </button>
          <button
            v-if="acoesDisponiveis"
            type="button"
            class="btn-white"
            @click="criarComanda(detalhe)"
          >
            <i class="fa-solid fa-receipt"></i>Criar comanda
          </button>
          <button
            v-if="detalhe.status === 'pendente'"
            type="button"
            class="btn-white"
            @click="mudarStatus(detalhe, 'confirmado')"
          >
            <i class="fa-solid fa-check"></i>Confirmar
          </button>
          <button
            v-if="acoesDisponiveis"
            type="button"
            class="btn-primary"
            @click="mudarStatus(detalhe, 'concluido')"
          >
            <i class="fa-solid fa-user-check"></i>Marcar como atendido
          </button>
        </div>
      </template>
    </AppModal>
  </div>
</template>
