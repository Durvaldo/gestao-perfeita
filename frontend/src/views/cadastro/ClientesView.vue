<script setup>
import { onMounted, reactive, ref } from 'vue'
import { clientesApi } from '../../api/cadastro'
import { toastSuccess, toastError, confirmDelete } from '../../utils/alerts'
import AppModal from '../../components/AppModal.vue'

const clientes = ref([])
const error = ref('')
const editingId = ref(null)
const showModal = ref(false)

const emptyForm = () => ({ nome: '', telefone: '', email: '', data_nascimento: '', observacoes: '' })
const form = reactive(emptyForm())

async function loadClientes() {
  const { data } = await clientesApi.list()
  clientes.value = data
}

function openCreate() {
  editingId.value = null
  error.value = ''
  Object.assign(form, emptyForm())
  showModal.value = true
}

function edit(cliente) {
  editingId.value = cliente.id
  error.value = ''
  Object.assign(form, {
    nome: cliente.nome,
    telefone: cliente.telefone,
    email: cliente.email ?? '',
    data_nascimento: cliente.data_nascimento ?? '',
    observacoes: cliente.observacoes ?? '',
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
      await clientesApi.update(editingId.value, form)
      toastSuccess('Cliente atualizado.')
    } else {
      await clientesApi.create(form)
      toastSuccess('Cliente criado.')
    }
    closeModal()
    await loadClientes()
  } catch (e) {
    error.value = e.response?.data?.message || 'Não foi possível salvar o cliente.'
  }
}

async function remove(cliente) {
  if (!(await confirmDelete(`Excluir o cliente "${cliente.nome}"?`))) return
  try {
    await clientesApi.remove(cliente.id)
    toastSuccess('Cliente excluído.')
    await loadClientes()
  } catch (e) {
    toastError(e.response?.data?.message || 'Não foi possível excluir o cliente.')
  }
}

onMounted(loadClientes)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold text-gray-800">
        <i class="fa-solid fa-users text-blue-600 me-2"></i>Clientes
      </h1>
      <button type="button" class="btn-primary" @click="openCreate">
        <i class="fa-solid fa-plus"></i>Novo cliente
      </button>
    </div>

    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="table-th">Nome</th>
              <th class="table-th">Telefone</th>
              <th class="table-th">E-mail</th>
              <th class="table-th text-end">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="cliente in clientes" :key="cliente.id" class="hover:bg-gray-50">
              <td class="table-td font-medium text-gray-800">{{ cliente.nome }}</td>
              <td class="table-td">{{ cliente.telefone }}</td>
              <td class="table-td">{{ cliente.email }}</td>
              <td class="table-td text-end">
                <button type="button" class="btn-ghost" @click="edit(cliente)">
                  <i class="fa-solid fa-pen"></i>Editar
                </button>
                <button type="button" class="btn-ghost-danger" @click="remove(cliente)">
                  <i class="fa-solid fa-trash"></i>Excluir
                </button>
              </td>
            </tr>
            <tr v-if="clientes.length === 0">
              <td colspan="4" class="table-td text-center text-gray-500 py-8">
                Nenhum cliente cadastrado.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <AppModal :show="showModal" :title="editingId ? 'Editar cliente' : 'Novo cliente'" @close="closeModal">
      <form @submit.prevent="handleSubmit">
        <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">
            <label class="form-label">Nome</label>
            <input v-model="form.nome" class="form-input" required />
          </div>
          <div>
            <label class="form-label">Telefone</label>
            <input v-model="form.telefone" class="form-input" required />
          </div>
          <div>
            <label class="form-label">E-mail</label>
            <input v-model="form.email" type="email" class="form-input" />
          </div>
          <div>
            <label class="form-label">Nascimento</label>
            <input v-model="form.data_nascimento" type="date" class="form-input" />
          </div>
          <div>
            <label class="form-label">Observações</label>
            <input v-model="form.observacoes" class="form-input" />
          </div>
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
