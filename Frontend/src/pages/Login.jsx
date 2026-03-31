import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginUser } from "../utils/auth";

export default function Login() {
  const [role, setRole] = useState("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = () => {
    setError("");
    const result = loginUser(email, password);
    if (!result.success) { setError("Invalid email or password. Please register first."); return; }
    const userData = { ...result.user, role };
    login(userData);
    if (role === "doctor") navigate("/doctor");
    else navigate("/home");
  };

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-5 relative overflow-hidden">

      {/* Animated background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="orb   absolute top-[15%]  left-[10%]  w-[500px] h-[500px] bg-blue-600/[0.07]   rounded-full blur-3xl" />
        <div className="orb-2 absolute bottom-[10%] right-[5%]  w-[450px] h-[450px] bg-indigo-500/[0.08]  rounded-full blur-3xl" />
        <div className="orb-3 absolute top-[60%]  left-[45%]  w-[300px] h-[300px] bg-violet-500/[0.05]  rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[380px] relative z-10">

        {/* Brand hero */}
        <div className="text-center mb-8 fade-up">
          <div className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-[22px] mb-5"
               style={{background:"linear-gradient(135deg,#3b82f6,#6366f1)", boxShadow:"0 8px 32px rgba(99,102,241,0.4)"}}>
            <span className="text-[32px]">🫀</span>
          </div>
          <h1 className="text-[32px] font-bold gradient-text leading-tight mb-1"
              style={{fontFamily:"'Plus Jakarta Sans', sans-serif"}}>RecoveryAI</h1>
          <p className="text-sm" style={{color:"var(--text-2)"}}>Intelligent Post-Discharge Care</p>
        </div>

        {/* Glass card */}
        <div className="glass rounded-[28px] p-8 fade-up-1">

          {/* Role toggle */}
          <div className="flex gap-1.5 p-1.5 rounded-2xl mb-7" style={{background:"rgba(255,255,255,0.04)", border:"1px solid var(--border)"}}>
            {[{v:"patient",icon:"🧑",label:"Patient"},{v:"doctor",icon:"👨‍⚕️",label:"Doctor"}].map(({v,icon,label}) => (
              <button key={v} onClick={() => setRole(v)}
                className="flex-1 py-2.5 rounded-[14px] text-[13px] font-semibold transition-all duration-200"
                style={role===v ? {background:"linear-gradient(135deg,#3b82f6,#6366f1)",color:"white",boxShadow:"0 4px 16px rgba(99,102,241,0.4)"} : {color:"var(--text-2)"}}>
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{color:"var(--text-3)"}}>Email</label>
              <input type="email" placeholder="you@example.com" className="input-field" onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{color:"var(--text-3)"}}>Password</label>
              <input type="password" placeholder="••••••••" className="input-field" onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-2xl text-[13px]" style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",color:"#f87171"}}>
              ⚠ {error}
            </div>
          )}

          {/* CTA */}
          <button onClick={handleLogin} className="btn-primary mb-5">
            Sign in as {role === "doctor" ? "Doctor" : "Patient"} →
          </button>

          {/* Links */}
          <div className="flex justify-between text-[13px]">
            <span className="cursor-pointer transition-colors" style={{color:"var(--text-3)"}}>Forgot password?</span>
            <span onClick={() => navigate("/register")} className="cursor-pointer font-medium transition-colors" style={{color:"#60a5fa"}}>
              Create account →
            </span>
          </div>
        </div>

        {/* Bottom note */}
        <p className="text-center text-[11px] mt-6 fade-up-2" style={{color:"var(--text-3)"}}>
          🔒 Secure · AI-powered · Healthcare-grade
        </p>
      </div>
    </div>
  );
}