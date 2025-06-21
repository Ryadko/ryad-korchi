import React, { useState, useEffect } from 'react';
import { Investment, IncomeSource } from '../models';
import { StorageService } from '../services/StorageService';
import { CalculationService } from '../services/CalculationService';
import { Button, Card, Input, Modal } from '../components';

const INVESTMENTS_KEY = 'app_investments';
const INCOME_SOURCES_KEY = 'app_incomeSources'; // To link investments

const InvestmentPage: React.FC = () => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentInvestment, setCurrentInvestment] = useState<Partial<Investment>>({});
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    const storedInvestments = StorageService.getItem<Investment[]>(INVESTMENTS_KEY);
    if (storedInvestments) {
      const updatedInvestments = storedInvestments.map(inv => {
        const currentValue = (inv.currentValue !== undefined && !isNaN(inv.currentValue) && inv.currentValue > 0)
          ? inv.currentValue
          : CalculationService.simulateInvestmentCurrentValue(inv.initialAmount, new Date(inv.startDate), inv.name);
        return { ...inv, currentValue };
      });
      setInvestments(updatedInvestments);
    }

    const storedIncomeSources = StorageService.getItem<IncomeSource[]>(INCOME_SOURCES_KEY);
    if (storedIncomeSources) {
      setIncomeSources(storedIncomeSources);
    }
  }, []);

  useEffect(() => {
    StorageService.setItem(INVESTMENTS_KEY, investments);
  }, [investments]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentInvestment(prev => ({
      ...prev,
      [name]: (name === 'initialAmount' || name === 'currentValue' || name === 'shares') ? parseFloat(value) : value
    }));
  };

  const handleSubmit = () => {
    if (!currentInvestment.name || currentInvestment.initialAmount == null || currentInvestment.initialAmount <= 0 || !currentInvestment.startDate) {
      alert("Please fill in name, initial amount, and start date correctly.");
      return;
    }

    const initialAmount = currentInvestment.initialAmount!;
    const startDate = new Date(currentInvestment.startDate!);
    const name = currentInvestment.name!;

    const investmentToSave: Investment = {
      id: editId || new Date().toISOString(),
      // Simulate currentValue only if it's not provided or invalid in the form.
      // Typically, for a new investment, currentValue would be same as initialAmount or simulated.
      // If editing, user might not directly edit currentValue as it's simulated.
      currentValue: (currentInvestment.currentValue !== undefined && !isNaN(currentInvestment.currentValue) && currentInvestment.currentValue > 0)
                    ? currentInvestment.currentValue
                    : (editId ? initialAmount : CalculationService.simulateInvestmentCurrentValue(initialAmount, startDate, name)),
      ...currentInvestment,
      initialAmount: initialAmount, // Ensure these are numbers
      startDate: startDate,
      name: name,
    } as Investment;


    if (editId) {
      setInvestments(prev => prev.map(inv => inv.id === editId ? investmentToSave : inv));
    } else {
      // For new investments, ensure current value is simulated if not explicitly set to initial
      if (investmentToSave.currentValue === undefined || investmentToSave.currentValue === 0) {
         investmentToSave.currentValue = CalculationService.simulateInvestmentCurrentValue(investmentToSave.initialAmount, new Date(investmentToSave.startDate), investmentToSave.name);
      }
      // If start date is today, current value should be initial value
      if (new Date(investmentToSave.startDate).toDateString() === new Date().toDateString()){
        investmentToSave.currentValue = investmentToSave.initialAmount;
      }
      setInvestments(prev => [...prev, investmentToSave]);
    }
    closeModal();
  };

  const openModal = (investment?: Investment) => {
    if (investment) {
      setCurrentInvestment({
        ...investment,
        startDate: investment.startDate ? new Date(investment.startDate) : new Date()
      });
      setEditId(investment.id);
    } else {
      setCurrentInvestment({ name: '', initialAmount: 0, startDate: new Date(), shares: 0, symbol: '', currentValue: 0 });
      setEditId(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentInvestment({}); // Reset form
    setEditId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this investment?")) {
      setInvestments(prev => prev.filter(inv => inv.id !== id));
    }
  };

  const handleRefreshValue = (id: string) => {
    setInvestments(prevInvestments => prevInvestments.map(inv => {
      if (inv.id === id) {
        return {
          ...inv,
          currentValue: CalculationService.simulateInvestmentCurrentValue(inv.initialAmount, new Date(inv.startDate), inv.name)
        };
      }
      return inv;
    }));
  };

  const totalInitialInvestment = investments.reduce((acc, curr) => acc + (curr.initialAmount || 0), 0);
  const totalCurrentValue = investments.reduce((acc, curr) => acc + (curr.currentValue || 0), 0);
  const totalProfitLoss = totalCurrentValue - totalInitialInvestment;

  return (
    <div>
      <h2>Investments</h2>
      <Button onClick={() => openModal()} style={{ marginBottom: '1rem' }} size="medium">Add New Investment</Button>

      <Card title="Portfolio Summary">
        <p>Total Initial Investment: <strong>{totalInitialInvestment.toFixed(2)} €</strong></p>
        <p>Total Current Value: <strong>{totalCurrentValue.toFixed(2)} €</strong></p>
        <p>Total Profit/Loss: <strong style={{color: totalProfitLoss >= 0 ? 'green' : 'red'}}>{totalProfitLoss.toFixed(2)} €</strong></p>
      </Card>

      {investments.length === 0 && <p>No investments added yet. Click "Add New Investment" to start.</p>}

      {investments.map(investment => {
        const profitLoss = CalculationService.calculateInvestmentProfitLoss(investment);
        return (
          <Card key={investment.id} title={investment.name}>
            <p>Initial Amount: {investment.initialAmount.toFixed(2)} €</p>
            <p>Current Value: {investment.currentValue.toFixed(2)} €
              <Button onClick={() => handleRefreshValue(investment.id)} variant='secondary' size="small" style={{marginLeft: '10px'}}>Refresh Sim</Button>
            </p>
            <p>Profit/Loss: <span style={{color: profitLoss >= 0 ? 'green' : 'red'}}>{(profitLoss).toFixed(2)} € ({((profitLoss/investment.initialAmount)*100 || 0).toFixed(1)}%)</span></p>
            <p>Start Date: {new Date(investment.startDate).toLocaleDateString()}</p>
            {investment.symbol && <p>Symbol: {investment.symbol}</p>}
            {investment.shares && <p>Shares: {investment.shares}</p>}
            {investment.linkedIncomeId && <p>Linked Income: {incomeSources.find(inc => inc.id === investment.linkedIncomeId)?.name || 'N/A'}</p>}
            <Button onClick={() => openModal(investment)} variant="secondary" size="small" style={{ marginRight: '0.5rem' }}>Edit</Button>
            <Button onClick={() => handleDelete(investment.id)} variant="danger" size="small">Delete</Button>
          </Card>
        );
      })}

      <Modal title={editId ? "Edit Investment" : "Add New Investment"} isOpen={isModalOpen} onClose={closeModal}>
        <Input
          label="Investment Name"
          name="name"
          value={currentInvestment.name || ''}
          onChange={handleInputChange}
          placeholder="e.g., Tech Stock Fund"
        />
        <Input
          label="Initial Amount (€)"
          name="initialAmount"
          type="number"
          min="0.01"
          step="0.01"
          value={currentInvestment.initialAmount || ''}
          onChange={handleInputChange}
        />
        {/* User does not directly set current value in the form; it's simulated or initial */}
        <Input
          label="Start Date"
          name="startDate"
          type="date"
          value={currentInvestment.startDate ? new Date(currentInvestment.startDate).toISOString().split('T')[0] : ''}
          onChange={handleInputChange}
        />
        <Input
          label="Stock Symbol (Optional)"
          name="symbol"
          value={currentInvestment.symbol || ''}
          onChange={handleInputChange}
          placeholder="e.g., AAPL"
        />
        <Input
          label="Number of Shares (Optional)"
          name="shares"
          type="number"
          min="0"
          value={currentInvestment.shares || ''}
          onChange={handleInputChange}
        />
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="linkedIncomeId" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Link to Income Source (Optional)</label>
          <Input
            as="select"
            id="linkedIncomeId"
            name="linkedIncomeId"
            value={currentInvestment.linkedIncomeId || ''}
            onChange={handleInputChange}
          >
            <option value="">None</option>
            {incomeSources.map(inc => (
              <option key={inc.id} value={inc.id}>{inc.name} ({inc.amount.toFixed(2)}€)</option>
            ))}
          </Input>
        </div>
        <Button onClick={handleSubmit} size="medium">{editId ? "Save Changes" : "Add Investment"}</Button>
      </Modal>
    </div>
  );
};

export default InvestmentPage;
