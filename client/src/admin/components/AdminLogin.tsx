/**
 * Admin Login Component
 * 
 * Simple password gate for admin access.
 */

import React, { useState } from 'react';
import { setAdminKey, adminApi } from '../api/adminClient';

interface AdminLoginProps {
  onSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Store the key temporarily
      setAdminKey(password);
      
      // Verify it works
      const isValid = await adminApi.verifyAuth();
      
      if (isValid) {
        onSuccess();
      } else {
        setAdminKey(''); // Clear invalid key
        setError('Invalid admin password');
      }
    } catch (err) {
      setAdminKey(''); // Clear on error
      setError('Failed to verify credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Un·Define Admin</h1>
          <p style={styles.subtitle}>Enter admin password to continue</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            style={styles.input}
            autoFocus
            disabled={loading}
          />
          
          {error && <div style={styles.error}>{error}</div>}
          
          <button 
            type="submit" 
            style={styles.button}
            disabled={loading || !password}
          >
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>

        <p style={styles.hint}>
          Password is set via ADMIN_PASSWORD environment variable
        </p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    padding: '1rem',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#1a237e',
    margin: 0,
    fontFamily: 'Libre Baskerville, serif',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#666',
    marginTop: '0.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  input: {
    padding: '0.875rem 1rem',
    fontSize: '1rem',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    padding: '0.875rem 1rem',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#fff',
    background: '#1a237e',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  error: {
    color: '#d32f2f',
    fontSize: '0.875rem',
    textAlign: 'center',
    padding: '0.5rem',
    background: '#ffebee',
    borderRadius: '4px',
  },
  hint: {
    fontSize: '0.75rem',
    color: '#999',
    textAlign: 'center',
    marginTop: '1.5rem',
  },
};

export default AdminLogin;

