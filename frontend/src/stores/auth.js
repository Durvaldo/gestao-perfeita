import { reactive } from 'vue'
import api from '../api/axios'

export const authState = reactive({
  user: null,
  checked: false,
})

export async function fetchUser() {
  try {
    const { data } = await api.get('/api/user')
    authState.user = data
  } catch {
    authState.user = null
  } finally {
    authState.checked = true
  }
}

export async function login({ email, password }) {
  await api.get('/sanctum/csrf-cookie')
  await api.post('/login', { email, password })
  await fetchUser()
}

export async function register({ name, email, password, password_confirmation }) {
  await api.get('/sanctum/csrf-cookie')
  await api.post('/register', { name, email, password, password_confirmation })
  await fetchUser()
}

export async function logout() {
  await api.post('/logout')
  authState.user = null
}
