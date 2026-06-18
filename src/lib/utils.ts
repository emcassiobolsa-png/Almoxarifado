import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | Date | undefined | null) {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Cuiaba'
  }).format(d);
}

export function getCurrentCuiabaTimestamp() {
  const localIso = new Date().toLocaleString('sv-SE', { timeZone: 'America/Cuiaba' }).replace(' ', 'T');
  return `${localIso}-04:00`;
}

export function getCuiabaDateString(dateToConvert?: string) {
  const d = dateToConvert ? new Date(dateToConvert) : new Date();
  return d.toLocaleString('sv-SE', { timeZone: 'America/Cuiaba' }).split(' ')[0];
}

export function maskCPFCNPJ(value: string) {
  const cleanValue = value.replace(/\D/g, '');
  if (cleanValue.length <= 11) {
    return cleanValue
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  } else {
    return cleanValue
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  }
}

export function maskPhone(value: string) {
  const cleanValue = value.replace(/\D/g, '');
  if (cleanValue.length <= 10) {
    return cleanValue
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  } else {
    return cleanValue
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  }
}

export function maskCurrency(value: string | number) {
  let cleanValue = String(value).replace(/\D/g, '');
  if (cleanValue === '') return '';
  
  const options = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  const floatValue = parseFloat(cleanValue) / 100;
  return new Intl.NumberFormat('pt-BR', options).format(floatValue);
}

export function parseCurrencyToNumber(value: string | number) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const digits = value.replace(/\D/g, '');
  if (!digits) return 0;
  return parseFloat(digits) / 100;
}
