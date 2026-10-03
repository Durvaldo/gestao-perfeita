<script setup>
import { onMounted, reactive, ref } from 'vue'
import { servicosApi } from '../../api/cadastro'
import { formatDecimal } from '../../utils/format'
import { toastSuccess, toastError, confirmDelete } from '../../utils/alerts'
import DecimalInput from '../../components/DecimalInput.vue'
import AppModal from '../../components/AppModal.vue'

const servicos = ref([])
const error = ref('')
const editingId = ref(null)
const showModal = ref(false)

const emptyForm = () => ({ nome: '', descricao: '', duracao_minutos: 30, preco: '', ativo: true })
const form = reactive(emptyForm())

async function loadServicos() {
  const { data } = await servicosApi.list()
  servicos.value = data
}

function openCreate() {
  editingId.value = null
  error.value = ''
  Object.assign(form, emptyForm())
  showModal.value = true
}

function edit(servico) {
  editingId.value = servico.id
  error.value = ''
  Object.assign(form, {
    nome: servico.nome,
    descricao: servico.descricao ?? '',
    duracao_minutos: servico.duracao_minutos,
    preco: servico.preco,
    ativo: servico.ativo,
  })
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
  Object.assign(form, emptyForm())
}

async function handleSubmit() {
  error.value = ''
  try {
    if (editingId.value) {
      await servicosApi.update(editingId.value, form)
      toastSuccess('Serviço atualizado.')
    } else {
      await servicosApi.create(form)
      toastSuccess('Serviço criado.')
    }
    closeModal()
    await loadServicos()
  } catch (e) {
    error.value = e.response?.data?.message || 'Não foi possível salvar o serviço.'
  }
}

async function remove(servico) {
  if (!(await confirmDelete(`Excluir o serviço "${servico.nome}"?`))) return
  try {
    await servicosApi.remove(servico.id)
    toastSuccess('Serviço excluído.')
    await loadServicos()
  } catch (e) {
    toastError(e.response?.data?.message || 'Não foi possível excluir o serviço.')
  }
}

onMounted(loadServicos)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold text-gray-800">
        <i class="fa-solid fa-bell-concierge text-blue-600 me-2"></i>Serviços
      </h1>
      <button type="button" class="btn-primary" @click="openCreate">
        <i class="fa-solid fa-plus"></i>Novo serviço
      </button>
    </div>

    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="table-th">Nome</th>
              <th class="table-th">Duração</th>
              <th class="table-th">Preço</th>
              <th class="table-th">Status</th>
              <th class="table-th text-end">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="servico in servicos" :key="servico.id" class="hover:bg-gray-50">
              <td class="table-td font-medium text-gray-800">{{ servico.nome }}</td>
              <td class="table-td">{{ servico.duracao_minutos }} min</td>
              <td class="table-td">R$ {{ formatDecimal(servico.preco) }}</td>
              <td class="table-td">
                <span :class="servico.ativo ? 'badge-green' : 'badge-gray'">
                  {{ servico.ativo ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td class="table-td text-end">
                <button type="button" class="btn-ghost" @click="edit(servico)">
                  <i class="fa-solid fa-pen"></i>Editar
                </button>
                <button type="button" class="btn-ghost-danger" @click="remove(servico)">
                  <i class="fa-solid fa-trash"></i>Excluir
                </button>
              </td>
            </tr>
            <tr v-if="servicos.length === 0">
              <td colspan="5" class="table-td text-center text-gray-500 py-8">
                Nenhum serviço cadastrado.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <AppModal :show="showModal" :title="editingId ? 'Editar serviço' : 'Novo serviço'" @close="closeModal">
      <form @submit.prevent="handleSubmit">
        <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">
            <label class="form-label">Nome</label>
            <input v-model="form.nome" class="form-input" required />
          </div>
          <div>
            <label class="form-label">Duração (min)</label>
            <input v-model.number="form.duracao_minutos" type="number" min="1" class="form-input" required />
          </div>
          <div>
            <label class="form-label">Preço</label>
            <DecimalInput v-model="form.preco" :min="0" class="form-input" required />
          </div>
          <label class="sm:col-span-2 flex items-center gap-x-2 text-sm text-gray-700">
            <input v-model="form.ativo" type="checkbox" class="form-checkbox" />
            Ativo
          </label>
          <p v-if="error" class="sm:col-span-2 text-sm text-red-600">{{ error }}</p>
        </div>
        <div class="flex justify-end items-center gap-x-2 py-3 px-4 border-t border-gray-200">
          <button type="button" class="btn-white" @click="closeModal">Cancelar</button>
          <button type="submit" class="btn-primary">{{ editingId ? 'Salvar' : 'Adicionar' }}</button>
        </div>
      </form>
    </AppModal>
  </div>
</template>
