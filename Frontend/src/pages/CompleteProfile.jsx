import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function CompleteProfile() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [profile, setProfile] = useState({ name: "", age: "", condition: "", medications: "" });

  const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });

  const handleSubmit = () => {
    const fullProfile = { ...profile, medications: profile.medications.split(",").map(m => m.trim()).filter(Boolean) };

    const stored = JSON.parse(localStorage.getItem("users")) || [];
    const updated = stored.map(u => u.email === state.email ? { ...u, profile: fullProfile } : u);
    localStorage.setItem("users", JSON.stringify(updated));

    const userData = { email: state.email, role: state.role, profile: fullProfile };
    localStorage.setItem("currentUser", JSON.stringify(userData));
    login(userData);

    if (state.role === "doctor") navigate("/doctor");
    else navigate("/home");
  };

  const fields = [
    { name:"name",        icon:"👤", label:"Full Name",                   placeholder:"e.g. Prathamesh Sharma",    type:"text" },
    { name:"age",         icon:"🎂", label:"Age",                         placeholder:"e.g. 45",                   type:"number" },
    { name:"condition",   icon:"🏥", label:"Reason for Admission",         placeholder:"e.g. Knee replacement surgery", type:"text" },
    { name:"medications", icon:"💊", label:"Medications (comma separated)", placeholder:"e.g. Aspirin, Metoprolol",  type:"text" },
  ];

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-5 relative overflow-hidden">

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="orb   absolute top-[10%] right-[15%]  w-[400px] h-[400px] bg-indigo-500/[0.07] rounded-full blur-3xl" />
        <div className="orb-2 absolute bottom-[10%] left-[10%] w-[350px] h-[350px] bg-blue-600/[0.06]   rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[420px] relative z-10">

        {/* Header */}
        <div className="text-center mb-7 fade-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[20px] mb-4"
               style={{background:"linear-gradient(135deg,#10b981,#3b82f6)",boxShadow:"0 8px 32px rgba(16,185,129,0.35)"}}>
            <span className="text-3xl">📋</span>
          </div>
          <h1 className="text-[28px] font-bold gradient-text" style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
            Complete Your Profile
          </h1>
          <p className="text-sm mt-1" style={{color:"var(--text-2)"}}>Help us personalize your recovery plan</p>
        </div>

        <div className="glass rounded-[28px] p-8 fade-up-1">
          <div className="space-y-5 mb-7">
            {fields.map(({ name, icon, label, placeholder, type }) => (
              <div key={name}>
                <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest mb-2" style={{color:"var(--text-3)"}}>
                  <span>{icon}</span> {label}
                </label>
                <input
                  type={type}
                  name={name}
                  placeholder={placeholder}
                  className="input-field"
                  onChange={handleChange}
                />
              </div>
            ))}
          </div>

          <button onClick={handleSubmit} className="btn-primary">
            Start My Recovery →
          </button>
        </div>

        <p className="text-center text-[11px] mt-5 fade-up-2" style={{color:"var(--text-3)"}}>
          Your data is private and securely stored
        </p>
      </div>
    </div>
  );
}