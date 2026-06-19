import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { InteractiveEye } from '../components/InteractiveEye';

type AuthMode = 'login' | 'register' | 'verify-otp' | 'forgot-password' | 'otp-login-verify';
const PASSWORD_MIN_LENGTH = 8;

const validatePassword = (password: string): string | null => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include letters and numbers';
  }
  return null;
};

export const Login: React.FC = () => {
  const {
    authLoading,
    isAuthenticated,
    onboardingComplete,
    signIn,
    signUp,
    verifyOtp,
    resendOtp,
    sendResetOtp,
    resetPasswordLogin,
  } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetMethod, setResetMethod] = useState<'otp-login' | 'reset-password'>('otp-login');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | 'confirmPassword' | 'otp' | null>(null);

  // Check URL parameters for verified=true redirect from backend email verification
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInfo('Email verified successfully! You can now sign in.');
      // Clean query parameters to avoid showing the banner on reload
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(onboardingComplete ? '/dashboard' : '/onboarding', { replace: true });
    }
  }, [authLoading, isAuthenticated, onboardingComplete, navigate]);

  const resetMessages = () => {
    setError('');
    setInfo('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!email.trim() || !password) {
      setError('Please enter your email and password');
      return;
    }

    setSubmitting(true);
    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);

    if (signInError) {
      if (signInError === 'EMAIL_NOT_VERIFIED') {
        setMode('verify-otp');
        setInfo('Your email is not verified yet. Please enter the OTP code sent to your email.');
      } else {
        setError(signInError);
      }
      return;
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    const { error: signUpError } = await signUp(email, password);
    setSubmitting(false);

    if (signUpError) {
      setError(signUpError);
      return;
    }

    setMode('verify-otp');
    setInfo('Account created! A 6-digit verification code has been sent to your email.');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (otpCode.length !== 6 || !/^\d+$/.test(otpCode)) {
      setError('Please enter a valid 6-digit OTP code');
      return;
    }

    setSubmitting(true);
    const { error: verifyError } = await verifyOtp(email, otpCode);
    setSubmitting(false);

    if (verifyError) {
      setError(verifyError);
      return;
    }

    setInfo('Email verified successfully! You can now sign in.');
    setMode('login');
    setOtpCode('');
  };

  const handleResendOtp = async () => {
    resetMessages();
    setSubmitting(true);
    const { error: resendError } = await resendOtp(email);
    setSubmitting(false);

    if (resendError) {
      setError(resendError);
      return;
    }

    setInfo('A new verification code has been sent to your email.');
  };

  const handleSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setSubmitting(true);
    const { error: resetOtpError } = await sendResetOtp(email);
    setSubmitting(false);

    if (resetOtpError) {
      setError(resetOtpError);
      return;
    }

    setMode('otp-login-verify');
    setInfo('A 6-digit access code has been sent to your email.');
  };

  const handleResetPasswordLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (otpCode.length !== 6 || !/^\d+$/.test(otpCode)) {
      setError('Please enter a valid 6-digit OTP code');
      return;
    }

    if (resetMethod === 'reset-password') {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    setSubmitting(true);
    const { error: resetError } = await resetPasswordLogin(
      email,
      otpCode,
      resetMethod === 'reset-password' ? password : undefined
    );
    setSubmitting(false);

    if (resetError) {
      setError(resetError);
      return;
    }

    setInfo(resetMethod === 'reset-password' ? 'Password reset and signed in successfully!' : 'Signed in successfully using OTP!');
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setPassword('');
    setConfirmPassword('');
    setOtpCode('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFocusedField(null);
    resetMessages();
  };

  if (authLoading) {
    return (
      <div className="bg-surface min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-on-surface-variant">Loading secure session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-screen relative font-sans antialiased text-on-surface overflow-y-auto flex flex-col items-center py-6">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] bg-primary-fixed-dim/30 rounded-full blur-[100px] opacity-70" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[60%] bg-surface-tint/10 rounded-full blur-[120px] opacity-80" />
      </div>

      <main className="relative z-10 w-full max-w-md mx-auto px-container-padding-mobile flex flex-col justify-center my-auto py-8">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-16 h-16 rounded-full bg-white/60 backdrop-blur-md border border-white/50 shadow-sm flex items-center justify-center mb-4 relative overflow-hidden group">
            {/* Animated green/blue scanning line */}
            <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-qr-scan shadow-[0_0_8px_rgba(0,61,155,0.8)] opacity-85" />
            <span className="material-symbols-outlined text-[32px] text-primary filled-icon animate-qr-pulse">qr_code_scanner</span>
          </div>
          <h1 className="font-sans text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-tertiary-container text-gradient tracking-tight">
            MediQR
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 text-center">
            Secure access to your health identity.
          </p>
        </div>

        <GlassCard className="w-full">
          {/* Interactive Robot Eye Avatar */}
          <div className="flex justify-center mb-6 mt-2">
            <InteractiveEye
              emailLength={email.length}
              passwordLength={password.length}
              confirmPasswordLength={confirmPassword.length}
              focusedField={focusedField}
              isPasswordVisible={showPassword}
            />
          </div>

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="flex flex-col w-full">
              <h2 className="font-title-md text-title-md text-on-surface mb-2 text-center">Welcome back</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-6 text-center">
                Sign in with your email and password.
              </p>

              <div className="space-y-4">
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  icon="mail"
                  autoComplete="email"
                  required
                />

                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    icon="lock"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-12 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                
                <div className="flex justify-end mt-1">
                  <button
                    type="button"
                    onClick={() => switchMode('forgot-password')}
                    className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              {error && (
                <p className="mt-4 text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-[12px] px-3 py-2">
                  {error}
                </p>
              )}
              {error === 'Invalid email or password' && (
                <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-[16px] text-xs text-center">
                  <p className="text-on-surface mb-2 font-medium">Forgot your password or want to sign in directly?</p>
                  <button
                    type="button"
                    onClick={() => {
                      resetMessages();
                      switchMode('forgot-password');
                    }}
                    className="text-primary font-semibold hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto"
                  >
                    <span className="material-symbols-outlined text-[16px]">key</span>
                    Reset Password / Login with OTP
                  </button>
                </div>
              )}
              {info && (
                <p className="mt-4 text-sm text-primary bg-primary/10 border border-primary/20 rounded-[12px] px-3 py-2">
                  {info}
                </p>
              )}

              <Button
                variant="primary"
                type="submit"
                className="w-full mt-6"
                icon="login"
                disabled={submitting}
              >
                {submitting ? 'Signing in...' : 'Sign In'}
              </Button>

              <p className="mt-6 text-center font-body-sm text-body-sm text-on-surface-variant">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-primary font-semibold hover:underline cursor-pointer"
                >
                  Create account
                </button>
              </p>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="flex flex-col w-full">
              <h2 className="font-title-md text-title-md text-on-surface mb-2 text-center">Create your account</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-6 text-center">
                Register with email and password to instantly access your account.
              </p>

              <div className="space-y-4">
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  icon="mail"
                  autoComplete="email"
                  required
                />

                <Input
                  type="password"
                  placeholder="Password (min 8 chars, letters + numbers)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  icon="lock"
                  autoComplete="new-password"
                  required
                />

                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField(null)}
                    icon="lock_reset"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-12 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {error && (
                <p className="mt-4 text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-[12px] px-3 py-2">
                  {error}
                </p>
              )}
              {info && (
                <p className="mt-4 text-sm text-primary bg-primary/10 border border-primary/20 rounded-[12px] px-3 py-2">
                  {info}
                </p>
              )}

              <Button
                variant="primary"
                type="submit"
                className="w-full mt-6"
                icon="person_add"
                disabled={submitting}
              >
                {submitting ? 'Creating account...' : 'Create Account'}
              </Button>

              <p className="mt-6 text-center font-body-sm text-body-sm text-on-surface-variant">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-primary font-semibold hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

          {mode === 'verify-otp' && (
            <form onSubmit={handleVerifyOtp} className="flex flex-col w-full">
              <h2 className="font-title-md text-title-md text-on-surface mb-2 text-center">Verify your email</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-6 text-center">
                Enter the 6-digit code sent to <strong>{email}</strong>.
              </p>

              <div className="space-y-4">
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="6-digit code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onFocus={() => setFocusedField('otp')}
                  onBlur={() => setFocusedField(null)}
                  icon="lock"
                  className="text-center tracking-widest text-xl font-bold font-mono"
                  required
                />
              </div>

              {error && (
                <p className="mt-4 text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-[12px] px-3 py-2">
                  {error}
                </p>
              )}
              {info && (
                <p className="mt-4 text-sm text-primary bg-primary/10 border border-primary/20 rounded-[12px] px-3 py-2">
                  {info}
                </p>
              )}

              <Button
                variant="primary"
                type="submit"
                className="w-full mt-6"
                icon="verified"
                disabled={submitting}
              >
                {submitting ? 'Verifying...' : 'Verify OTP'}
              </Button>

              <div className="mt-6 flex flex-col gap-2 text-center font-body-sm text-body-sm text-on-surface-variant">
                <div>
                  Didn&apos;t receive the code?{' '}
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-primary font-semibold hover:underline cursor-pointer"
                    disabled={submitting}
                  >
                    Resend OTP
                  </button>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-primary font-semibold hover:underline cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            </form>
          )}

          {mode === 'forgot-password' && (
            <form onSubmit={handleSendResetOtp} className="flex flex-col w-full">
              <h2 className="font-title-md text-title-md text-on-surface mb-2 text-center">Account Access</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-6 text-center">
                Enter your email address to receive a secure 6-digit access code for OTP login or password reset.
              </p>

              <div className="space-y-4">
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  icon="mail"
                  autoComplete="email"
                  required
                />
              </div>

              {error && (
                <p className="mt-4 text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-[12px] px-3 py-2">
                  {error}
                </p>
              )}
              {info && (
                <p className="mt-4 text-sm text-primary bg-primary/10 border border-primary/20 rounded-[12px] px-3 py-2">
                  {info}
                </p>
              )}

              <Button
                variant="primary"
                type="submit"
                className="w-full mt-6"
                icon="send"
                disabled={submitting}
              >
                {submitting ? 'Sending code...' : 'Send Access Code'}
              </Button>

              <div className="mt-6 text-center font-body-sm text-body-sm text-on-surface-variant">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-primary font-semibold hover:underline cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {mode === 'otp-login-verify' && (
            <form onSubmit={handleResetPasswordLoginSubmit} className="flex flex-col w-full">
              <h2 className="font-title-md text-title-md text-on-surface mb-2 text-center">Verify Access</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 text-center">
                We sent a 6-digit access code to <strong>{email}</strong>.
              </p>

              {/* Segmented Control / Tabs */}
              <div className="flex bg-surface-container-high rounded-[16px] p-1 mb-6 border border-transparent shadow-inner">
                <button
                  type="button"
                  onClick={() => setResetMethod('otp-login')}
                  className={`flex-1 text-center py-2 text-xs font-semibold rounded-[12px] transition-all duration-200 cursor-pointer ${
                    resetMethod === 'otp-login'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Direct Login with OTP
                </button>
                <button
                  type="button"
                  onClick={() => setResetMethod('reset-password')}
                  className={`flex-1 text-center py-2 text-xs font-semibold rounded-[12px] transition-all duration-200 cursor-pointer ${
                    resetMethod === 'reset-password'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Reset Password & Login
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1 ml-1">
                    6-Digit Access Code
                  </label>
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="6-digit code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onFocus={() => setFocusedField('otp')}
                    onBlur={() => setFocusedField(null)}
                    icon="lock"
                    className="text-center tracking-widest text-xl font-bold font-mono"
                    required
                  />
                </div>

                {resetMethod === 'reset-password' && (
                  <>
                    <Input
                      type="password"
                      placeholder="New Password (min 8 chars, letters + numbers)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      icon="lock"
                      autoComplete="new-password"
                      required
                    />

                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onFocus={() => setFocusedField('confirmPassword')}
                        onBlur={() => setFocusedField(null)}
                        icon="lock_reset"
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-12 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary cursor-pointer"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showConfirmPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {error && (
                <p className="mt-4 text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-[12px] px-3 py-2">
                  {error}
                </p>
              )}
              {info && (
                <p className="mt-4 text-sm text-primary bg-primary/10 border border-primary/20 rounded-[12px] px-3 py-2">
                  {info}
                </p>
              )}

              <Button
                variant="primary"
                type="submit"
                className="w-full mt-6"
                icon={resetMethod === 'reset-password' ? 'published_with_changes' : 'login'}
                disabled={submitting}
              >
                {submitting
                  ? 'Verifying...'
                  : resetMethod === 'reset-password'
                  ? 'Reset Password & Sign In'
                  : 'Sign In with OTP'}
              </Button>

              <div className="mt-6 flex flex-col gap-2 text-center font-body-sm text-body-sm text-on-surface-variant">
                <div>
                  Didn&apos;t receive the code?{' '}
                  <button
                    type="button"
                    onClick={handleSendResetOtp}
                    className="text-primary font-semibold hover:underline cursor-pointer"
                    disabled={submitting}
                  >
                    Resend code
                  </button>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-primary font-semibold hover:underline cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            </form>
          )}
        </GlassCard>

        <div className="mt-8 text-center flex items-center justify-center gap-2 opacity-60">
          <span className="material-symbols-outlined text-[16px] text-on-surface">lock</span>
          <span className="font-label-caps text-label-caps text-on-surface">
            Secured with Supabase PostgreSQL Auth
          </span>
        </div>
      </main>
    </div>
  );
};
