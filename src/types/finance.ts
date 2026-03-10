export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string;
  amount: number;
  description: string;
  notes?: string;
  type: 'income' | 'expense' | 'transfer';
  date: Date | string;
  isRecurring?: boolean;
  recurringType?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurringEndDate?: Date | string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit_card' | 'investment';
  balance: number;
  color: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon?: string;
  parentId?: string;
  createdAt?: Date;
  updatedAt?: Date;
} 