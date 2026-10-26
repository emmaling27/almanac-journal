"use client";

import React, { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Anchor, X, Lock, Mail, User, Loader2, AlertCircle } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signIn } = useAuthActions();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signIn") {
        await signIn("password", { email, password, flow: "signIn" });
      } else {
        const params: Record<string, string> = {
          email,
          password,
          flow: "signUp",
        };
        if (name.trim()) {
          params.name = name.trim();
        }
        await signIn("password", params);
      }
      onClose();
    } catch (err: unknown) {
      console.error("Authentication error:", err);
      const msg = err instanceof Error ? err.message : "Authentication failed";
      if (msg.includes("InvalidAccountId") || msg.includes("Could not find account")) {
        setError("No account found with this email. Would you like to create an account?");
      } else if (msg.includes("InvalidSecret") || msg.includes("Incorrect password")) {
        setError("Incorrect password. Please verify your password and try again.");
      } else if (msg.includes("AccountAlreadyExists")) {
        setError("An account with this email already exists. Try signing in.");
      } else {
        setError("Sign-in failed. Please check your credentials and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-[#FAF7F0] border border-[#D8CFBF] rounded-lg shadow-2xl p-6 sm:p-8 space-y-6 text-[#0A192F] relative"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-[#EAE2D2] text-[#7A6B53] hover:text-[#0A192F] transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 border-b border-[#E3DAC9] pb-4">
          <div className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-[0.2em] font-mono text-[#B38F4D]">
            <Anchor className="w-3.5 h-3.5" />
            <span>Captain&apos;s Quarters</span>
            <Anchor className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#0A192F]">
            {mode === "signIn" ? "Sign In to Tidelog" : "Create Your Journal"}
          </h2>
          <p className="text-xs font-mono text-[#5B6B7A]">
            {mode === "signIn"
              ? "Access your reflections, habits, and tide preferences across devices."
              : "Set up your private maritime journal and sync your tide settings."}
          </p>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex rounded-md bg-[#EAE2D2] p-1 border border-[#D8CFBF]">
          <button
            type="button"
            onClick={() => {
              setMode("signIn");
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-mono font-semibold rounded transition-all ${
              mode === "signIn"
                ? "bg-[#0A192F] text-[#F4EFE6] shadow-xs"
                : "text-[#5B6B7A] hover:text-[#0A192F]"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signUp");
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-mono font-semibold rounded transition-all ${
              mode === "signUp"
                ? "bg-[#0A192F] text-[#F4EFE6] shadow-xs"
                : "text-[#5B6B7A] hover:text-[#0A192F]"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded bg-red-50 border border-red-200 text-xs text-red-800 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          {mode === "signUp" && (
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#5B6B7A] uppercase tracking-wider">
                Full Name / Title
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#7A6B53] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Captain Emma"
                  className="w-full pl-9 pr-3 py-2 text-base sm:text-xs bg-white border border-[#D8CFBF] hover:border-[#9A8F7D] rounded text-[#0A192F] placeholder-[#9A8F7D] focus:outline-none focus:border-[#0A192F] focus:ring-2 focus:ring-[#0A192F]/20 shadow-2xs focus:shadow-sm transition-all"
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-[#5B6B7A] uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#7A6B53] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sailor@sfbay.org"
                className="w-full pl-9 pr-3 py-2 text-base sm:text-xs bg-white border border-[#D8CFBF] hover:border-[#9A8F7D] rounded text-[#0A192F] placeholder-[#9A8F7D] focus:outline-none focus:border-[#0A192F] focus:ring-2 focus:ring-[#0A192F]/20 shadow-2xs focus:shadow-sm transition-all"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-[#5B6B7A] uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#7A6B53] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 text-base sm:text-xs bg-white border border-[#D8CFBF] hover:border-[#9A8F7D] rounded text-[#0A192F] placeholder-[#9A8F7D] focus:outline-none focus:border-[#0A192F] focus:ring-2 focus:ring-[#0A192F]/20 shadow-2xs focus:shadow-sm transition-all"
                autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              />
            </div>
            <p className="text-[10px] text-[#7A6B53]">
              {mode === "signUp"
                ? "At least 8 characters. You can use Touch ID or passkeys to save this in your keychain."
                : "Stored securely with Convex Auth end-to-end authentication."}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-[#0A192F] hover:bg-[#142C4B] disabled:opacity-50 text-[#F4EFE6] font-mono text-xs font-semibold uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {mode === "signIn"
                ? loading
                  ? "Authenticating..."
                  : "Sign In"
                : loading
                ? "Creating Account..."
                : "Create Account"}
            </span>
          </button>
        </form>

        <div className="text-center pt-2 text-[11px] font-mono text-[#7A6B53]">
          {mode === "signIn" ? (
            <p>
              Need a journal?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signUp");
                  setError(null);
                }}
                className="text-[#0A192F] font-bold underline hover:text-[#B38F4D]"
              >
                Create one now
              </button>
            </p>
          ) : (
            <p>
              Already registered?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signIn");
                  setError(null);
                }}
                className="text-[#0A192F] font-bold underline hover:text-[#B38F4D]"
              >
                Sign in here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
