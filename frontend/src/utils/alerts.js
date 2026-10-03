import Swal from 'sweetalert2'

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
})

export function toastSuccess(message) {
  toast.fire({ icon: 'success', title: message })
}

export function toastError(message) {
  toast.fire({ icon: 'error', title: message })
}

/**
 * Confirmação genérica de ação destrutiva. Retorna true se o usuário confirmou.
 */
export async function confirmAction(message, { confirmText = 'Confirmar', cancelText = 'Voltar' } = {}) {
  const result = await Swal.fire({
    title: 'Tem certeza?',
    text: message,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: '#dc2626',
    reverseButtons: true,
  })
  return result.isConfirmed
}

/**
 * Substitui window.confirm() nas exclusões. Retorna true se o usuário confirmou.
 */
export function confirmDelete(message) {
  return confirmAction(message, { confirmText: 'Excluir', cancelText: 'Cancelar' })
}
