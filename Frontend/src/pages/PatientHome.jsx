import { useEffect, useState, useCallback } from "react";
import { db } from "../firebase";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import ScoreBadge from "../components/ScoreBadge";
import ChatBot from "../components/ChatBot";
import { getCurrentUser, logoutUser } from "../utils/auth";

const FALLBACK_GOALS = [
  { icon:"🚶", label:"Walk at least 3,000 steps",              type:"activity" },
  { icon:"💊", label:"Take all prescribed medications on time", type:"medication" },
  { icon:"💧", label:"Drink at least 8 glasses of water",       type:"nutrition" },
  { icon:"😴", label:"Rest adequately — 7 to 8 hours of sleep", type:"rest" },
  { icon:"📝", label:"Complete your daily check-in",            type:"monitoring" },
];

function CircularScore({ score, color }) {
  const [animScore, setAnimScore] = useState(0);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animScore / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimScore(score || 0), 100);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="relative flex justify-center items-center my-6">
      <svg width="160" height="160" style={{ filter: `drop-shadow(0 0 16px ${color}66)` }}>
        <circle cx="80" cy="80" r={radius} stroke={color} strokeWidth="10" fill="none" className="score-bg-ring" />
        <circle cx="80" cy="80" r={radius} stroke={color} strokeWidth="10" fill="none" 
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} 
          strokeLinecap="round" className="score-ring" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-[48px] font-black leading-none score-animate" style={{color: color, fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
          {animScore}
        </span>
      </div>
    </div>
  );
}

function Motivation({ score }) {
  if (score == null) return (
    <div className="glass rounded-[20px] p-4 fade-up mb-4" style={{borderColor:"rgba(59,130,246,0.25)"}}>
      <p className="text-sm font-medium" style={{color:"#60a5fa"}}>📊 Complete your check-in to track today's recovery</p>
    </div>
  );
  if (score >= 75) return (
    <div className="rounded-[20px] p-4 fade-up mb-4" style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)"}}>
      <p className="text-sm font-medium" style={{color:"#34d399"}}>🌟 Great progress! You're on track — keep it up!</p>
    </div>
  );
  if (score >= 50) return (
    <div className="rounded-[20px] p-4 fade-up mb-4" style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)"}}>
      <p className="text-sm font-medium" style={{color:"#fbbf24"}}>💛 You're doing okay. Stay consistent with meds and rest.</p>
    </div>
  );
  return (
    <div className="rounded-[20px] p-4 fade-up mb-4" style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)"}}>
      <p className="text-sm font-medium" style={{color:"#f87171"}}>⚠️ Score is low — contact your doctor or use the assistant below.</p>
    </div>
  );
}

