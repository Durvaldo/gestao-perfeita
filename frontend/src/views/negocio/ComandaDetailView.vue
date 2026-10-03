<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { comandasApi } from '../../api/negocio'
import { servicosApi, produtosApi } from '../../api/cadastro'
import { formatDecimal } from '../../utils/format'
import { toastSuccess, toastError } from '../../utils/alerts'

const route = useRoute()

const comanda = ref(null)
const servicos = ref([])
const produtos = ref([])
const error = ref('')
const fecharError = ref('')
const formaPagamento = ref('dinheiro')

const STATUS_BADGE = {
  aberta: 'badge-blue',
  fechada: 'badge-green',
  cancelada: 'badge-red',
}

const itemForm = reactive({ tipo: 'servico', servico_id: '', produto_id: '', quantidade: 1 })

const aberta = computed(() => comanda.value?.status === 'aberta')

async function loadComanda() {
  comanda.value = await comandasApi.get(route.params.id)
}

async function addItem() {
  error.value = ''
  try {
    await comandasApi.addItem(comanda.value.id, {
      tipo: itemForm.tipo,
      servico_id: itemForm.tipo === 'servico' ? itemForm.servico_id : null,
      produto_id: itemForm.tipo === 'produto' ? itemForm.produto_id : null,
      quantidade: itemForm.quantidade,
    })
    Object.assign(itemForm, { tipo: 'servico', servico_id: '', produto_id: '', quantidade: 1 })
    toastSuccess('Item adicionado.')
    await loadComanda()
  } catch (e) {
    error.value = e.response?.data?.message || 'Não foi possível adicionar o item.'
  }
}

async function removeItem(item) {
  try {
    await comandasApi.removeItem(comanda.value.id, item.id)
    toastSuccess('Item removido.')
    await loadComanda()
  } catch (e) {
    toastError(e.response?.data?.message || 'Não foi possível remover o item.')
  }
}

async function fechar() {
  fecharError.value = ''
  try {
    comanda.value = await comandasApi.fechar(comanda.value.id, formaPagamento.value)
    toastSuccess('Comanda fechada.')
  } catch (e) {
    fecharError.value = e.response?.data?.message || 'Não foi possível fechar a comanda.'
  }
}

function nomeItem(item) {
  return item.tipo === 'servico' ? item.servico?.nome : item.produto?.nome
}

onMounted(async () => {
  await Promise.all([
    loadComanda(),
    servicosApi.list().then(({ data }) => (servicos.value = data)),
    produtosApi.list().then(({ data }) => (produtos.value = data)),
  ])
})
</script>

<template>
  <div v-if="comanda">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h1 class="text-xl font-bold text-gray-800">
        <i class="fa-solid fa-receipt text-blue-600 me-2"></i>Comanda #{{ comanda.id }}
      </h1>
      <span :class="STATUS_BADGE[comanda.status] ?? 'badge-gray'">{{ comanda.status }}</span>
    </div>

    <div class="card p-4 mb-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
      <div>
        <span class="text-gray-500">Cliente:</span>
        <span class="font-medium text-gray-800 ms-1">{{ comanda.cliente.nome }}</span>
      </div>
      <div>
        <span class="text-gray-500">Barbeiro:</span>
        <span class="font-medium text-gray-800 ms-1">{{ comanda.barbeiro.user.name }}</span>
      </div>
      <div>
        <span class="text-gray-500">Total:</span>
        <span class="font-bold text-gray-800 ms-1">R$ {{ formatDecimal(comanda.valor_total) }}</span>
      </div>
    </div>

    <div class="card overflow-hidden mb-4">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="table-th">Item</th>
              <th class="table-th">Qtd</th>
              <th class="table-th">Preço unit.</th>
              <th class="table-th">Total</th>
              <th v-if="aberta" class="table-th text-end">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="item in comanda.itens" :key="item.id" class="hover:bg-gray-50">
              <td class="table-td font-medium text-gray-800">{{ nomeItem(item) }}</td>
              <td class="table-td">{{ item.quantidade }}</td>
              <td class="table-td">R$ {{ formatDecimal(item.preco_unitario) }}</td>
              <td class="table-td">R$ {{ formatDecimal(item.preco_total) }}</td>
              <td v-if="aberta" class="table-td text-end">
                <button type="button" class="btn-ghost-danger" @click="removeItem(item)">
                  <i class="fa-solid fa-trash"></i>Remover
                </button>
              </td>
            </tr>
            <tr v-if="comanda.itens.length === 0">
              <td :colspan="aberta ? 5 : 4" class="table-td text-center text-gray-500 py-8">
                Nenhum item na comanda.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="aberta" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="card p-4">
        <h2 class="font-semibold text-gray-800 mb-3">
          <i class="fa-solid fa-plus text-blue-600 me-2"></i>Adicionar item
        </h2>
        <form class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end" @submit.prevent="addItem">
          <div>
            <label class="form-label">Tipo</label>
            <select v-model="itemForm.tipo" class="form-select">
              <option value="servico">Serviço</option>
              <option value="produto">Produto</option>
            </select>
          </div>
          <div v-if="itemForm.tipo === 'servico'">
            <label class="form-label">Serviço</label>
            <select v-model="itemForm.servico_id" class="form-select" required>
              <option value="" disabled>Selecione</option>
              <option v-for="s in servicos" :key="s.id" :value="s.id">
                {{ s.nome }} (R$ {{ formatDecimal(s.preco) }})
              </option>
            </select>
          </div>
          <div v-else>
            <label class="form-label">Produto</label>
            <select v-model="itemForm.produto_id" class="form-select" required>
              <option value="" disabled>Selecione</option>
              <option v-for="p in produtos" :key="p.id" :value="p.id">
                {{ p.nome }} (R$ {{ formatDecimal(p.preco) }})
              </option>
            </select>
          </div>
          <div>
            <label class="form-label">Quantidade</label>
            <input v-model.number="itemForm.quantidade" type="number" min="1" class="form-input" />
          </div>
          <p v-if="error" class="sm:col-span-3 text-sm text-red-600">{{ error }}</p>
          <div class="sm:col-span-3">
            <button type="submit" class="btn-primary">
              <i class="fa-solid fa-plus"></i>Adicionar item
            </button>
          </div>
        </form>
      </div>

      <div class="card p-4">
        <h2 class="font-semibold text-gray-800 mb-3">
          <i class="fa-solid fa-cash-register text-blue-600 me-2"></i>Fechar comanda
        </h2>
        <form class="grid grid-cols-1 gap-3" @submit.prevent="fechar">
          <div>
            <label class="form-label">Forma de pagamento</label>
            <select v-model="formaPagamento" class="form-select">
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">Pix</option>
              <option value="cartao_debito">Cartão débito</option>
              <option value="cartao_credito">Cartão crédito</option>
            </select>
          </div>
          <p v-if="fecharError" class="text-sm text-red-600">{{ fecharError }}</p>
          <div>
            <button type="submit" class="btn-primary">
              <i class="fa-solid fa-check"></i>Fechar comanda
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
