
import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Hero from '@/components/Hero';
import SchedulingSystem from '@/components/SchedulingSystem';
import ApprovalDashboard from '@/components/ApprovalDashboard';
import LoginForm from '@/components/LoginForm';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';

const Index = () => {
  const [activeSection, setActiveSection] = useState('home');
  const { isAuthenticated, userProfile } = useAuth();
  const location = useLocation();
  
  // Gerenciar seção ativa baseada na URL
  useEffect(() => {
    const hash = location.hash;
    if (hash === '#schedule') {
      setActiveSection('schedule');
    } else if (hash === '#dashboard') {
      setActiveSection('dashboard');
    } else {
      setActiveSection('home');
    }
  }, [location.hash]);

  // If not authenticated, show login form
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'home':
        return <Hero setActiveSection={setActiveSection} />;
      case 'schedule':
        return <SchedulingSystem />;
      case 'dashboard':
        // Only admin users can access dashboard
        return userProfile?.is_admin ? <ApprovalDashboard /> : <Hero setActiveSection={setActiveSection} />;
      default:
        return <Hero setActiveSection={setActiveSection} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation activeSection={activeSection} setActiveSection={setActiveSection} />
      <div className="pt-16">
        {renderActiveSection()}
      </div>
    </div>
  );
};

export default Index;
