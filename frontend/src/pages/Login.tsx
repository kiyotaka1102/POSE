import { useState } from 'react';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
interface LoginPageProps {
  onLogin: (email: string, password: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = () => {
    if (email && password) {
      onLogin(email, password);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-cyan-400 relative overflow-hidden">
      <div 
        className="absolute inset-0 bg-contain bg-opacity-25 bg-center bg-no-repeat bg-[url('/logo.png')]"
      />

      {/* Optional: Dark overlay để tăng độ tương phản */}
      <div className="absolute inset-0 bg-linear-to-br from-black/80 via-black/50 to-black/80" />

      {/* Login Card - Chính giữa màn hình */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold text-white mb-3 tracking-tight">
            Welcome Back
          </h1>
          <p className="text-gray-300 text-lg">Sign in to continue to your account</p>
        </div>

        {/* Glassmorphism Card */}
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-10">
          <div className="space-y-7">

            {/* Email Field */}
            <div>
              <label className="text-sm font-medium text-white/90">Email Address</label>
              <div className="mt-2 relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="text-sm font-medium text-white/90">Password</label>
              <div className="mt-2 relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-12 pr-14 py-4 bg-white/10 border border-white/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="bg-transparent bg-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>


            {/* Sign In Button */}
            <button
              onClick={handleSubmit}
              disabled={!email || !password}
              className="w-full py-4 px-6 bg-linear-to-r from-blue-600 to-purple-600 text-white text-lg font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 active:scale-95 transition-all duration-200 shadow-2xl hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              Sign In
            </button>

          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-5">
          By signing in, you agree to our{' '}
          <a href="#" className="text-blue-700 hover:underline">Terms</a> and{' '}
          <a href="#" className="text-blue-700 hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}