import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a vendor ID in the format AA4563 (2 uppercase letters + 4 numbers)
 * @returns A vendor ID string like "AA4563", "QX4012", etc.
 */
export function generateVendorId(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  // Generate 2 random uppercase letters
  const letter1 = letters[Math.floor(Math.random() * letters.length)];
  const letter2 = letters[Math.floor(Math.random() * letters.length)];
  
  // Generate 4 random numbers
  const num1 = numbers[Math.floor(Math.random() * numbers.length)];
  const num2 = numbers[Math.floor(Math.random() * numbers.length)];
  const num3 = numbers[Math.floor(Math.random() * numbers.length)];
  const num4 = numbers[Math.floor(Math.random() * numbers.length)];
  
  return `${letter1}${letter2}${num1}${num2}${num3}${num4}`;
}

/**
 * Generates a payout ID in the format PYT13947473 (PYT + 8 numbers)
 * @returns A payout ID string like "PYT13947473", "PYT98765432", etc.
 */
export function generatePayoutId(): string {
  const numbers = '0123456789';
  
  // Generate 8 random numbers
  let payoutNumber = '';
  for (let i = 0; i < 8; i++) {
    payoutNumber += numbers[Math.floor(Math.random() * numbers.length)];
  }
  
  return `PYT${payoutNumber}`;
}
