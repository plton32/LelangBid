import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { Gavel } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await login(email, password);
      if (user.role === 'admin' || user.role === 'superadmin') {
        navigate('/admin');
      } else if (user.role === 'seller') {
        navigate('/seller');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <Card className="w-full max-w-md bg-brand-navy-light/20 border-slate-800 p-8 shadow-2xl rounded-3xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Gavel className="text-brand-gold h-10 w-10 animate-bounce" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-100 uppercase tracking-wide">
            Sign In to Lelang<span className="gold-gradient-text">BID</span>
          </h2>
          <p className="text-xs text-slate-500 mt-2 font-medium">Enter your credentials to manage and place bids</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-brand-accent-red/10 border border-brand-accent-red/35 rounded-xl text-center text-xs text-brand-accent-red font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="member@lelangbid.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />

          <Button type="submit" variant="gold" fullWidth loading={loading} className="py-3 uppercase tracking-widest text-xs">
            Sign In
          </Button>
        </form>

        <div className="mt-8 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
          <span>New to our auction site? </span>
          <Link to="/register" className="text-brand-gold font-bold hover:underline">
            Create an Account
          </Link>
        </div>
      </Card>
    </div>
  );
};
export default LoginPage;
