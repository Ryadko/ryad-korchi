import { CalculationService } from './CalculationService';
import { Investment, Expense, FinancialGoal, IncomeSource } from '../models';

describe('CalculationService', () => {
  // Test calculateInvestmentProfitLoss
  describe('calculateInvestmentProfitLoss', () => {
    it('should correctly calculate profit', () => {
      const investment: Investment = { id: '1', name: 'Test Stock', initialAmount: 100, currentValue: 150, startDate: new Date() };
      expect(CalculationService.calculateInvestmentProfitLoss(investment)).toBe(50);
    });

    it('should correctly calculate loss', () => {
      const investment: Investment = { id: '1', name: 'Test Stock', initialAmount: 100, currentValue: 70, startDate: new Date() };
      expect(CalculationService.calculateInvestmentProfitLoss(investment)).toBe(-30);
    });

    it('should return 0 if initial and current value are the same', () => {
      const investment: Investment = { id: '1', name: 'Test Stock', initialAmount: 100, currentValue: 100, startDate: new Date() };
      expect(CalculationService.calculateInvestmentProfitLoss(investment)).toBe(0);
    });
  });

  // Test simulateInvestmentCurrentValue - basic checks as it's random
  describe('simulateInvestmentCurrentValue', () => {
    it('should return a positive value for positive initial investment', () => {
      const value = CalculationService.simulateInvestmentCurrentValue(1000, new Date(2023, 0, 1), "SimStock");
      expect(value).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for zero initial investment', () => {
      const value = CalculationService.simulateInvestmentCurrentValue(0, new Date(2023, 0, 1), "SimStockZero");
      expect(value).toBe(0);
    });

    it('should return initial value if start date is today or in the future', () => {
        const today = new Date();
        const initialValue = 100;
        // Note: The simulation logic gives initialValue * 0.1 if daysHeld is 0 and it hits the Math.max(initialValue * 0.1, currentValue)
        // The current logic for daysHeld can be 0 if startDate is today.
        // Let's test for a future date explicitly or ensure daysHeld is handled.
        // The CalculationService's daysHeld is Math.max(0, ...), so for future/today it's 0.
        // If daysHeld = 0, loop doesn't run, currentValue = initialValue.
        // The Math.max(initialValue * 0.1, currentValue) will then return initialValue if initialValue > initialValue * 0.1
        // Which is true for positive initialValue.
        let value = CalculationService.simulateInvestmentCurrentValue(initialValue, today, "SimStockToday");
        expect(value).toBe(initialValue);

        const futureDate = new Date(today.getFullYear() + 1, 0, 1);
        value = CalculationService.simulateInvestmentCurrentValue(initialValue, futureDate, "SimStockFuture");
        expect(value).toBe(initialValue);
    });
  });

  // Test calculateTotalMonthlyExpenses
  describe('calculateTotalMonthlyExpenses', () => {
    it('should sum up monthly expenses correctly', () => {
      const expenses: Expense[] = [
        { id: '1', name: 'Rent', amount: 1000, category: 'fixed', frequency: 'monthly' },
        { id: '2', name: 'Groceries', amount: 100, category: 'variable', frequency: 'weekly' }, // 400
        { id: '3', name: 'Insurance', amount: 600, category: 'fixed', frequency: 'yearly' }, // 50
        { id: '4', name: 'Coffee', amount: 5, category: 'variable', frequency: 'daily' }, // 150
        { id: '5', name: 'Netflix', amount: 10, category: 'subscription', frequency: 'monthly' },
        { id: '6', name: 'One-off', amount: 100, category: 'other', frequency: 'once' }, // Ignored in monthly sum
      ];
      // Expected: 1000 (Rent) + (100*4) (Groceries) + (600/12) (Insurance) + (5*30) (Coffee) + 10 (Netflix) = 1000 + 400 + 50 + 150 + 10 = 1610
      expect(CalculationService.calculateTotalMonthlyExpenses(expenses)).toBe(1610);
    });
    it('should return 0 for no expenses', () => {
        expect(CalculationService.calculateTotalMonthlyExpenses([])).toBe(0);
    });
  });

  // Test calculateTotalMonthlyIncome
  describe('calculateTotalMonthlyIncome', () => {
    it('should sum up monthly income', () => {
      const incomes: IncomeSource[] = [
        { id: '1', name: 'Salary', amount: 3000, category: 'salary' },
        { id: '2', name: 'Freelance', amount: 500, category: 'freelance' },
      ];
      expect(CalculationService.calculateTotalMonthlyIncome(incomes)).toBe(3500);
    });
  });

  // Test projectFinancialGoal
  describe('projectFinancialGoal', () => {
    const goal: FinancialGoal = { id: 'g1', name: 'Vacation', targetAmount: 2400, currentAmount: 0 };
    it('should calculate months to goal correctly with positive savings', () => {
      const projection = CalculationService.projectFinancialGoal(2000, 1600, goal); // 400 savings
      // 2400 / 400 = 6 months
      expect(projection.monthsToGoal).toBe(6);
      expect(projection.projectedMonthlySavings).toBe(400);
    });

    it('should return N/A if savings are not positive', () => {
      const projection = CalculationService.projectFinancialGoal(1500, 1600, goal); // -100 savings
      expect(projection.monthsToGoal).toBe("N/A (Savings are not positive)");
      expect(projection.projectedMonthlySavings).toBe(-100);
    });

    it('should return 0 months if goal already reached', () => {
      const reachedGoal: FinancialGoal = { id: 'g2', name: 'Done Deal', targetAmount: 1000, currentAmount: 1000 };
      const projection = CalculationService.projectFinancialGoal(2000, 1500, reachedGoal);
      expect(projection.monthsToGoal).toBe(0);
    });
  });

  // Test getSavingsAdvice
  describe('getSavingsAdvice', () => {
    const expenses: Expense[] = [
        { id: '1', name: 'Dining Out', amount: 200, category: 'variable', frequency: 'monthly' },
        { id: '2', name: 'Hobbies', amount: 150, category: 'other', frequency: 'monthly' },
        { id: '3', name: 'Rent', amount: 1000, category: 'fixed', frequency: 'monthly' },
    ];
    it('should advise to cut spending if expenses exceed income', () => {
      const advice = CalculationService.getSavingsAdvice(1200, 1350, expenses);
      expect(advice).toContain("Your expenses currently exceed or match your income.");
    });

    it('should give positive feedback and suggest cutting largest variable expense', () => {
      const advice = CalculationService.getSavingsAdvice(2000, 1350, expenses); // Surplus 650
      expect(advice).toContain("You have a monthly surplus of 650.00€.");
      // Largest variable is Dining Out (200), 10% is 20
      expect(advice).toContain('Consider reducing your spending on "Dining Out" by 20.00€');
    });

    it('should give general advice if no variable expenses to cut', () => {
        const fixedExpenses: Expense[] = [{ id: '3', name: 'Rent', amount: 1000, category: 'fixed', frequency: 'monthly' }];
        const advice = CalculationService.getSavingsAdvice(2000, 1000, fixedExpenses);
        expect(advice).toContain("Keep track of your spending to maintain this positive trend.");
    });
  });
});
