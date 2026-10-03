<script setup>
import { ref, watch } from 'vue'
import { formatDecimal, parseDecimal } from '../utils/format'

const props = defineProps({
  modelValue: { type: [Number, String, null], default: null },
  min: { type: [Number, String], default: undefined },
  max: { type: [Number, String], default: undefined },
  required: { type: Boolean, default: false },
  decimals: { type: Number, default: 2 },
})
const emit = defineEmits(['update:modelValue'])

const text = ref(formatDecimal(props.modelValue, props.decimals))

watch(() => props.modelValue, (newVal) => {
  const parsedCurrent = parseDecimal(text.value)
  if (newVal !== parsedCurrent) {
    text.value = formatDecimal(newVal, props.decimals)
  }
})

function onBlur() {
  const parsed = parseDecimal(text.value)
  text.value = formatDecimal(parsed, props.decimals)
  emit('update:modelValue', parsed)
}
</script>

<template>
  <input
    type="text"
    inputmode="decimal"
    v-model="text"
    :min="min"
    :max="max"
    :required="required"
    @blur="onBlur"
  />
</template>
