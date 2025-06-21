export interface Expense {
  id: string;
  name: string;
  category: 'fixed' | 'subscription' | 'variable' | 'other';
  amount: number;
  // frequency might be useful for recurring expenses like rent (monthly, yearly)
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  dueDate?: Date; // For bills
  paymentDate?: Date; // When it was actually paid
}

// Specifically for subscriptions, which are a type of expense but might have more detail
export interface Subscription extends Expense {
  category: 'subscription'; // Override category
  renewalDate?: Date;
  serviceProvider?: string; // e.g., Netflix, Spotify
}
