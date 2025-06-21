import React from 'react';
import { Card } from '../components';

const DashboardPage: React.FC = () => {
  return (
    <div>
      <h2>Dashboard</h2>
      <Card title="Welcome!">
        <p>This is your financial dashboard. Data will be displayed here soon.</p>
      </Card>
      {/* More summary components will go here */}
    </div>
  );
};

export default DashboardPage;
