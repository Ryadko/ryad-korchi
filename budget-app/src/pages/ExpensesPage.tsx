import React, { useState, useEffect } from 'react';
import { Expense, Subscription } from '../models'; // Assuming Subscription might extend Expense or be a category
import { StorageService } from '../services/StorageService';
import { CalculationService } from '../services/CalculationService';
import { Button, Card, Input, Modal } from '../components';

const EXPENSES_KEY = 'app_expenses';

const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentExpense, setCurrentExpense] = useState<Partial<Expense>>({});
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    const storedExpenses = StorageService.getItem<Expense[]>(EXPENSES_KEY);
    if (storedExpenses) {
      setExpenses(storedExpenses);
    }
  }, []);

  useEffect(() => {
    StorageService.setItem(EXPENSES_KEY, expenses);
  }, [expenses]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentExpense(prev => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) : value }));
  };

  const handleSubmit = () => {
    if (!currentExpense.name || !currentExpense.category || currentExpense.amount == null || currentExpense.amount <= 0) {
      alert("Please fill in name, category, and amount correctly.");
      return;
    }

    const expenseToSave: Expense = {
      id: editId || new Date().toISOString(),
      ...currentExpense,
      // Ensure default frequency if not set, important for calculations
      frequency: currentExpense.frequency || 'monthly',
    } as Expense;


    if (editId) {
      setExpenses(prev => prev.map(exp => exp.id === editId ? expenseToSave : exp));
    } else {
      setExpenses(prev => [...prev, expenseToSave]);
    }
    closeModal();
  };

  const openModal = (expense?: Expense) => {
    if (expense) {
      setCurrentExpense(expense);
      setEditId(expense.id);
    } else {
      setCurrentExpense({ name: '', category: 'variable', amount: 0, frequency: 'monthly' });
      setEditId(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentExpense({});
    setEditId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      setExpenses(prev => prev.filter(exp => exp.id !== id));
    }
  };

  const totalMonthlyExpenses = CalculationService.calculateTotalMonthlyExpenses(expenses);

  return (
    <div>
      <h2>Expenses and Subscriptions</h2>
      <Button onClick={() => openModal()} style={{ marginBottom: '1rem' }}>Add New Expense</Button>

      <Card title="Monthly Summary">
        <p>Total Estimated Monthly Expenses: <strong>{totalMonthlyExpenses.toFixed(2)} €</strong></p>
      </Card>

      {expenses.length === 0 && <p>No expenses added yet. Click "Add New Expense" to start.</p>}

      {expenses.map(expense => (
        <Card key={expense.id} title={expense.name}>
          <p>Category: {expense.category}</p>
          <p>Amount: {expense.amount.toFixed(2)} €</p>
          <p>Frequency: {expense.frequency || 'N/A'}</p>
          {expense.dueDate && <p>Due Date: {new Date(expense.dueDate).toLocaleDateString()}</p>}
          <Button onClick={() => openModal(expense)} variant="secondary" style={{ marginRight: '0.5rem' }}>Edit</Button>
          <Button onClick={() => handleDelete(expense.id)} variant="danger">Delete</Button>
        </Card>
      ))}

      <Modal title={editId ? "Edit Expense" : "Add New Expense"} isOpen={isModalOpen} onClose={closeModal}>
        <Input
          label="Expense Name"
          name="name"
          value={currentExpense.name || ''}
          onChange={handleInputChange}
          placeholder="e.g., Groceries, Netflix"
        />
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="category" style={{ display: 'block', marginBottom: '0.5rem' }}>Category</label>
          <select
            id="category"
            name="category"
            value={currentExpense.category || 'variable'}
            onChange={handleInputChange}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="fixed">Fixed (e.g., Rent, Loan)</option>
            <option value="subscription">Subscription (e.g., Netflix, Spotify)</option>
            <option value="variable">Variable (e.g., Groceries, Dining Out)</option>
            <option value="other">Other</option>
          </select>
        </div>
        <Input
          label="Amount (€)"
          name="amount"
          type="number"
          value={currentExpense.amount || ''}
          onChange={handleInputChange}
          placeholder="e.g., 50"
        />
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="frequency" style={{ display: 'block', marginBottom: '0.5rem' }}>Frequency</label>
          <select
            id="frequency"
            name="frequency"
            value={currentExpense.frequency || 'monthly'}
            onChange={handleInputChange}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="once">Once</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <Input
          label="Due Date (Optional)"
          name="dueDate"
          type="date"
          value={currentExpense.dueDate ? new Date(currentExpense.dueDate).toISOString().split('T')[0] : ''}
          onChange={handleInputChange}
        />
        <Button onClick={handleSubmit}>{editId ? "Save Changes" : "Add Expense"}</Button>
      </Modal>
    </div>
  );
};

export default ExpensesPage;
