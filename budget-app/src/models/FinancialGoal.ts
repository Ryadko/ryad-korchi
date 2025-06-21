export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number; // Amount saved so far towards this goal
  targetDate?: Date;
  // priority could be useful if there are multiple goals
  priority?: 'low' | 'medium' | 'high';
  description?: string;
}
