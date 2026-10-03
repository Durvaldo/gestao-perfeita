<script setup>
import { onMounted, reactive, ref } from 'vue'
import { financeiroApi } from '../../api/negocio'
import { formatDate, formatDecimal } from '../../utils/format'
import { toastSuccess, toastError, confirmDelete } from '../../utils/alerts'
import DecimalInput from '../../components/DecimalInput.vue'
import AppModal from '../../components/AppModal.vue'

const lancamentos = ref([])
const error = ref('')
const relatorio = ref(null)
const showModal = ref(false)

const form = reactive({ tipo: 'despesa', categoria: '', descricao: '', valor: '', data: '' })
const periodo = reactive({ inicio: '', fim: '' })

async function loadLancamentos() {
  const { data } = await financeiroApi.list()
  lancamentos.value = data
}

function openCreate() {
  error.value = ''
  Object.assign(form, { tipo: 'despesa', categoria: '', descricao: '', valor: '', data: '' })
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function handleSubmit() {
  error.value = ''
  try {
    await financeiroApi.create(form)
    toastSuccess('Lançamento salvo.')
    closeModal()
    await loadLancamentos()
  } catch (e) {
    error.value = e.response?.data?.message || 'Não foi possível salvar o lançamento.'
  }
}

async function remove(lancamento) {
  if (!(await confirmDelete('Excluir este lançamento?'))) return
  try {
    await financeiroApi.remove(lancamento.id)
    toastSuccess('Lançamento excluído.')
    await loadLancamentos()
  } catch (e) {
    toastError(e.response?.data?.message || 'Não foi possível excluir o lançamento.')
  }
}

async function gerarRelatorio() {
  relatorio.value = await financeiroApi.relatorio(periodo.inicio || undefined, periodo.fim || undefined)
}

onMounted(loadLancamentos)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold text-gray-800">
        <i class="fa-solid fa-coins text-blue-600 me-2"></i>Financeiro
      </h1>
      <button type="button" class="btn-primary" @click="openCreate">
        <i class="fa-solid fa-plus"></i>Novo lançamento
      </button>
    </div>

    <div class="card overflow-hidden mb-6">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="table-th">Tipo</th>
              <th class="table-th">Categoria</th>
              <th class="table-th">Descrição</th>
              <th class="table-th">Valor</th>
              <th class="table-th">Data</th>
              <th class="table-th text-end">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="l in lancamentos" :key="l.id" class="hover:bg-gray-50">
              <td class="table-td">
                <span :class="l.tipo === 'receita' ? 'badge-green' : 'badge-red'">
                  <i :class="l.tipo === 'receita' ? 'fa-solid fa-arrow-trend-up' : 'fa-solid fa-arrow-trend-down'"></i>
                  {{ l.tipo }}
                </span>
              </td>
              <td class="table-td">{{ l.categoria }}</td>
              <td class="table-td">{{ l.descricao }}</td>
              <td class="table-td font-medium" :class="l.tipo === 'receita' ? 'text-green-700' : 'text-red-700'">
                R$ {{ formatDecimal(l.valor) }}
              </td>
              <td class="table-td">{{ formatDate(l.data) }}</td>
              <td class="table-td text-end">
                <button type="button" class="btn-ghost-danger" @click="remove(l)">
                  <i class="fa-solid fa-trash"></i>Excluir
                </button>
              </td>
            </tr>
            <tr v-if="lancamentos.length === 0">
              <td colspan="6" class="table-td text-center text-gray-500 py-8">
                Nenhum lançamento.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card p-4">
      <h2 class="font-semibold text-gray-800 mb-3">
        <i class="fa-solid fa-chart-line text-blue-600 me-2"></i>Relatório por período
      </h2>
      <form class="flex flex-wrap gap-3 items-end mb-4" @submit.prevent="gerarRelatorio">
        <div>
          <label class="form-label">Início</label>
          <input v-model="periodo.inicio" type="date" class="form-input" />
        </div>
        <div>
          <label class="form-label">Fim</label>
          <input v-model="periodo.fim" type="date" class="form-input" />
        </div>
        <button type="submit" class="btn-white">
          <i class="fa-solid fa-magnifying-glass"></i>Gerar
        </button>
      </form>

      <div v-if="relatorio">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div class="border border-gray-200 rounded-lg p-4">
            <p class="text-xs uppercase tracking-wide text-gray-500">Receitas</p>
            <p class="text-lg font-bold text-green-700">R$ {{ formatDecimal(relatorio.total_receitas) }}</p>
          </div>
          <div class="border border-gray-200 rounded-lg p-4">
            <p class="text-xs uppercase tracking-wide text-gray-500">Despesas</p>
            <p class="text-lg font-bold text-red-700">R$ {{ formatDecimal(relatorio.total_despesas) }}</p>
          </div>
          <div class="border border-gray-200 rounded-lg p-4">
            <p class="text-xs uppercase tracking-wide text-gray-500">Saldo</p>
            <p class="text-lg font-bold" :class="Number(relatorio.saldo) >= 0 ? 'text-green-700' : 'text-red-700'">
              R$ {{ formatDecimal(relatorio.saldo) }}
            </p>
          </div>
        </div>

        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="table-th">Barbeiro</th>
              <th class="table-th">Comissão</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="c in relatorio.comissoes_por_barbeiro" :key="c.barbeiro_id">
              <td class="table-td">{{ c.barbeiro_nome }}</td>
              <td class="table-td">R$ {{ formatDecimal(c.comissao) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <AppModal :show="showModal" title="Novo lançamento" @close="closeModal">
      <form @submit.prevent="handleSubmit">
        <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="form-label">Tipo</label>
            <select v-model="form.tipo" class="form-select">
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>
          </div>
          <div>
            <label class="form-label">Categoria</label>
            <input v-model="form.categoria" class="form-input" required />
          </div>
          <div class="sm:col-span-2">
            <label class="form-label">Descrição</label>
            <input v-model="form.descricao" class="form-input" />
          </div>
          <div>
            <label class="form-label">Valor</label>
            <DecimalInput v-model="form.valor" :min="0" class="form-input" required />
          </div>
          <div>
            <label class="form-label">Data</label>
            <input v-model="form.data" type="date" class="form-input" required />
          </div>
          <p v-if="error" class="sm:col-span-2 text-sm text-red-600">{{ error }}</p>
        </div>
        <div class="flex justify-end items-center gap-x-2 py-3 px-4 border-t border-gray-200">
          <button type="button" class="btn-white" @click="closeModal">Cancelar</button>
          <button type="submit" class="btn-primary">Lançar</button>
        </div>
      </form>
    </AppModal>
  </div>
</template>
