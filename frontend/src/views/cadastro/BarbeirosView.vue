<script setup>
import { onMounted, reactive, ref } from 'vue'
import { barbeirosApi, horariosTrabalhoApi } from '../../api/cadastro'
import { formatDecimal } from '../../utils/format'
import { toastSuccess, toastError, confirmDelete } from '../../utils/alerts'
import DecimalInput from '../../components/DecimalInput.vue'
import AppModal from '../../components/AppModal.vue'

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const barbeiros = ref([])
const error = ref('')
const showModal = ref(false)

const createForm = reactive({ name: '', email: '', password: '', comissao_percentual_padrao: 30 })

async function loadBarbeiros() {
  const { data } = await barbeirosApi.list()
  barbeiros.value = data.map((b) => ({
    ...b,
    editing: false,
    editForm: { comissao_percentual_padrao: b.comissao_percentual_padrao, ativo: b.ativo },
    showHorarios: false,
    horarios: [],
    horarioForm: { dia_semana: 1, manha_inicio: '09:00', manha_fim: '12:00', tarde_inicio: '13:00', tarde_fim: '18:00' },
    horarioError: '',
  }))
}

function openCreate() {
  error.value = ''
  Object.assign(createForm, { name: '', email: '', password: '', comissao_percentual_padrao: 30 })
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function handleCreate() {
  error.value = ''
  try {
    await barbeirosApi.create(createForm)
    toastSuccess('Barbeiro cadastrado.')
    closeModal()
    await loadBarbeiros()
  } catch (e) {
    error.value = e.response?.data?.message || 'Não foi possível cadastrar o barbeiro.'
  }
}

async function saveEdit(barbeiro) {
  try {
    await barbeirosApi.update(barbeiro.id, barbeiro.editForm)
    barbeiro.editing = false
    toastSuccess('Barbeiro atualizado.')
    await loadBarbeiros()
  } catch (e) {
    toastError(e.response?.data?.message || 'Não foi possível atualizar o barbeiro.')
  }
}

async function remove(barbeiro) {
  if (!(await confirmDelete(`Excluir o barbeiro "${barbeiro.user.name}"?`))) return
  try {
    await barbeirosApi.remove(barbeiro.id)
    toastSuccess('Barbeiro excluído.')
    await loadBarbeiros()
  } catch (e) {
    toastError(e.response?.data?.message || 'Não foi possível excluir o barbeiro.')
  }
}

async function toggleHorarios(barbeiro) {
  barbeiro.showHorarios = !barbeiro.showHorarios
  if (barbeiro.showHorarios) {
    barbeiro.horarios = await horariosTrabalhoApi(barbeiro.id).list()
  }
}

function periodoValido(inicio, fim) {
  return Boolean(inicio) === Boolean(fim)
}

async function addHorario(barbeiro) {
  const f = barbeiro.horarioForm
  barbeiro.horarioError = ''

  if (!periodoValido(f.manha_inicio, f.manha_fim) || !periodoValido(f.tarde_inicio, f.tarde_fim)) {
    barbeiro.horarioError = 'Preencha início e fim do período, ou deixe os dois em branco.'
    return
  }

  const manha = f.manha_inicio && f.manha_fim
  const tarde = f.tarde_inicio && f.tarde_fim

  if (!manha && !tarde) {
    barbeiro.horarioError = 'Preencha ao menos um período (manhã ou tarde).'
    return
  }

  try {
    const api = horariosTrabalhoApi(barbeiro.id)
    if (manha) await api.create({ dia_semana: f.dia_semana, hora_inicio: f.manha_inicio, hora_fim: f.manha_fim })
    if (tarde) await api.create({ dia_semana: f.dia_semana, hora_inicio: f.tarde_inicio, hora_fim: f.tarde_fim })
    barbeiro.horarios = await api.list()
    toastSuccess('Horário adicionado.')
  } catch (e) {
    barbeiro.horarioError = e.response?.data?.message || 'Não foi possível salvar o horário.'
  }
}

async function removeHorario(barbeiro, horario) {
  try {
    await horariosTrabalhoApi(barbeiro.id).remove(horario.id)
    barbeiro.horarios = await horariosTrabalhoApi(barbeiro.id).list()
    toastSuccess('Horário removido.')
  } catch (e) {
    toastError(e.response?.data?.message || 'Não foi possível remover o horário.')
  }
}

onMounted(loadBarbeiros)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold text-gray-800">
        <i class="fa-solid fa-scissors text-blue-600 me-2"></i>Barbeiros
      </h1>
      <button type="button" class="btn-primary" @click="openCreate">
        <i class="fa-solid fa-plus"></i>Novo barbeiro
      </button>
    </div>

    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="table-th">Nome</th>
              <th class="table-th">E-mail</th>
              <th class="table-th">Comissão</th>
              <th class="table-th">Status</th>
              <th class="table-th text-end">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <template v-for="barbeiro in barbeiros" :key="barbeiro.id">
              <tr class="hover:bg-gray-50">
                <td class="table-td font-medium text-gray-800">{{ barbeiro.user.name }}</td>
                <td class="table-td">{{ barbeiro.user.email }}</td>
                <td class="table-td">
                  <DecimalInput
                    v-if="barbeiro.editing"
                    v-model="barbeiro.editForm.comissao_percentual_padrao"
                    :min="0"
                    :max="100"
                    class="form-input w-20 inline-block"
                  />
                  <span v-else>{{ formatDecimal(barbeiro.comissao_percentual_padrao) }}%</span>
                </td>
                <td class="table-td">
                  <label v-if="barbeiro.editing" class="inline-flex items-center gap-x-2 text-sm">
                    <input v-model="barbeiro.editForm.ativo" type="checkbox" class="form-checkbox" />
                    Ativo
                  </label>
                  <span v-else :class="barbeiro.ativo ? 'badge-green' : 'badge-gray'">
                    {{ barbeiro.ativo ? 'Ativo' : 'Inativo' }}
                  </span>
                </td>
                <td class="table-td text-end">
                  <button v-if="!barbeiro.editing" type="button" class="btn-ghost" @click="barbeiro.editing = true">
                    <i class="fa-solid fa-pen"></i>Editar
                  </button>
                  <button v-else type="button" class="btn-ghost" @click="saveEdit(barbeiro)">
                    <i class="fa-solid fa-check"></i>Salvar
                  </button>
                  <button type="button" class="btn-ghost" @click="toggleHorarios(barbeiro)">
                    <i class="fa-solid fa-clock"></i>Horários
                  </button>
                  <button type="button" class="btn-ghost-danger" @click="remove(barbeiro)">
                    <i class="fa-solid fa-trash"></i>Excluir
                  </button>
                </td>
              </tr>
              <tr v-if="barbeiro.showHorarios">
                <td colspan="5" class="px-4 py-4 bg-gray-50">
                  <form class="grid grid-cols-2 sm:grid-cols-6 gap-3 items-end mb-4" @submit.prevent="addHorario(barbeiro)">
                    <div>
                      <label class="form-label">Dia</label>
                      <select v-model.number="barbeiro.horarioForm.dia_semana" class="form-select">
                        <option v-for="(dia, i) in DIAS_SEMANA" :key="i" :value="i">{{ dia }}</option>
                      </select>
                    </div>
                    <div>
                      <label class="form-label">Manhã — início</label>
                      <input v-model="barbeiro.horarioForm.manha_inicio" type="time" class="form-input" />
                    </div>
                    <div>
                      <label class="form-label">Manhã — fim</label>
                      <input v-model="barbeiro.horarioForm.manha_fim" type="time" class="form-input" />
                    </div>
                    <div>
                      <label class="form-label">Tarde — início</label>
                      <input v-model="barbeiro.horarioForm.tarde_inicio" type="time" class="form-input" />
                    </div>
                    <div>
                      <label class="form-label">Tarde — fim</label>
                      <input v-model="barbeiro.horarioForm.tarde_fim" type="time" class="form-input" />
                    </div>
                    <div>
                      <button type="submit" class="btn-white w-full justify-center">
                        <i class="fa-solid fa-plus"></i>Adicionar
                      </button>
                    </div>
                    <p v-if="barbeiro.horarioError" class="col-span-full text-sm text-red-600">
                      {{ barbeiro.horarioError }}
                    </p>
                  </form>
                  <table class="min-w-full divide-y divide-gray-200">
                    <tbody class="divide-y divide-gray-200">
                      <tr v-for="horario in barbeiro.horarios" :key="horario.id">
                        <td class="table-td">{{ DIAS_SEMANA[horario.dia_semana] }}</td>
                        <td class="table-td">{{ horario.hora_inicio }} – {{ horario.hora_fim }}</td>
                        <td class="table-td text-end">
                          <button type="button" class="btn-ghost-danger" @click="removeHorario(barbeiro, horario)">
                            <i class="fa-solid fa-trash"></i>Remover
                          </button>
                        </td>
                      </tr>
                      <tr v-if="barbeiro.horarios.length === 0">
                        <td colspan="3" class="table-td text-center text-gray-500">
                          Nenhum horário cadastrado.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </template>
            <tr v-if="barbeiros.length === 0">
              <td colspan="5" class="table-td text-center text-gray-500 py-8">
                Nenhum barbeiro cadastrado.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <AppModal :show="showModal" title="Novo barbeiro" @close="closeModal">
      <form @submit.prevent="handleCreate">
        <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">
            <label class="form-label">Nome</label>
            <input v-model="createForm.name" class="form-input" required />
          </div>
          <div class="sm:col-span-2">
            <label class="form-label">E-mail</label>
            <input v-model="createForm.email" type="email" class="form-input" required />
          </div>
          <div>
            <label class="form-label">Senha</label>
            <input v-model="createForm.password" type="password" class="form-input" required minlength="8" />
          </div>
          <div>
            <label class="form-label">Comissão (%)</label>
            <DecimalInput v-model="createForm.comissao_percentual_padrao" :min="0" :max="100" class="form-input" required />
          </div>
          <p v-if="error" class="sm:col-span-2 text-sm text-red-600">{{ error }}</p>
        </div>
        <div class="flex justify-end items-center gap-x-2 py-3 px-4 border-t border-gray-200">
          <button type="button" class="btn-white" @click="closeModal">Cancelar</button>
          <button type="submit" class="btn-primary">Adicionar</button>
        </div>
      </form>
    </AppModal>
  </div>
</template>
