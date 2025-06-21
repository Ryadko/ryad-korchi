import React, { useState } from 'react';
import { DashboardPage, IncomePage, ExpensesPage, InvestmentPage, GoalsPage } from './pages';
import { Button } from './components';

type Page = 'dashboard' | 'income' | 'expenses' | 'investments' | 'goals';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'income':
        return <IncomePage />;
      case 'expenses':
        return <ExpensesPage />;
      case 'investments':
        return <InvestmentPage />;
      case 'goals':
        return <GoalsPage />;
      case 'dashboard':
      default:
        return <DashboardPage />;
    }
  };

  const navButtonStyle: React.CSSProperties = {
    marginRight: '0.5rem', // Only right margin for inline display
    marginBottom: '0.5rem', // For stacked display on small screens
  };

  // Main container div style is now mostly handled by #root > div in index.css
  // App.tsx div will just be a direct child.

  return (
    <div> {/* This div is targeted by #root > div in index.css */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 0', // Padding top/bottom, no horizontal padding as container handles it
        borderBottom: '2px solid #76c7c0', // Accent color border
        marginBottom: '2rem'
      }}>
        <h1 style={{ margin: 0, fontSize: '2.2rem', color: '#2c3e50' }}>BudgetWise</h1>
        <nav>
          <Button style={navButtonStyle} onClick={() => setCurrentPage('dashboard')} variant={currentPage === 'dashboard' ? 'primary' : 'secondary'}>Dashboard</Button>
          <Button style={navButtonStyle} onClick={() => setCurrentPage('income')} variant={currentPage === 'income' ? 'primary' : 'secondary'}>Income</Button>
          <Button style={navButtonStyle} onClick={() => setCurrentPage('expenses')} variant={currentPage === 'expenses' ? 'primary' : 'secondary'}>Expenses</Button>
          <Button style={navButtonStyle} onClick={() => setCurrentPage('investments')} variant={currentPage === 'investments' ? 'primary' : 'secondary'}>Investments</Button>
          <Button style={navButtonStyle} onClick={() => setCurrentPage('goals')} variant={currentPage === 'goals' ? 'primary' : 'secondary'}>Goals</Button>
        </nav>
      </header>

      <main>
        {renderPage()}
      </main>

      <footer style={{
        marginTop: '3rem',
        paddingTop: '1.5rem',
        borderTop: '1px solid #e0e0e0',
        textAlign: 'center',
        color: '#666'
      }}>
        <p>&copy; {new Date().getFullYear()} BudgetWise - Your Financial Companion</p>
      </footer>
    </div>
  );
}

export default App;
