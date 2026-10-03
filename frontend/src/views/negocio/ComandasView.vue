<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { comandasApi } from '../../api/negocio'
import { clientesApi, barbeirosApi } from '../../api/cadastro'
import { formatDecimal } from '../../utils/format'
import { toastSuccess } from '../../utils/alerts'
import AppModal from '../../components/AppModal.vue'

const router = useRouter()

const comandas = ref([])
const clientes = ref([])
const barbeiros = ref([])
const error = ref('')
const showModal = ref(false)

const STATUS_BADGE = {
  aberta: 'badge-blue',
  fechada: 'badge-green',
  cancelada: 'badge-red',
}

const form = reactive({ cliente_id: '', barbeiro_id: '' })

async function loadComandas() {
  const { data } = await comandasApi.list()
  comandas.value = data
}

function openCreate() {
  error.value = ''
  Object.assign(form, { cliente_id: '', barbeiro_id: '' })
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function handleSubmit() {
  error.value = ''
  try {
    const comanda = await comandasApi.create(form)
    toastSuccess('Comanda aberta.')
    router.push(`/comandas/${comanda.id}`)
  } catch (e) {
    error.value = e.response?.data?.message || 'Não foi possível abrir a comanda.'
  }
}

onMounted(async () => {
  await Promise.all([
    loadComandas(),
    clientesApi.list().then(({ data }) => (clientes.value = data)),
    barbeirosApi.list().then(({ data }) => (barbeiros.value = data)),
  ])
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold text-gray-800">
        <i class="fa-solid fa-receipt text-blue-600 me-2"></i>Comandas
      </h1>
      <button type="button" class="btn-primary" @click="openCreate">
        <i class="fa-solid fa-plus"></i>Comanda avulsa
      </button>
    </div>

    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="table-th">#</th>
              <th class="table-th">Cliente</th>
              <th class="table-th">Barbeiro</th>
              <th class="table-th">Total</th>
              <th class="table-th">Status</th>
              <th class="table-th text-end">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="comanda in comandas" :key="comanda.id" class="hover:bg-gray-50">
              <td class="table-td">{{ comanda.id }}</td>
              <td class="table-td font-medium text-gray-800">{{ comanda.cliente.nome }}</td>
              <td class="table-td">{{ comanda.barbeiro.user.name }}</td>
              <td class="table-td">R$ {{ formatDecimal(comanda.valor_total) }}</td>
              <td class="table-td">
                <span :class="STATUS_BADGE[comanda.status] ?? 'badge-gray'">
                  {{ comanda.status }}
                </span>
              </td>
              <td class="table-td text-end">
                <RouterLink :to="`/comandas/${comanda.id}`" class="btn-ghost">
                  <i class="fa-solid fa-arrow-up-right-from-square"></i>Abrir
                </RouterLink>
              </td>
            </tr>
            <tr v-if="comandas.length === 0">
              <td colspan="6" class="table-td text-center text-gray-500 py-8">
                Nenhuma comanda.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <AppModal :show="showModal" title="Abrir comanda avulsa" @close="closeModal">
      <form @submit.prevent="handleSubmit">
        <div class="p-4 grid grid-cols-1 gap-4">
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
          <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        </div>
        <div class="flex justify-end items-center gap-x-2 py-3 px-4 border-t border-gray-200">
          <button type="button" class="btn-white" @click="closeModal">Cancelar</button>
          <button type="submit" class="btn-primary">Abrir comanda</button>
        </div>
      </form>
    </AppModal>
  </div>
</template>
