import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AdminApp from './admin/AdminApp';

/**
 * Simple path-based routing
 * /admin -> Admin interface
 * everything else -> Main game
 */
function Router() {
  const path = window.location.pathname;
  
  // Admin routes
  if (path.startsWith('/admin')) {
    return <AdminApp />;
  }
  
  // Default: main game
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
