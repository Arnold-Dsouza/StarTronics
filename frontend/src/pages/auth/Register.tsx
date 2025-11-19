import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'customer' | 'technician'>('customer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setSuccess(null);
    console.log('Submitting registration with role:', role);
    try {
      const result = await signUp(email, password, role);
      if (result?.error) throw result.error;
      setSuccess('Account created successfully!');
      // Redirect to dashboard after brief delay
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto card">
      <h1 className="text-xl font-semibold mb-4">Create Account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input required className="input" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" required className="input" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input type="password" required className="input" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">I am signing up as:</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                console.log('Setting role to customer');
                setRole('customer');
              }}
              className={`p-4 rounded-xl border-2 transition-all duration-300 text-center ${
                role === 'customer'
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-brand-300'
              }`}
            >
              <div className="text-3xl mb-2">👤</div>
              <div className="font-semibold text-gray-900 dark:text-white">Customer</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Get repairs</div>
            </button>
            <button
              type="button"
              onClick={() => {
                console.log('Setting role to technician');
                setRole('technician');
              }}
              className={`p-4 rounded-xl border-2 transition-all duration-300 text-center ${
                role === 'technician'
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-brand-300'
              }`}
            >
              <div className="text-3xl mb-2">🔧</div>
              <div className="font-semibold text-gray-900 dark:text-white">Technician</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Provide repairs</div>
            </button>
          </div>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}
        <button disabled={loading} className="btn btn-primary w-full" type="submit">{loading ? 'Creating...' : 'Register'}</button>
      </form>
      <p className="text-xs mt-4 text-slate-600">Supabase sends a confirmation email if configured.</p>
    </div>
  );
}
