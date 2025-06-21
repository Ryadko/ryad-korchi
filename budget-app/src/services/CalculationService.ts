import { Investment, Expense, FinancialGoal, IncomeSource } from '../models';

export class CalculationService {
  /**
   * Calculates the profit or loss for a single investment.
   * @param investment The investment to calculate profit/loss for.
   * @returns The profit or loss amount.
   */
  static calculateInvestmentProfitLoss(investment: Investment): number {
    return investment.currentValue - investment.initialAmount;
  }

  /**
   * Simulates the current value of an investment with slightly more nuance.
   * This remains a basic simulation and is not reflective of real market behavior.
   * @param initialValue The initial value of the investment.
   * @param startDate The date the investment was made.
   * @param investmentName Used as a seed for slightly different behavior per investment.
   * @returns The simulated current value.
   */
  static simulateInvestmentCurrentValue(initialValue: number, startDate: Date, investmentName: string = ""): number {
    if (initialValue <= 0) return 0; // Cannot simulate for non-positive initial value

    const daysHeld = Math.max(0, (new Date().getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24));

    // Use the investment name to seed a pseudo-random "character" for the stock
    // This gives slightly different behavior for different named investments.
    let seed = 0;
    for (let i = 0; i < investmentName.length; i++) {
      seed += investmentName.charCodeAt(i);
    }
    const pseudoRandomFactor = (seed % 100) / 100; // Factor between 0 and 0.99

    // Base trend: slightly positive on average, influenced by pseudoRandomFactor
    // e.g., can range from -0.01% to +0.05% daily trend before volatility
    const baseDailyTrend = (pseudoRandomFactor * 0.0006) - 0.0001; // Small positive or negative trend

    // Volatility: how much the price can swing, also influenced by pseudoRandomFactor
    // e.g., can range from 0.5% to 1.5% max daily swing
    const volatilityFactor = 0.005 + (pseudoRandomFactor * 0.01);

    let currentValue = initialValue;

    for (let i = 0; i < daysHeld; i++) {
      // Daily random change: (Math.random() - 0.5) gives range -0.5 to 0.5
      // Multiply by 2 to get range -1 to 1, then by volatilityFactor
      const randomFluctuation = (Math.random() - 0.5) * 2 * volatilityFactor;
      const dailyChangePercent = baseDailyTrend + randomFluctuation;
      currentValue *= (1 + dailyChangePercent);
      // Ensure value doesn't go below a very small fraction of initial value (e.g. 10%) in this simulation
      // or just simply not below zero.
      currentValue = Math.max(initialValue * 0.1, currentValue);
    }

    // Ensure value doesn't go below zero in this simple simulation
    return Math.max(0, parseFloat(currentValue.toFixed(2)));
  }

  /**
   * Calculates the total monthly expenses.
   * @param expenses An array of all expenses.
   * @param subscriptions An array of all subscriptions (treated as monthly).
   * @returns The total monthly expense amount.
   */
  static calculateTotalMonthlyExpenses(expenses: Expense[]): number {
    let total = 0;
    expenses.forEach(expense => {
      switch (expense.frequency) {
        case 'monthly':
          total += expense.amount;
          break;
        case 'yearly':
          total += expense.amount / 12;
          break;
        case 'weekly':
          total += expense.amount * 4; // Approximate
          break;
        case 'daily':
          total += expense.amount * 30; // Approximate
          break;
        case 'once':
          // For 'once', it depends on the context. If we're calculating for *this* month,
          // we might only include it if the paymentDate is this month.
          // For simplicity here, 'once' expenses are not automatically part of a recurring monthly total unless specified.
          break;
        default:
          // If frequency is not set, or 'variable'/'other', we can't easily include it in a monthly sum
          // unless it has a paymentDate within the current month.
          // This logic might need refinement based on how users input 'variable' expenses.
          break;
      }
    });
    return parseFloat(total.toFixed(2));
  }

  /**
   * Calculates total monthly income.
   * @param incomeSources An array of all income sources.
   * @returns The total monthly income.
   */
  static calculateTotalMonthlyIncome(incomeSources: IncomeSource[]): number {
    // Assuming all income sources amounts are per month for now.
    // This could be expanded with frequency like expenses.
    return incomeSources.reduce((acc, income) => acc + income.amount, 0);
  }

  /**
   * Generates financial projections based on income, expenses, and goals.
   * This is a simplified projection.
   * @param totalMonthlyIncome Total monthly income.
   * @param totalMonthlyExpenses Total monthly expenses.
   * @param financialGoal The financial goal to project towards.
   * @param currentSavings The current amount saved towards the goal.
   * @returns A projection object with monthsToGoal and projectedSavingsPerMonth.
   */
  static projectFinancialGoal(
    totalMonthlyIncome: number,
    totalMonthlyExpenses: number,
    financialGoal: FinancialGoal,
    currentSavings: number = 0 // Could also be financialGoal.currentAmount
  ): { monthsToGoal: number | string; projectedMonthlySavings: number } {
    const projectedMonthlySavings = totalMonthlyIncome - totalMonthlyExpenses;

    if (projectedMonthlySavings <= 0) {
      return { monthsToGoal: "N/A (Savings are not positive)", projectedMonthlySavings };
    }

    const remainingAmountNeeded = financialGoal.targetAmount - (currentSavings || financialGoal.currentAmount);
    if (remainingAmountNeeded <= 0) {
      return { monthsToGoal: 0, projectedMonthlySavings }; // Goal already reached
    }

    const monthsToGoal = Math.ceil(remainingAmountNeeded / projectedMonthlySavings);
    return { monthsToGoal, projectedMonthlySavings };
  }

  /**
   * Provides simple, personalized savings advice.
   * @param totalMonthlyIncome Total monthly income.
   * @param totalMonthlyExpenses Total monthly expenses.
   * @param expenses List of expenses to find potential savings.
   * @returns A string with savings advice, or a default message.
   */
  static getSavingsAdvice(
    totalMonthlyIncome: number,
    totalMonthlyExpenses: number,
    expenses: Expense[]
  ): string {
    const monthlySurplus = totalMonthlyIncome - totalMonthlyExpenses;

    if (monthlySurplus <= 0) {
      return "Your expenses currently exceed or match your income. Review your spending for potential cuts.";
    }

    let advice = `You have a monthly surplus of ${monthlySurplus.toFixed(2)}€. Good job! `;

    // Simple advice: find the largest non-'fixed' expense that could be reduced.
    const variableExpenses = expenses
        .filter(e => e.category === 'variable' || e.category === 'other' || e.category === 'subscription')
        .sort((a, b) => b.amount - a.amount);

    if (variableExpenses.length > 0) {
        const largestVariableExpense = variableExpenses[0];
        const potentialSaving = (largestVariableExpense.amount * 0.1).toFixed(2); // Suggest reducing by 10%
        advice += `Consider reducing your spending on "${largestVariableExpense.name}" by ${potentialSaving}€ to save even more.`;
    } else {
        advice += "Keep track of your spending to maintain this positive trend.";
    }
    return advice;
  }
}

export default CalculationService;
