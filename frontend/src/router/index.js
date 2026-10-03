import { createRouter, createWebHistory } from 'vue-router'
import { authState, fetchUser } from '../stores/auth'
import AppLayout from '../components/AppLayout.vue'
import LoginView from '../views/LoginView.vue'
import ClientesView from '../views/cadastro/ClientesView.vue'
import BarbeirosView from '../views/cadastro/BarbeirosView.vue'
import ServicosView from '../views/cadastro/ServicosView.vue'
import ProdutosView from '../views/cadastro/ProdutosView.vue'
import AgendaView from '../views/negocio/AgendaView.vue'
import ComandasView from '../views/negocio/ComandasView.vue'
import ComandaDetailView from '../views/negocio/ComandaDetailView.vue'
import FinanceiroView from '../views/negocio/FinanceiroView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginView, meta: { guest: true } },
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        // lazy: mantém o ECharts fora do bundle inicial
        { path: '', name: 'dashboard', component: () => import('../views/DashboardView.vue') },
        { path: 'clientes', name: 'clientes', component: ClientesView },
        { path: 'barbeiros', name: 'barbeiros', component: BarbeirosView },
        { path: 'servicos', name: 'servicos', component: ServicosView },
        { path: 'produtos', name: 'produtos', component: ProdutosView },
        { path: 'agenda', name: 'agenda', component: AgendaView },
        { path: 'comandas', name: 'comandas', component: ComandasView },
        { path: 'comandas/:id', name: 'comanda-detail', component: ComandaDetailView },
        { path: 'financeiro', name: 'financeiro', component: FinanceiroView },
      ],
    },
  ],
})

// Preline não reinicializa sozinho os componentes interativos (dropdown, modal,
// sidebar) quando o Vue Router troca de rota numa SPA — precisa do autoInit manual.
router.afterEach((to, from, failure) => {
  if (!failure) setTimeout(() => window.HSStaticMethods?.autoInit(), 100)
})

router.beforeEach(async (to) => {
  if (!authState.checked) {
    await fetchUser()
  }

  if (to.meta.requiresAuth && !authState.user) {
    return { name: 'login' }
  }

  if (to.meta.guest && authState.user) {
    return { name: 'dashboard' }
  }
})

export default router
