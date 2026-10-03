<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { authState, logout } from '../stores/auth'

const router = useRouter()

const menu = [
  { to: '/', label: 'Dashboard', icon: 'fa-solid fa-house', exact: true },
  { to: '/agenda', label: 'Agenda', icon: 'fa-solid fa-calendar-days' },
  { to: '/comandas', label: 'Comandas', icon: 'fa-solid fa-receipt' },
  { to: '/financeiro', label: 'Financeiro', icon: 'fa-solid fa-coins' },
  { to: '/clientes', label: 'Clientes', icon: 'fa-solid fa-users' },
  { to: '/barbeiros', label: 'Barbeiros', icon: 'fa-solid fa-scissors' },
  { to: '/servicos', label: 'Serviços', icon: 'fa-solid fa-bell-concierge' },
  { to: '/produtos', label: 'Produtos', icon: 'fa-solid fa-box-open' },
]

const linkBase =
  'flex items-center gap-x-3 py-2 px-2.5 text-sm rounded-lg focus:outline-hidden'
const linkActive = 'bg-gray-100 text-gray-800 font-medium'
const linkInactive = 'text-gray-700 hover:bg-gray-100 focus:bg-gray-100'

const initials = computed(() =>
  (authState.user?.name ?? '')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
)

// No mobile a sidebar é um offcanvas Preline — fecha ao navegar por um item.
function closeSidebar() {
  const el = document.getElementById('app-sidebar')
  if (el && el.classList.contains('open')) window.HSOverlay?.close?.(el)
}

function onNavigate(event, navigate) {
  navigate(event)
  closeSidebar()
}

async function handleLogout() {
  await logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen">
    <!-- Header -->
    <header class="sticky top-0 inset-x-0 z-40 w-full bg-white border-b border-gray-200 lg:ps-64">
      <nav class="px-4 sm:px-6 flex items-center w-full py-2.5">
        <div class="lg:hidden flex items-center gap-x-2 me-4">
          <button
            type="button"
            class="btn-ghost"
            aria-controls="app-sidebar"
            aria-label="Abrir menu"
            data-hs-overlay="#app-sidebar"
          >
            <i class="fa-solid fa-bars"></i>
          </button>
          <span class="font-semibold text-gray-800">Agenda</span>
        </div>

        <div class="flex items-center gap-x-3 ms-auto">
          <span
            class="inline-flex items-center justify-center size-9 rounded-full bg-blue-600 text-white text-sm font-semibold"
          >
            {{ initials }}
          </span>
          <span class="hidden sm:block text-sm font-medium text-gray-800">
            {{ authState.user?.name }}
          </span>
          <button type="button" class="btn-ghost" title="Sair" @click="handleLogout">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
            <span class="hidden sm:inline">Sair</span>
          </button>
        </div>
      </nav>
    </header>

    <!-- Sidebar -->
    <div
      id="app-sidebar"
      class="hs-overlay [--auto-close:lg] hs-overlay-open:translate-x-0 -translate-x-full transition-all duration-300 transform hidden fixed inset-y-0 start-0 z-60 w-64 bg-white border-e border-gray-200 lg:block lg:translate-x-0 lg:end-auto lg:bottom-0"
      role="dialog"
      tabindex="-1"
      aria-label="Menu lateral"
    >
      <div class="relative flex flex-col h-full max-h-full">
        <div class="px-6 pt-5 pb-3 flex items-center gap-x-2">
          <span
            class="inline-flex items-center justify-center size-8 rounded-lg bg-blue-600 text-white"
          >
            <i class="fa-solid fa-scissors text-sm"></i>
          </span>
          <span class="font-bold text-lg text-gray-800">Barbearia</span>
        </div>

        <nav class="h-full overflow-y-auto p-3">
          <ul class="flex flex-col gap-y-1">
            <li v-for="item in menu" :key="item.to">
              <RouterLink :to="item.to" custom v-slot="{ href, navigate, isActive, isExactActive }">
                <a
                  :href="href"
                  :class="[linkBase, (item.exact ? isExactActive : isActive) ? linkActive : linkInactive]"
                  @click="onNavigate($event, navigate)"
                >
                  <i :class="item.icon" class="w-4 text-center text-gray-500"></i>
                  {{ item.label }}
                </a>
              </RouterLink>
            </li>
          </ul>
        </nav>
      </div>
    </div>

    <!-- Conteúdo -->
    <main class="w-full lg:ps-64">
      <div class="p-4 sm:p-6">
        <router-view />
      </div>
    </main>
  </div>
</template>
