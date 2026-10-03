<script setup>
defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: '' },
  maxWidth: { type: String, default: 'max-w-lg' },
})

const emit = defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-80 overflow-y-auto" role="dialog" aria-modal="true">
      <div class="fixed inset-0 bg-gray-900/50" @click="emit('close')"></div>
      <div class="relative min-h-full flex items-center justify-center p-4">
        <div class="relative w-full bg-white border border-gray-200 rounded-xl shadow-lg" :class="maxWidth">
          <div class="flex justify-between items-center py-3 px-4 border-b border-gray-200">
            <h3 class="font-bold text-gray-800">{{ title }}</h3>
            <button
              type="button"
              class="size-8 inline-flex justify-center items-center rounded-full text-gray-500 hover:bg-gray-100 focus:outline-hidden focus:bg-gray-100"
              aria-label="Fechar"
              @click="emit('close')"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
