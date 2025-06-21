// src/services/StorageService.ts

/**
 * A generic service to interact with localStorage.
 */
export class StorageService {
  /**
   * Saves data to localStorage.
   * @param key The key under which to store the data.
   * @param value The data to store (will be JSON.stringified).
   */
  static setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving data to localStorage for key "${key}":`, error);
      // Optionally, implement a more robust error handling or fallback storage
    }
  }

  /**
   * Retrieves data from localStorage.
   * @param key The key of the data to retrieve.
   * @returns The retrieved data (JSON.parsed), or null if not found or error.
   */
  static getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return null;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error retrieving data from localStorage for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Removes data from localStorage.
   * @param key The key of the data to remove.
   */
  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing data from localStorage for key "${key}":`, error);
    }
  }

  /**
   * Clears all data managed by this application from localStorage.
   * Be cautious with this method if other apps on the same domain use localStorage.
   * A more targeted approach would be to prefix keys.
   */
  static clearAll(): void {
    try {
      // This is a simple clear all. For a real app, you might want to
      // iterate through known keys and remove them to avoid clearing unrelated data.
      localStorage.clear();
      console.log("LocalStorage cleared.");
    } catch (error) {
      console.error("Error clearing localStorage:", error);
    }
  }
}

// Example usage for specific data types (can be expanded)

const INCOME_SOURCES_KEY = 'app_incomeSources';
const INVESTMENTS_KEY = 'app_investments';
const EXPENSES_KEY = 'app_expenses';
const GOALS_KEY = 'app_financialGoals';

// We can add more specific functions here or manage them in dedicated services/hooks

// import { IncomeSource, Investment, Expense, FinancialGoal } from '../models';

// For IncomeSources
// export const getIncomeSources = (): IncomeSource[] => StorageService.getItem<IncomeSource[]>(INCOME_SOURCES_KEY) || [];
// export const saveIncomeSources = (incomeSources: IncomeSource[]): void => StorageService.setItem(INCOME_SOURCES_KEY, incomeSources);

// For Investments
// export const getInvestments = (): Investment[] => StorageService.getItem<Investment[]>(INVESTMENTS_KEY) || [];
// export const saveInvestments = (investments: Investment[]): void => StorageService.setItem(INVESTMENTS_KEY, investments);

// For Expenses
// export const getExpenses = (): Expense[] => StorageService.getItem<Expense[]>(EXPENSES_KEY) || [];
// export const saveExpenses = (expenses: Expense[]): void => StorageService.setItem(EXPENSES_KEY, expenses);

// For FinancialGoals
// export const getFinancialGoals = (): FinancialGoal[] => StorageService.getItem<FinancialGoal[]>(GOALS_KEY) || [];
// export const saveFinancialGoals = (goals: FinancialGoal[]): void => StorageService.setItem(GOALS_KEY, goals);

export default StorageService;
