import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function Login() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
      if (error) throw error;
      setCodeSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'email',
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!codeSent) {
    return (
      <form className="login" onSubmit={handleSendCode}>
        <h1>Tips</h1>
        <p className="login__hint">Enter your email to sign in.</p>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email"
          autoFocus
        />
        {error && <p className="login__error">{error}</p>}
        <button type="submit" className="login__submit" disabled={!email.trim() || submitting}>
          {submitting ? 'Sending…' : 'Send code'}
        </button>
      </form>
    );
  }

  return (
    <form className="login" onSubmit={handleVerifyCode}>
      <h1>Tips</h1>
      <p className="login__hint">
        We sent a code to {email.trim()}. Enter it below.
      </p>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123456"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        aria-label="Verification code"
        autoFocus
      />
      {error && <p className="login__error">{error}</p>}
      <button type="submit" className="login__submit" disabled={!code.trim() || submitting}>
        {submitting ? 'Verifying…' : 'Sign in'}
      </button>
      <button
        type="button"
        className="login__back"
        onClick={() => {
          setCodeSent(false);
          setCode('');
          setError(null);
        }}
      >
        Use a different email
      </button>
    </form>
  );
}
