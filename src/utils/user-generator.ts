export interface GeneratedUserData {
  displayName: string;
  username: string;
}

function generateRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDisplayName(): string {
  const timestamp = Date.now();
  return `User ${timestamp.toString().slice(-6)}`;
}

function generateUsername(displayName: string): string {
  const cleanName = displayName
    .toLowerCase()
    .replace(/\s+/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  return `user${generateRandomNumber(10000, 99999)}`;
}

export function generateRandomUserData(): GeneratedUserData {
  const timestamp = Date.now().toString().slice(-6);
  const displayName = `User ${timestamp}`;
  const username = `user${timestamp}`;

  return {
    displayName,
    username
  };
}

export function generateUsernameFromWallet(walletAddress: string): string {
  const lastFour = walletAddress.slice(-4);
  return `user${lastFour}`;
}

export function generateDisplayNameFromEmail(email: string): string {
  const emailPrefix = email.split('@')[0];
  
  if (emailPrefix.length >= 3) {
    const cleanPrefix = emailPrefix
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 15);
    
    if (cleanPrefix.length >= 3) {
      return cleanPrefix.charAt(0).toUpperCase() + cleanPrefix.slice(1);
    }
  }
  
  const timestamp = Date.now().toString().slice(-6);
  return `User ${timestamp}`;
} 