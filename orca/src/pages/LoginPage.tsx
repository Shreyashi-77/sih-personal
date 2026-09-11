
import { useState } from "react";
import {
  ShipIcon,
  ArrowRight01Icon,
  LanguageSquareIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

const languages = [
  { code: "en", name: "English" },
  { code: "hi", name: "हिंदी (Hindi)" },
  { code: "ta", name: "தமிழ் (Tamil)" },
  { code: "te", name: "తెలుగు (Telugu)" },
  { code: "bn", name: "বাংলা (Bengali)" },
];

interface LoginPageProps {
  onLogin: (user: { fullName: string; email: string }, language: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [isRegistering, setIsRegistering] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState("en");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      let user;

      if (isRegistering) {
        // --------------------------------
        // REGISTER WITH EMAIL + PASSWORD
        // --------------------------------

        const result = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        user = result.user;

        // Store user's name in Firebase profile
        await updateProfile(user, {
          displayName: fullName,
        });

        console.log("Registration successful");
        console.log("Firebase UID:", user.uid);
        console.log("Email:", user.email);
        console.log("Name:", user.displayName);
      } else {
        // --------------------------------
        // LOGIN WITH EMAIL + PASSWORD
        // --------------------------------

        const result = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        user = result.user;

        console.log("Login successful");
        console.log("Firebase UID:", user.uid);
        console.log("Email:", user.email);
        console.log("Name:", user.displayName);
      }

      // Firebase keeps the authentication session.
      // Get the ID token for your backend later.
      const idToken = await user.getIdToken();

      console.log("Firebase ID Token:", idToken);

      // Send user information to App
      onLogin(
        {
          fullName: user.displayName || fullName || "",
          email: user.email || email,
        },
        language
      );
    } catch (err: any) {
      console.error(err);

      switch (err.code) {
        case "auth/email-already-in-use":
          setError("An account with this email already exists.");
          break;

        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;

        case "auth/weak-password":
          setError("Password must be at least 6 characters.");
          break;

        case "auth/invalid-credential":
          setError("Invalid email or password.");
          break;

        case "auth/user-not-found":
          setError("No account exists with this email.");
          break;

        case "auth/wrong-password":
          setError("Incorrect password.");
          break;

        default:
          setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(auth, provider);

      const user = result.user;

      console.log("Google authentication successful");
      console.log("Firebase UID:", user.uid);
      console.log("Name:", user.displayName);
      console.log("Email:", user.email);

      // Get Firebase ID token for your backend
      const idToken = await user.getIdToken();

      console.log("Firebase ID Token:", idToken);

      onLogin(
        {
          fullName: user.displayName || "",
          email: user.email || "",
        },
        language
      );
    } catch (err: any) {
      console.error(err);

      if (err.code === "auth/popup-closed-by-user") {
        setError("Google sign-in was cancelled.");
      } else {
        setError("Google authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsRegistering(!isRegistering);
    setError("");
    setPassword("");
  };

  return (
    <div className="min-h-dvh w-full flex items-center justify-center bg-background relative overflow-hidden">

      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Login / Register Card */}
      <div className="w-full max-w-md p-6 md:p-8 relative z-10">

        {/* Logo + Heading */}
        <div className="flex flex-col items-center mb-10">

          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6">
            <HugeiconsIcon
              icon={ShipIcon}
              size={32}
              className="text-white"
            />
          </div>

          <h1 className="text-3xl font-bold tracking-tight mb-2 text-center">
            {isRegistering ? "Register for ORCA" : "Welcome to ORCA"}
          </h1>

          <p className="text-muted-foreground text-center">
            {isRegistering
              ? "Create your account to access your marine dashboard and real-time PFZ alerts."
              : "Sign in to access your marine dashboard and real-time PFZ alerts."}
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">

          {/* Language */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              App Language
            </label>

            <div className="relative">

              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                <HugeiconsIcon
                  icon={LanguageSquareIcon}
                  size={20}
                />
              </div>

              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-input bg-background/50 backdrop-blur-sm pl-10 pr-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all shadow-sm appearance-none cursor-pointer"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>

            </div>
          </div>

          {/* Full Name - ONLY during registration */}
          {isRegistering && (
            <div className="space-y-2">

              <label className="text-sm font-medium">
                Full Name
              </label>

              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Captain Nemo"
                className="flex h-11 w-full rounded-xl border border-input bg-background/50 backdrop-blur-sm px-4 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all shadow-sm"
              />

            </div>
          )}

          {/* Email */}
          <div className="space-y-2">

            <label className="text-sm font-medium">
              Email Address
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="captain@vessel.com"
              className="flex h-11 w-full rounded-xl border border-input bg-background/50 backdrop-blur-sm px-4 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all shadow-sm"
            />

          </div>

          {/* Password */}
          <div className="space-y-2">

            <div className="flex items-center justify-between">

              <label className="text-sm font-medium">
                Password
              </label>

              {!isRegistering && (
                <button
                  type="button"
                  className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
                  onClick={() => {
                    setError("Password reset can be added next.");
                  }}
                >
                  Forgot password?
                </button>
              )}

            </div>

            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="flex h-11 w-full rounded-xl border border-input bg-background/50 backdrop-blur-sm px-4 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all shadow-sm"
            />

          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          )}

          {/* Email Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25 mt-4"
          >
            {loading ? (
              <span className="flex items-center gap-2">

                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />

                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>

                {isRegistering
                  ? "Creating account..."
                  : "Authenticating..."}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {isRegistering ? "Register" : "Sign In"}

                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={18}
                />
              </span>
            )}
          </button>

        </form>

        {/* Google */}
        <div className="relative my-6">

          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>

          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs text-muted-foreground">
              OR
            </span>
          </div>

        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full h-11 inline-flex items-center justify-center gap-3 rounded-xl border border-input bg-background/50 hover:bg-muted transition-all disabled:opacity-50"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
          >
            <path
              fill="#4285F4"
              d="M21.35 12.27c0-.79-.07-1.55-.22-2.27H12v4.3h5.22a4.46 4.46 0 0 1-1.94 2.92v2.43h3.14c1.84-1.7 2.93-4.21 2.93-7.38z"
            />
            <path
              fill="#34A853"
              d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.43c-.87.58-1.98.93-3.31.93-2.54 0-4.69-1.72-5.46-4.03H3.3v2.5A9.74 9.74 0 0 0 12 21.75z"
            />
            <path
              fill="#FBBC05"
              d="M6.54 13.86a5.85 5.85 0 0 1 0-3.72v-2.5H3.3a9.75 9.75 0 0 0 0 8.72l3.24-2.5z"
            />
            <path
              fill="#EA4335"
              d="M12 6.11c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.16 14.63 2.25 12 2.25a9.74 9.74 0 0 0-8.7 5.39l3.24 2.5C6.31 7.83 8.46 6.11 12 6.11z"
            />
          </svg>

          Continue with Google
        </button>

        {/* Register / Login Switch */}
        <p className="text-center text-sm text-muted-foreground mt-8">

          {isRegistering
            ? "Already have an account?"
            : "Don't have an account?"}

          <button
            type="button"
            onClick={switchMode}
            className="ml-1 font-medium text-blue-500 hover:text-blue-600"
          >
            {isRegistering ? "Sign In" : "Register Vessel"}
          </button>

        </p>

      </div>
    </div>
  );
}

