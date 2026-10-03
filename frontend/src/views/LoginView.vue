<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../stores/auth'

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const router = useRouter()

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    await login({ email: email.value, password: password.value })
    router.push('/')
  } catch (e) {
    error.value = e.response?.data?.message || 'Falha ao entrar. Verifique suas credenciais.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="w-full max-w-sm card p-6 sm:p-8">
      <div class="text-center mb-6">
        <span
          class="inline-flex items-center justify-center size-12 rounded-xl bg-blue-600 text-white mb-3"
        >
          <i class="fa-solid fa-scissors"></i>
        </span>
        <h1 class="text-2xl font-bold text-gray-800">Agenda da Barbearia</h1>
        <p class="text-sm text-gray-500 mt-1">Entre com sua conta para continuar</p>
      </div>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label class="form-label">E-mail</label>
          <input v-model="email" type="email" class="form-input" required autocomplete="username" />
        </div>
        <div>
          <label class="form-label">Senha</label>
          <input
            v-model="password"
            type="password"
            class="form-input"
            required
            autocomplete="current-password"
          />
        </div>

        <div
          v-if="error"
          class="flex items-center gap-x-2 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg p-3"
        >
          <i class="fa-solid fa-circle-exclamation"></i>
          {{ error }}
        </div>

        <button type="submit" class="btn-primary w-full justify-center" :disabled="loading">
          <i v-if="loading" class="fa-solid fa-spinner fa-spin"></i>
          <i v-else class="fa-solid fa-arrow-right-to-bracket"></i>
          {{ loading ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>
    </div>
  </div>
</template>
