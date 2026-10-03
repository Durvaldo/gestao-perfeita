import { createApp } from 'vue'
import './style.css'
import 'preline'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
