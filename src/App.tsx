import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Router, { Route } from './components/Router';

function App() {
  const { user, loading } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<Route>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Layout currentRoute={currentRoute} onNavigate={setCurrentRoute}>
      <Router currentRoute={currentRoute} />
    </Layout>
  );
}

export default App;
