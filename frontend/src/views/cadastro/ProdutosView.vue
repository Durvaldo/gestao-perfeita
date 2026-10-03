<script setup>
import { onMounted, reactive, ref } from 'vue'
import { produtosApi } from '../../api/cadastro'
import { formatDecimal } from '../../utils/format'
import { toastSuccess, toastError, confirmDelete } from '../../utils/alerts'
import DecimalInput from '../../components/DecimalInput.vue'
import AppModal from '../../components/AppModal.vue'

const produtos = ref([])
const error = ref('')
const editingId = ref(null)
const showModal = ref(false)

const emptyForm = () => ({ nome: '', descricao: '', preco: '', estoque_qtd: 0, ativo: true })
const form = reactive(emptyForm())

async function loadProdutos() {
  const { data } = await produtosApi.list()
  produtos.value = data
}

function openCreate() {
  editingId.value = null
  error.value = ''
  Object.assign(form, emptyForm())
  showModal.value = true
}

function edit(produto) {
  editingId.value = produto.id
  error.value = ''
  Object.assign(form, {
    nome: produto.nome,
    descricao: produto.descricao ?? '',
    preco: produto.preco,
    estoque_qtd: produto.estoque_qtd ?? 0,
    ativo: produto.ativo,
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
      await produtosApi.update(editingId.value, form)
      toastSuccess('Produto atualizado.')
    } else {
      await produtosApi.create(form)
      toastSuccess('Produto criado.')
    }
    closeModal()
    await loadProdutos()
  } catch (e) {
    error.value = e.response?.data?.message || 'Não foi possível salvar o produto.'
  }
}

async function remove(produto) {
  if (!(await confirmDelete(`Excluir o produto "${produto.nome}"?`))) return
  try {
    await produtosApi.remove(produto.id)
    toastSuccess('Produto excluído.')
    await loadProdutos()
  } catch (e) {
    toastError(e.response?.data?.message || 'Não foi possível excluir o produto.')
  }
}

onMounted(loadProdutos)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold text-gray-800">
        <i class="fa-solid fa-box-open text-blue-600 me-2"></i>Produtos
      </h1>
      <button type="button" class="btn-primary" @click="openCreate">
        <i class="fa-solid fa-plus"></i>Novo produto
      </button>
    </div>

    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="table-th">Nome</th>
              <th class="table-th">Preço</th>
              <th class="table-th">Estoque</th>
              <th class="table-th">Status</th>
              <th class="table-th text-end">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="produto in produtos" :key="produto.id" class="hover:bg-gray-50">
              <td class="table-td font-medium text-gray-800">{{ produto.nome }}</td>
              <td class="table-td">R$ {{ formatDecimal(produto.preco) }}</td>
              <td class="table-td">{{ produto.estoque_qtd }}</td>
              <td class="table-td">
                <span :class="produto.ativo ? 'badge-green' : 'badge-gray'">
                  {{ produto.ativo ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td class="table-td text-end">
                <button type="button" class="btn-ghost" @click="edit(produto)">
                  <i class="fa-solid fa-pen"></i>Editar
                </button>
                <button type="button" class="btn-ghost-danger" @click="remove(produto)">
                  <i class="fa-solid fa-trash"></i>Excluir
                </button>
              </td>
            </tr>
            <tr v-if="produtos.length === 0">
              <td colspan="5" class="table-td text-center text-gray-500 py-8">
                Nenhum produto cadastrado.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <AppModal :show="showModal" :title="editingId ? 'Editar produto' : 'Novo produto'" @close="closeModal">
      <form @submit.prevent="handleSubmit">
        <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">
            <label class="form-label">Nome</label>
            <input v-model="form.nome" class="form-input" required />
          </div>
          <div>
            <label class="form-label">Preço</label>
            <DecimalInput v-model="form.preco" :min="0" class="form-input" required />
          </div>
          <div>
            <label class="form-label">Estoque</label>
            <input v-model.number="form.estoque_qtd" type="number" min="0" class="form-input" />
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
