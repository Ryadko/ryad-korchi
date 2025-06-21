import React, { useState, useEffect } from 'react';
import { IncomeSource } from '../models';
import { StorageService } from '../services/StorageService';
import { Button, Card, Input, Modal } from '../components';

const INCOME_SOURCES_KEY = 'app_incomeSources';

const IncomePage: React.FC = () => {
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentIncome, setCurrentIncome] = useState<Partial<IncomeSource>>({});
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    const storedIncomeSources = StorageService.getItem<IncomeSource[]>(INCOME_SOURCES_KEY);
    if (storedIncomeSources) {
      setIncomeSources(storedIncomeSources);
    }
  }, []);

  useEffect(() => {
    StorageService.setItem(INCOME_SOURCES_KEY, incomeSources);
  }, [incomeSources]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentIncome(prev => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) : value }));
  };

  const handleSubmit = () => {
    if (!currentIncome.name || !currentIncome.category || currentIncome.amount == null || currentIncome.amount <= 0) {
      alert("Please fill in all fields correctly.");
      return;
    }

    if (editId) {
      setIncomeSources(prev => prev.map(inc => inc.id === editId ? { ...inc, ...currentIncome } as IncomeSource : inc));
    } else {
      const newIncome: IncomeSource = {
        id: new Date().toISOString(), // Simple unique ID
        ...currentIncome
      } as IncomeSource;
      setIncomeSources(prev => [...prev, newIncome]);
    }
    closeModal();
  };

  const openModal = (income?: IncomeSource) => {
    if (income) {
      setCurrentIncome(income);
      setEditId(income.id);
    } else {
      setCurrentIncome({ name: '', category: 'salary', amount: 0 });
      setEditId(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentIncome({});
    setEditId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this income source?")) {
      setIncomeSources(prev => prev.filter(inc => inc.id !== id));
    }
  };

  const totalMonthlyIncome = incomeSources.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div>
      <h2>Income Sources</h2>
      <Button onClick={() => openModal()} style={{ marginBottom: '1rem' }}>Add New Income</Button>

      <Card title="Monthly Summary">
        <p>Total Monthly Income: <strong>{totalMonthlyIncome.toFixed(2)} €</strong></p>
      </Card>

      {incomeSources.length === 0 && <p>No income sources added yet. Click "Add New Income" to start.</p>}

      {incomeSources.map(income => (
        <Card key={income.id} title={income.name}>
          <p>Category: {income.category}</p>
          <p>Amount: {income.amount.toFixed(2)} €</p>
          {income.date && <p>Date: {new Date(income.date).toLocaleDateString()}</p>}
          <Button onClick={() => openModal(income)} variant="secondary" style={{ marginRight: '0.5rem' }}>Edit</Button>
          <Button onClick={() => handleDelete(income.id)} variant="danger">Delete</Button>
        </Card>
      ))}

      <Modal title={editId ? "Edit Income Source" : "Add New Income Source"} isOpen={isModalOpen} onClose={closeModal}>
        <Input
          label="Source Name"
          name="name"
          value={currentIncome.name || ''}
          onChange={handleInputChange}
          placeholder="e.g., My Salary"
        />
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="category" style={{ display: 'block', marginBottom: '0.5rem' }}>Category</label>
          <select
            id="category"
            name="category"
            value={currentIncome.category || 'salary'}
            onChange={handleInputChange}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px'}}
          >
            <option value="salary">Salary</option>
            <option value="freelance">Freelance</option>
            <option value="rent">Rent</option>
            <option value="investment">Investment Return</option>
            <option value="other">Other</option>
          </select>
        </div>
        <Input
          label="Amount (€)"
          name="amount"
          type="number"
          value={currentIncome.amount || ''}
          onChange={handleInputChange}
          placeholder="e.g., 2500"
        />
        <Input
          label="Date (Optional)"
          name="date"
          type="date"
          value={currentIncome.date ? new Date(currentIncome.date).toISOString().split('T')[0] : ''}
          onChange={handleInputChange}
        />
        <Button onClick={handleSubmit}>{editId ? "Save Changes" : "Add Income"}</Button>
      </Modal>
    </div>
  );
};

export default IncomePage;
