import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { NewIntake } from './pages/NewIntake';
import { IntakeReview } from './pages/IntakeReview';
import { AllIntakes } from './pages/AllIntakes';
import { HospitalDashboard } from './pages/HospitalDashboard';
import { SettingsPage } from './pages/SettingsPage';
import { getHealth, HealthStatus } from './services/api';

export default function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  async function refreshHealth() {
    try {
      const h = await getHealth();
      setHealth(h);
    } catch {
      setHealth(null);
    }
  }

  useEffect(() => {
    refreshHealth();
    const interval = setInterval(refreshHealth, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar health={health} />
        <main className="main-content" role="main">
          <Routes>
            <Route path="/" element={<Dashboard health={health} onHealthRefresh={refreshHealth} />} />
            <Route path="/intake/new" element={<NewIntake health={health} />} />
            <Route path="/intakes" element={<AllIntakes />} />
            <Route path="/intakes/:id" element={<IntakeReview />} />
            <Route path="/hospital" element={<HospitalDashboard />} />
            <Route path="/settings" element={<SettingsPage health={health} onHealthRefresh={refreshHealth} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
