import { ref } from 'vue'
import { useGlobalModals } from './useGlobalModals'

export function useEntityAction(endpointPrefix: string) {
  const isProcessing = ref(false)
  const { showPrompt, showConfirm } = useGlobalModals()

  const renameEntity = async (id: string, currentName: string, nameField: string = 'name', onSuccess?: (newName: string) => void) => {
    const newName = await showPrompt(`Enter new name:`, currentName)
    if (!newName || newName === currentName) return

    isProcessing.value = true
    try {
      const res = await fetch(`http://localhost:3001/api/${endpointPrefix}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [nameField]: newName })
      })
      if (res.ok) {
        if (onSuccess) onSuccess(newName)
      } else {
        alert(`Failed to rename. Server responded with status: ${res.status}`)
      }
    } catch (err) {
      console.error(`Failed to rename entity in ${endpointPrefix}`, err)
      alert(`Failed to rename. Please check your connection.`)
    } finally {
      isProcessing.value = false
    }
  }

  const deleteEntity = async (id: string, currentName: string, onSuccess?: () => void) => {
    const confirmed = await showConfirm(`Are you sure you want to delete "${currentName}"?`)
    if (!confirmed) return

    isProcessing.value = true
    try {
      const res = await fetch(`http://localhost:3001/api/${endpointPrefix}/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        if (onSuccess) onSuccess()
      } else {
        alert(`Failed to delete. Server responded with status: ${res.status}`)
      }
    } catch (err) {
      console.error(`Failed to delete entity in ${endpointPrefix}`, err)
      alert(`Failed to delete. Please check your connection.`)
    } finally {
      isProcessing.value = false
    }
  }

  return {
    isProcessing,
    renameEntity,
    deleteEntity
  }
}