export default function PatientHome() {
  const navigate = useNavigate();
  const [lastLog, setLastLog] = useState(null);
  const [history, setHistory] = useState([]);
  const [doctorNote, setDoctorNote] = useState(null);
  const [riskAnalysis, setRiskAnalysis] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [user, setUser] = useState(null);
  const [aiGoals, setAiGoals] = useState([]);
  const [planLoading, setPlanLoading] = useState(false);
  const [reminderTime, setReminderTime] = useState(() => localStorage.getItem("medReminderTime") || "");
  const [reminderSet, setReminderSet] = useState(!!localStorage.getItem("medReminderTime"));
  const [showReminderForm, setShowReminderForm] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (u) setUser(u); else navigate("/login");
  }, []);

  const PATIENT_ID = user?.email || "guest";

  useEffect(() => {
    if (!PATIENT_ID || PATIENT_ID === "guest") return;
    const q = query(collection(db,"logs"), where("patientId","==",PATIENT_ID), orderBy("timestamp","desc"), limit(1));
    return onSnapshot(q, snap => { if (!snap.empty) setLastLog(snap.docs[0].data()); });
  }, [PATIENT_ID]);

  useEffect(() => {
    if (!PATIENT_ID || PATIENT_ID === "guest") return;
    const q = query(collection(db,"logs"), where("patientId","==",PATIENT_ID), orderBy("timestamp","desc"), limit(5));
    return onSnapshot(q, snap => setHistory(snap.docs.map(d => d.data())));
  }, [PATIENT_ID]);

  useEffect(() => {
    if (!PATIENT_ID || PATIENT_ID === "guest") return;
    const q = query(collection(db,"recommendations"), where("patientId","==",PATIENT_ID), orderBy("timestamp","desc"), limit(1));
    return onSnapshot(q, snap => { if (!snap.empty) setDoctorNote(snap.docs[0].data()); });
  }, [PATIENT_ID]);

  useEffect(() => {
    if (!PATIENT_ID || PATIENT_ID === "guest") return;
    const q = query(collection(db,"riskAssessments"), where("patientId","==",PATIENT_ID), orderBy("timestamp","desc"), limit(1));
    return onSnapshot(q, snap => { if (!snap.empty) setRiskAnalysis(snap.docs[0].data()); });
  }, [PATIENT_ID]);

  useEffect(() => {
    if (!user?.profile) return;
    const cacheKey = `recoveryPlan_${user.email}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) { try { setAiGoals(JSON.parse(cached)); return; } catch {} }
    const fetchPlan = async () => {
      setPlanLoading(true);
      try {
        const res = await fetch("http://localhost:5000/generate-plan", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ condition: user.profile.condition, medications: user.profile.medications, age: user.profile.age }),
        });
        const data = await res.json();
        setAiGoals(data.goals || FALLBACK_GOALS);
        localStorage.setItem(cacheKey, JSON.stringify(data.goals || FALLBACK_GOALS));
      } catch { setAiGoals(FALLBACK_GOALS); }
      setPlanLoading(false);
    };
    fetchPlan();
  }, [user]);

  const setReminder = useCallback(() => {
    if (!reminderTime) return;
    localStorage.setItem("medReminderTime", reminderTime);
    if (!("Notification" in window)) return;
    Notification.requestPermission().then(p => {
      if (p !== "granted") return;
      const [h, m] = reminderTime.split(":").map(Number);
      const target = new Date(); target.setHours(h, m, 0, 0);
      if (target <= new Date()) target.setDate(target.getDate() + 1);
      setTimeout(() => {
        new Notification("💊 Medication Reminder — RecoveryAI", {
          body: `Time: ${(user?.profile?.medications||[]).join(", ") || "your medications"}`,
        });
      }, target - new Date());
      setReminderSet(true); setShowReminderForm(false);
    });
  }, [reminderTime, user]);

  const isGoalDone = (goal) => {
    if (!lastLog) return false;
    if (goal.type === "activity")   return (lastLog.steps ?? 0) >= 3000;
    if (goal.type === "medication") return lastLog.medsToken === 100;
    if (goal.type === "monitoring") return true;
    return false;
  };

  const medications = user?.profile?.medications || [];
  const scoreColor = !lastLog ? "#60a5fa" : lastLog.recoveryScore >= 75 ? "#10b981" : lastLog.recoveryScore >= 50 ? "#f59e0b" : "#ef4444";

  const meshGradient = !lastLog ? "" : lastLog.recoveryScore >= 75
    ? "radial-gradient(circle at 0% 0%, rgba(16, 185, 129, 0.08) 0vw, transparent 50vw), radial-gradient(circle at 100% 100%, rgba(59, 130, 246, 0.05) 0vw, transparent 50vw)"
    : lastLog.recoveryScore >= 50
    ? "radial-gradient(circle at 0% 0%, rgba(245, 158, 11, 0.08) 0vw, transparent 50vw), radial-gradient(circle at 100% 100%, rgba(239, 68, 68, 0.03) 0vw, transparent 50vw)"
    : "radial-gradient(circle at 0% 0%, rgba(239, 68, 68, 0.12) 0vw, transparent 50vw), radial-gradient(circle at 100% 100%, rgba(245, 158, 11, 0.05) 0vw, transparent 50vw)";

  return (
    <div className="min-h-screen bg-mesh relative" style={{paddingBottom:"40px"}}>
      {/* Ambient Reality Lighting */}
      <div className="fixed inset-0 pointer-events-none transition-all duration-[2000ms] ease-in-out z-0"
           style={{ background: meshGradient }} />

      {/* Sticky header */}
      <div className="sticky top-0 z-20 px-5 pt-12 pb-4" style={{background:"rgba(4,8,18,0.85)", backdropFilter:"blur(24px)", borderBottom:"1px solid var(--border)"}}>
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold" style={{fontFamily:"'Plus Jakarta Sans',sans-serif", color:"var(--text-1)"}}>
              Hello, {user?.profile?.name || "User"} 👋
            </h1>
            <p className="text-xs" style={{color:"var(--text-2)"}}>{user?.profile?.condition || "Recovery"}</p>
          </div>
          <button onClick={() => { logoutUser(); navigate("/login"); }}
            className="text-xs px-4 py-2 rounded-xl transition-all"
            style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",color:"#f87171"}}>
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 pt-5 space-y-4 relative z-10">

        {/* Motivation */}
        <Motivation score={lastLog?.recoveryScore} />

        {/* Score card */}
        <div className="cyber-glass rounded-[28px] p-6 text-center fade-up-1 hover-lift"
             style={lastLog ? {boxShadow: `0 0 60px ${scoreColor}15`} : {}}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{color:"var(--text-3)"}}>Recovery Score</p>
          {lastLog ? (
            <>
              <CircularScore score={lastLog.recoveryScore} color={scoreColor} />
              <ScoreBadge score={lastLog.recoveryScore} />
              <div className="grid grid-cols-3 gap-3 mt-6">
                {[["Pain",`${lastLog.pain}/10`],["Steps",lastLog.steps?.toLocaleString()],["Meds",`${lastLog.medsToken}%`]].map(([l,v]) => (
                  <div key={l} className="rounded-2xl py-3 px-2 transition-all hover:bg-white/5" style={{background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)"}}>
                    <p className="text-[10px] uppercase tracking-widest mb-1" style={{color:"var(--text-3)"}}>{l}</p>
                    <p className="font-bold text-sm" style={{color:"var(--text-1)"}}>{v}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-8">
              <div className="text-5xl mb-3">🫀</div>
              <p style={{color:"var(--text-2)"}} className="text-sm">No check-in yet today</p>
              <p className="text-xs mt-1" style={{color:"var(--text-3)"}}>Complete your first check-in below</p>
            </div>
          )}
        </div>

        {/* AI Risk Engine Card */}
        {riskAnalysis && (
          <div className="cyber-glass ai-scanner rounded-[24px] p-5 fade-up-1 hover-lift" style={{ border: riskAnalysis.riskLevel === "HIGH" ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(16,185,129,0.2)" }}>
            <div className="flex justify-between items-center mb-4 relative z-10">
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{color:"var(--text-3)"}}>⚡ AI Risk Engine</p>
              <span className="text-[10px] font-bold px-2 py-1 rounded-md" style={{
                background: riskAnalysis.riskLevel === "HIGH" ? "rgba(239,68,68,0.2)" : riskAnalysis.riskLevel === "MODERATE" ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)",
                color: riskAnalysis.riskLevel === "HIGH" ? "#f87171" : riskAnalysis.riskLevel === "MODERATE" ? "#fbbf24" : "#34d399",
                boxShadow: riskAnalysis.riskLevel === "HIGH" ? "0 0 10px rgba(239,68,68,0.4)" : "none"
              }}>
                {riskAnalysis.riskLevel} RISK · {riskAnalysis.trend}
              </span>
            </div>
            
            <div className="space-y-3 relative z-10">
              <div className="rounded-xl p-3" style={{background:"rgba(255,255,255,0.03)"}}>
                <p className="text-[10px] uppercase tracking-widest mb-1" style={{color:"var(--text-3)"}}>Pattern Detected</p>
                <p className="text-sm font-medium" style={{color:"var(--text-1)"}}>{riskAnalysis.patternDetected}</p>
              </div>
              
              <div className="rounded-xl p-3" style={{background: riskAnalysis.riskLevel === "HIGH" ? "rgba(239,68,68,0.15)" : "rgba(59,130,246,0.15)", border: riskAnalysis.riskLevel === "HIGH" ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(59,130,246,0.3)"}}>
                <p className="text-[10px] uppercase font-bold tracking-widest mb-1" style={{color: riskAnalysis.riskLevel === "HIGH" ? "#fca5a5" : "#93c5fd"}}>Actionable Intervention</p>
                <p className="text-sm font-semibold" style={{color: riskAnalysis.riskLevel === "HIGH" ? "#fef2f2" : "#eff6ff"}}>{riskAnalysis.intervention}</p>
              </div>

              {riskAnalysis.simulation && (
                <div className="rounded-xl p-3" style={{background:"rgba(245,158,11,0.05)", border:"1px solid rgba(245,158,11,0.2)"}}>
                  <p className="text-[10px] uppercase font-bold tracking-widest mb-1" style={{color:"#fbbf24"}}>Prediction Engine</p>
                  <p className="text-sm" style={{color:"#fcd34d"}}>{riskAnalysis.simulation}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recovery History */}
        {history.length > 0 && (
          <div className="glass rounded-[24px] p-5 fade-up-2">
            <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{color:"var(--text-3)"}}>📈 Recovery History</p>
            <div className="space-y-3">
              {history.map((log, i) => {
                const c = log.recoveryScore >= 75 ? "#10b981" : log.recoveryScore >= 50 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[11px] w-12 flex-shrink-0" style={{color:"var(--text-3)"}}>
                      {i === 0 ? "Today" : `${i}d ago`}
                    </span>
                    <div className="flex-1 h-2 rounded-full" style={{background:"rgba(255,255,255,0.06)"}}>
                      <div className="h-2 rounded-full transition-all duration-700" style={{width:`${log.recoveryScore}%`,background:`linear-gradient(90deg,${c}aa,${c})`}} />
                    </div>
                    <span className="text-xs font-bold w-7 text-right flex-shrink-0" style={{color:c}}>{log.recoveryScore}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recovery Plan */}
        <div className="glass rounded-[24px] p-5 fade-up-3">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{color:"var(--text-3)"}}>📋 Recovery Plan</p>
            {aiGoals.length > 0 && (
              <button onClick={() => { localStorage.removeItem(`recoveryPlan_${user?.email}`); setAiGoals([]); }}
                className="text-[11px] transition-colors" style={{color:"var(--text-3)"}}>
                ↻ Refresh
              </button>
            )}
          </div>

          {/* Doctor Note */}
          {doctorNote && (
            <div className="rounded-2xl p-3.5 mb-4" style={{background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.2)"}}>
              <p className="text-[11px] font-bold mb-1" style={{color:"#60a5fa"}}>👨‍⚕️ Doctor's Note</p>
              <p className="text-sm" style={{color:"#93c5fd"}}>{doctorNote.note}</p>
            </div>
          )}

          {/* AI Goals */}
          {planLoading ? (
            <div className="py-4 text-center shimmer rounded-xl">
              <p className="text-xs py-4" style={{color:"var(--text-3)"}}>✨ Generating your personalized plan...</p>
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              <p className="text-sm font-semibold mb-2" style={{color:"var(--text-1)"}}>
                Daily Goals
                {aiGoals.length > 0 && <span className="text-[11px] ml-2 font-normal" style={{color:"#818cf8"}}>AI-personalized ✨</span>}
              </p>
              {(aiGoals.length > 0 ? aiGoals : FALLBACK_GOALS).map((goal, i) => {
                const done = isGoalDone(goal);
                return (
                  <div key={i} className="flex items-center gap-3 py-1">
                    <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all"
                         style={done
                           ? {background:"linear-gradient(135deg,#10b981,#059669)", boxShadow:"0 0 10px rgba(16,185,129,0.4)"}
                           : {border:"1.5px solid rgba(255,255,255,0.15)"}}>
                      {done && <span className="text-[10px] text-white font-bold">✓</span>}
                    </div>
                    <span className="text-sm" style={{color: done ? "var(--text-3)" : "var(--text-1)", textDecoration: done ? "line-through" : "none"}}>
                      {goal.icon} {goal.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Medications */}
          {medications.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-semibold mb-2" style={{color:"var(--text-1)"}}>Medications</p>
              <div className="flex flex-wrap gap-2">
                {medications.map((med,i) => (
                  <span key={i} className="text-xs px-3 py-1.5 rounded-xl font-medium" style={{background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.25)",color:"#60a5fa"}}>
                    💊 {med.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reminder */}
          {medications.length > 0 && (
            <div style={{borderTop:"1px solid var(--border)", paddingTop:"12px"}}>
              {!showReminderForm ? (
                <button onClick={() => setShowReminderForm(true)}
                  className="text-xs flex items-center gap-2 transition-colors"
                  style={{color: reminderSet ? "#34d399" : "var(--text-3)"}}>
                  🔔 {reminderSet ? `Reminder set for ${reminderTime}` : "Set medication reminder"}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)} className="input-field" style={{flex:1}} />
                  <button onClick={setReminder} className="px-4 py-2 rounded-xl text-xs font-semibold text-white flex-shrink-0"
                    style={{background:"linear-gradient(135deg,#3b82f6,#6366f1)"}}>Set</button>
                  <button onClick={() => setShowReminderForm(false)} className="text-xs flex-shrink-0" style={{color:"var(--text-3)"}}>✕</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <button onClick={() => navigate("/checkin")} className="btn-primary fade-up-4">
          📋 Start Today's Check-in
        </button>
        <button onClick={() => setShowChat(!showChat)} className="btn-secondary fade-up-4">
          {showChat ? "Hide Care Assistant" : "💬 Ask Care Assistant"}
        </button>

        {showChat && <ChatBot patientLog={lastLog} patientProfile={user?.profile} />}
      </div>
    </div>
  );
}