import React, { useState, useEffect } from 'react';
import { FinancialGoal, IncomeSource, Expense } from '../models';
import { StorageService } from '../services/StorageService';
import { CalculationService } from '../services/CalculationService';
import { Button, Card, Input, Modal } from '../components';

const GOALS_KEY = 'app_financialGoals';
const INCOME_SOURCES_KEY = 'app_incomeSources';
const EXPENSES_KEY = 'app_expenses';


const GoalsPage: React.FC = () => {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<Partial<FinancialGoal>>({});
  const [editId, setEditId] = useState<string | null>(null);

  // Data for projections
  const [totalMonthlyIncome, setTotalMonthlyIncome] = useState(0);
  const [totalMonthlyExpenses, setTotalMonthlyExpenses] = useState(0);
  const [savingsAdvice, setSavingsAdvice] = useState("");

  useEffect(() => {
    const storedGoals = StorageService.getItem<FinancialGoal[]>(GOALS_KEY);
    if (storedGoals) {
      setGoals(storedGoals);
    }

    const income = StorageService.getItem<IncomeSource[]>(INCOME_SOURCES_KEY) || [];
    const expenses = StorageService.getItem<Expense[]>(EXPENSES_KEY) || [];

    const monthlyIncome = CalculationService.calculateTotalMonthlyIncome(income);
    const monthlyExpenses = CalculationService.calculateTotalMonthlyExpenses(expenses);
    setTotalMonthlyIncome(monthlyIncome);
    setTotalMonthlyExpenses(monthlyExpenses);
    setSavingsAdvice(CalculationService.getSavingsAdvice(monthlyIncome, monthlyExpenses, expenses));

  }, []); // Re-calculate if income/expenses change (could listen to custom events or context)

  useEffect(() => {
    StorageService.setItem(GOALS_KEY, goals);
  }, [goals]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentGoal(prev => ({
      ...prev,
      [name]: (name === 'targetAmount' || name === 'currentAmount') ? parseFloat(value) : value
    }));
  };

  const handleSubmit = () => {
    if (!currentGoal.name || currentGoal.targetAmount == null || currentGoal.targetAmount <= 0) {
      alert("Please fill in name and target amount correctly.");
      return;
    }

    const goalToSave: FinancialGoal = {
      id: editId || new Date().toISOString(),
      currentAmount: currentGoal.currentAmount || 0, // Default current amount to 0
      ...currentGoal,
    } as FinancialGoal;

    if (editId) {
      setGoals(prev => prev.map(g => g.id === editId ? goalToSave : g));
    } else {
      setGoals(prev => [...prev, goalToSave]);
    }
    closeModal();
  };

  const openModal = (goal?: FinancialGoal) => {
    if (goal) {
      setCurrentGoal(goal);
      setEditId(goal.id);
    } else {
      setCurrentGoal({ name: '', targetAmount: 0, currentAmount: 0, priority: 'medium' });
      setEditId(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentGoal({});
    setEditId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this financial goal?")) {
      setGoals(prev => prev.filter(g => g.id !== id));
    }
  };

  return (
    <div>
      <h2>Financial Goals and Projections</h2>
      <Button onClick={() => openModal()} style={{ marginBottom: '1rem' }}>Add New Goal</Button>

      <Card title="Financial Overview & Advice">
        <p>Total Monthly Income: <strong>{totalMonthlyIncome.toFixed(2)} €</strong></p>
        <p>Total Monthly Expenses: <strong>{totalMonthlyExpenses.toFixed(2)} €</strong></p>
        <p>Projected Monthly Savings: <strong>{(totalMonthlyIncome - totalMonthlyExpenses).toFixed(2)} €</strong></p>
        <p style={{marginTop: '1rem', fontStyle: 'italic', color: '#555'}}>{savingsAdvice}</p>
      </Card>

      {goals.length === 0 && <p>No financial goals set yet. Click "Add New Goal" to start.</p>}

      {goals.map(goal => {
        const projection = CalculationService.projectFinancialGoal(totalMonthlyIncome, totalMonthlyExpenses, goal);
        const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
        return (
          <Card key={goal.id} title={goal.name}>
            <p>Target Amount: {goal.targetAmount.toFixed(2)} €</p>
            <p>Current Amount Saved: {goal.currentAmount.toFixed(2)} €</p>
            <p>Priority: {goal.priority}</p>
            {goal.targetDate && <p>Target Date: {new Date(goal.targetDate).toLocaleDateString()}</p>}
            {goal.description && <p>Description: {goal.description}</p>}

            <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
              <label>Progress: {progress.toFixed(1)}%</label>
              <div style={{ width: '100%', backgroundColor: '#e0e0e0', borderRadius: '4px' }}>
                <div style={{
                  width: `${Math.min(progress, 100)}%`,
                  backgroundColor: progress >= 100 ? '#4caf50' : '#2196f3',
                  height: '20px',
                  borderRadius: '4px',
                  textAlign: 'center',
                  color: 'white',
                  lineHeight: '20px'
                }}>
                  {progress.toFixed(0)}%
                </div>
              </div>
            </div>

            <p>Projected Months to Reach Goal: <strong>{projection.monthsToGoal}</strong>
               (based on current saving rate of {projection.projectedMonthlySavings.toFixed(2)} €/month)
            </p>
            <Button onClick={() => openModal(goal)} variant="secondary" style={{ marginRight: '0.5rem' }}>Edit</Button>
            <Button onClick={() => handleDelete(goal.id)} variant="danger">Delete</Button>
          </Card>
        );
      })}

      <Modal title={editId ? "Edit Financial Goal" : "Add New Financial Goal"} isOpen={isModalOpen} onClose={closeModal}>
        <Input
          label="Goal Name"
          name="name"
          value={currentGoal.name || ''}
          onChange={handleInputChange}
          placeholder="e.g., Emergency Fund, New Car"
        />
        <Input
          label="Target Amount (€)"
          name="targetAmount"
          type="number"
          value={currentGoal.targetAmount || ''}
          onChange={handleInputChange}
        />
        <Input
          label="Current Amount Saved (€)"
          name="currentAmount"
          type="number"
          value={currentGoal.currentAmount || ''}
          onChange={handleInputChange}
        />
        <Input
          label="Target Date (Optional)"
          name="targetDate"
          type="date"
          value={currentGoal.targetDate ? new Date(currentGoal.targetDate).toISOString().split('T')[0] : ''}
          onChange={handleInputChange}
        />
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="priority" style={{ display: 'block', marginBottom: '0.5rem' }}>Priority</label>
          <select
            id="priority"
            name="priority"
            value={currentGoal.priority || 'medium'}
            onChange={handleInputChange}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <Input
          label="Description (Optional)"
          name="description"
          value={currentGoal.description || ''}
          onChange={handleInputChange}
          placeholder="e.g., Save for a down payment"
        />
        <Button onClick={handleSubmit}>{editId ? "Save Changes" : "Add Goal"}</Button>
      </Modal>
    </div>
  );
};

export default GoalsPage;
