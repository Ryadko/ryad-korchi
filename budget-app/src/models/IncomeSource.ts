export interface IncomeSource {
  id: string;
  name: string;
  category: 'salary' | 'freelance' | 'rent' | 'investment' | 'other';
  amount: number;
  // Date might be useful for tracking when an income was received or started
  date?: Date;
}
