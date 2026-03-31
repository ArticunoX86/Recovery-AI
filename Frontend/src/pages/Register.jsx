import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../utils/auth";

export default function Register() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [doctorCode, setDoctorCode] = useState("");
  const [regError, setRegError] = useState("");
  const navigate = useNavigate();

  const handleRegister = () => {
    setRegError("");
    
    // Add Medical Security check for doctors
    if (role === "doctor" && doctorCode !== "HEAL2024") {
      setRegError("Invalid Doctor Registration Code. Please contact administration.");
      return;
    }

    const result = registerUser({ email, password, role, doctorCode });
    if (!result.success) { setRegError(result.message || "Registration failed."); return; }
    navigate("/complete-profile", { state: { role, email } });
  };

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-5 relative overflow-hidden">

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="orb-2 absolute top-[20%]  right-[10%]  w-[450px] h-[450px] bg-indigo-600/[0.08] rounded-full blur-3xl" />
        <div className="orb   absolute bottom-[15%] left-[8%]   w-[400px] h-[400px] bg-blue-600/[0.07]   rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[380px] relative z-10">

        {/* Brand */}
        <div className="text-center mb-7 fade-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[20px] mb-4"
               style={{background:"linear-gradient(135deg,#3b82f6,#6366f1)",boxShadow:"0 8px 32px rgba(99,102,241,0.4)"}}>
            <span className="text-3xl">🫀</span>
          </div>
          <h1 className="text-[28px] font-bold gradient-text" style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
            {step === 1 ? "Join RecoveryAI" : "Create Account"}
          </h1>
          <p className="text-sm mt-1" style={{color:"var(--text-2)"}}>Step {step} of 2</p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-7 fade-up">
          {[1,2].map(s => (
            <div key={s} className="h-1 flex-1 rounded-full transition-all duration-500"
                 style={{background: s <= step ? "linear-gradient(90deg,#3b82f6,#6366f1)" : "rgba(255,255,255,0.08)"}} />
          ))}
        </div>

        <div className="glass rounded-[28px] p-8 fade-up-1">

          {/* Step 1: Role Select */}
          {step === 1 && (
            <div>
              <p className="text-sm text-center mb-5" style={{color:"var(--text-2)"}}>Who are you joining as?</p>
              <div className="grid grid-cols-2 gap-3 mb-7">
                {[
                  { v:"patient", icon:"🧑", label:"Patient", desc:"Track my recovery" },
                  { v:"doctor",  icon:"👨‍⚕️", label:"Doctor",  desc:"Monitor patients" },
                ].map(({ v, icon, label, desc }) => (
                  <button key={v} onClick={() => setRole(v)}
                    className="p-5 rounded-[20px] text-left transition-all duration-200"
                    style={role===v
                      ? {border:"1px solid rgba(99,102,241,0.5)", background:"rgba(99,102,241,0.1)", boxShadow:"0 4px 20px rgba(99,102,241,0.2)"}
                      : {border:"1px solid var(--border)", background:"rgba(255,255,255,0.04)"}}>
                    <span className="text-3xl block mb-3">{icon}</span>
                    <p className="text-sm font-semibold" style={{color: role===v ? "#818cf8" : "var(--text-1)"}}>{label}</p>
                    <p className="text-xs mt-0.5" style={{color:"var(--text-3)"}}>{desc}</p>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(2)} className="btn-primary">Continue →</button>
            </div>
          )}

          {/* Step 2: Credentials */}
          {step === 2 && (
            <div>
              <p className="text-sm text-center mb-5" style={{color:"var(--text-2)"}}>Set up your credentials</p>
              <div className="space-y-4 mb-5">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{color:"var(--text-3)"}}>Email</label>
                  <input type="email" placeholder="you@example.com" className="input-field" onChange={e => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{color:"var(--text-3)"}}>Password</label>
                  <input type="password" placeholder="Create a strong password" className="input-field"
                    onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && role !== "doctor" && handleRegister()} />
                </div>
                {role === "doctor" && (
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{color:"#f87171"}}>Doctor Registration Code</label>
                    <input type="text" placeholder="Provided by Admin (e.g. HEAL2024)" className="input-field"
                      onChange={e => setDoctorCode(e.target.value)} onKeyDown={e => e.key === "Enter" && handleRegister()} />
                  </div>
                )}
              </div>
              {regError && (
                <div className="mb-4 px-4 py-3 rounded-2xl text-[13px]" style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",color:"#f87171"}}>
                  ⚠ {regError}
                </div>
              )}
              <button onClick={handleRegister} className="btn-primary mb-3">Complete Registration →</button>
              <button onClick={() => setStep(1)} className="btn-secondary">← Back</button>
            </div>
          )}
        </div>

        <p className="text-center text-[13px] mt-5 fade-up-2" style={{color:"var(--text-3)"}}>
          Already have an account?{" "}
          <span onClick={() => navigate("/login")} className="cursor-pointer" style={{color:"#60a5fa"}}>Sign in</span>
        </p>
      </div>
    </div>
  );
}