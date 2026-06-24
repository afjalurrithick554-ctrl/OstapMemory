import { ref } from 'vue'

type PromptResolver = (value: string | null) => void;
type ConfirmResolver = (value: boolean) => void;

interface PromptState {
  isOpen: boolean
  message: string
  initialValue: string
  options?: Array<{label: string, value: string}>
  resolve: ((value: string | null) => void) | null
}

const promptState = ref<PromptState>({
  isOpen: false,
  message: '',
  initialValue: '',
  options: undefined,
  resolve: null
})

const confirmState = ref({
  isOpen: false,
  message: '',
  resolve: null as ConfirmResolver | null
})

export function useGlobalModals() {
  const showPrompt = (message: string, initialValue: string = '', options?: Array<{label: string, value: string}>): Promise<string | null> => {
    return new Promise((resolve) => {
      promptState.value = {
        isOpen: true,
        message,
        initialValue,
        options,
        resolve
      }
    })
  }

  const handlePromptClose = (value: string | null) => {
    promptState.value.isOpen = false
    if (promptState.value.resolve) {
      promptState.value.resolve(value)
      promptState.value.resolve = null
    }
  }

  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmState.value = {
        isOpen: true,
        message,
        resolve
      }
    })
  }

  const handleConfirmClose = (value: boolean) => {
    confirmState.value.isOpen = false
    if (confirmState.value.resolve) {
      confirmState.value.resolve(value)
      confirmState.value.resolve = null
    }
  }

  return {
    promptState,
    showPrompt,
    handlePromptClose,
    confirmState,
    showConfirm,
    handleConfirmClose
  }
}
