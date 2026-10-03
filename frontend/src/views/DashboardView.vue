<script setup>
import { computed, onMounted, ref } from 'vue'
import { authState } from '../stores/auth'
import { dashboardApi } from '../api/negocio'
import { formatDate, formatDecimal } from '../utils/format'
import VChart from '../echarts'

const dados = ref(null)

// Barras horizontais: inverte a ordem para o maior valor ficar no topo.
function barOption(items, labelKey, valueKey, { currency = false } = {}) {
  const data = [...items].reverse()
  return {
    // ECharts 6 já contém os rótulos dos eixos por padrão (containLabel foi descontinuado)
    grid: { left: 8, right: 32, top: 8, bottom: 8 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (v) => (currency ? `R$ ${formatDecimal(v)}` : String(v)),
    },
    xAxis: {
      type: 'value',
      axisLabel: currency ? { formatter: (v) => `R$ ${formatDecimal(v, 0)}` } : {},
    },
    yAxis: {
      type: 'category',
      data: data.map((i) => i[labelKey]),
      axisLabel: { width: 110, overflow: 'truncate' },
    },
    series: [
      {
        type: 'bar',
        data: data.map((i) => Number(i[valueKey])),
        itemStyle: { color: '#2563eb', borderRadius: [0, 4, 4, 0] },
        barMaxWidth: 22,
      },
    ],
  }
}

const rankingBarbeiros = computed(() =>
  dados.value ? barOption(dados.value.ranking_barbeiros, 'nome', 'faturamento_total', { currency: true }) : null
)
const servicosMaisVendidos = computed(() =>
  dados.value ? barOption(dados.value.servicos_mais_vendidos, 'nome', 'quantidade_total') : null
)
const produtosMaisVendidos = computed(() =>
  dados.value ? barOption(dados.value.produtos_mais_vendidos, 'nome', 'quantidade_total') : null
)

onMounted(async () => {
  dados.value = await dashboardApi.get()
})
</script>

<template>
  <div>
    <h1 class="text-xl font-bold text-gray-800 mb-4">
      <i class="fa-solid fa-house text-blue-600 me-2"></i>Bem-vindo, {{ authState.user?.name }}
    </h1>

    <div v-if="dados" class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <div class="card p-4">
        <h2 class="font-semibold text-gray-800 mb-3">
          <i class="fa-solid fa-ranking-star text-blue-600 me-2"></i>Ranking de barbeiros
        </h2>
        <div v-if="dados.ranking_barbeiros.length" class="h-64">
          <VChart :option="rankingBarbeiros" autoresize />
        </div>
        <p v-else class="text-sm text-gray-500">Sem dados no período.</p>
      </div>

      <div class="card p-4">
        <h2 class="font-semibold text-gray-800 mb-3">
          <i class="fa-solid fa-bell-concierge text-blue-600 me-2"></i>Serviços mais vendidos
        </h2>
        <div v-if="dados.servicos_mais_vendidos.length" class="h-64">
          <VChart :option="servicosMaisVendidos" autoresize />
        </div>
        <p v-else class="text-sm text-gray-500">Sem dados no período.</p>
      </div>

      <div class="card p-4">
        <h2 class="font-semibold text-gray-800 mb-3">
          <i class="fa-solid fa-box-open text-blue-600 me-2"></i>Produtos mais vendidos
        </h2>
        <div v-if="dados.produtos_mais_vendidos.length" class="h-64">
          <VChart :option="produtosMaisVendidos" autoresize />
        </div>
        <p v-else class="text-sm text-gray-500">Sem dados no período.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div class="card p-4">
          <h2 class="font-semibold text-gray-800 mb-3">
            <i class="fa-solid fa-user-check text-blue-600 me-2"></i>Clientes mais frequentes
          </h2>
          <ul class="divide-y divide-gray-200">
            <li
              v-for="c in dados.clientes_mais_frequentes"
              :key="c.cliente_id"
              class="py-2 flex items-center justify-between text-sm"
            >
              <span class="text-gray-800">{{ c.nome }}</span>
              <span class="badge-blue">{{ c.total_atendimentos }}</span>
            </li>
            <li v-if="dados.clientes_mais_frequentes.length === 0" class="py-2 text-sm text-gray-500">
              Sem dados.
            </li>
          </ul>
        </div>

        <div class="card p-4">
          <h2 class="font-semibold text-gray-800 mb-3">
            <i class="fa-solid fa-cake-candles text-blue-600 me-2"></i>Próximos aniversários
          </h2>
          <ul class="divide-y divide-gray-200">
            <li
              v-for="a in dados.proximos_aniversarios"
              :key="a.cliente_id"
              class="py-2 flex items-center justify-between text-sm"
            >
              <span class="text-gray-800">{{ a.nome }}</span>
              <span class="text-gray-500">{{ formatDate(a.data_nascimento) }}</span>
            </li>
            <li v-if="dados.proximos_aniversarios.length === 0" class="py-2 text-sm text-gray-500">
              Sem dados.
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div v-else class="card p-8 text-center text-gray-500">
      <i class="fa-solid fa-spinner fa-spin me-2"></i>Carregando...
    </div>
  </div>
</template>
