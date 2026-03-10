import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function formatCurrencyInput(value: string) {
  const numbers = value.replace(/\D/g, '');
  const amount = parseInt(numbers || '0') / 100;
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
}

export function parseCurrencyInput(value: string) {
  const numbers = value.replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(numbers || '0');
}
