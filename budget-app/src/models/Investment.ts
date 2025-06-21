export interface Investment {
  id: string;
  name: string; // e.g., "Stock XYZ"
  linkedIncomeId?: string; // Optional: to link to a specific income source
  initialAmount: number;
  currentValue: number; // This would be updated based on market data or simulation
  startDate: Date;
  // For stock-specific details, if needed later
  symbol?: string;
  shares?: number;
}

// Separate type for simulated stock data if we go down that route
export interface StockData {
  symbol: string;
  currentPrice: number;
  lastUpdated: Date;
}
