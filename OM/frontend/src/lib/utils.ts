import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Хелпер shadcn-vue для объединения классов Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
