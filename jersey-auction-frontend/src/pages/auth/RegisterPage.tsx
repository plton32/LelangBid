import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { Gavel } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register(fullName, email, phone, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <Card className="w-full max-w-lg bg-brand-navy-light/20 border-slate-800 p-8 shadow-2xl rounded-3xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Gavel className="text-brand-gold h-10 w-10" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-100 uppercase tracking-wide">
            Register on Lelang<span className="gold-gradient-text">BID</span>
          </h2>
          <p className="text-xs text-slate-500 mt-2 font-medium">Create a collector account for premium sports LelangBid bidding</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-brand-accent-red/10 border border-brand-accent-red/35 rounded-xl text-center text-xs text-brand-accent-red font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name *"
            type="text"
            placeholder="Ahmad Junaidi"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email Address *"
              type="email"
              placeholder="ahmad@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
            <Input
              label="Phone Number"
              type="text"
              placeholder="0812XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
          </div>

          <Input
            label="Password *"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />

          <Button type="submit" variant="gold" fullWidth loading={loading} className="py-3 uppercase tracking-widest text-xs">
            Submit Registration
          </Button>
        </form>

        <div className="mt-8 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
          <span>Already have an account? </span>
          <Link to="/login" className="text-brand-gold font-bold hover:underline">
            Sign In Here
          </Link>
        </div>
      </Card>
    </div>
  );
};
export default RegisterPage;
