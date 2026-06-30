import React, { useState } from 'react';
import { hashPassword } from '../../utils/crypto';
import { Lock, Unlock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import db from '../../utils/db';

export default function LockScreen({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;
    
    setIsChecking(true);
    try {
      const storedConfig = await db.app_config.get('password_hash');
      if (!storedConfig || !storedConfig.value) {
        // If no password is set, they shouldn't be here, but just in case:
        onUnlock();
        return;
      }

      const inputHash = await hashPassword(password);
      if (inputHash === storedConfig.value) {
        onUnlock();
      } else {
        toast.error('Incorrect password');
        setPassword('');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-border">
        <div className="bg-primary p-8 text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Lock size={32} className="text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-widest uppercase leading-snug">MAKHDOOMIYYA<br/>MANAGEMENT SYSTEM</h1>
          <p className="text-white/80 text-sm mt-3">Enter your password to continue</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8">
          <div className="mb-6">
            <label className="block text-sm font-medium text-text mb-2">Password</label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-center text-lg tracking-widest"
              placeholder="••••••••"
              disabled={isChecking}
            />
          </div>
          
          <button
            type="submit"
            disabled={!password || isChecking}
            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center gap-2"
          >
            {isChecking ? 'Checking...' : 'Unlock'}
            {!isChecking && <ArrowRight size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
