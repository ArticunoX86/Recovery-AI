import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../utils/auth";

const SYMPTOMS = ["Fever","Chest pain","Swelling","Shortness of breath","Nausea","Fatigue","Wound pain"];

function calcScore(pain, mood, steps, medsTaken) {
  const painScore = (1 - (pain - 1) / 9) * 100;
  const medScore = medsTaken ? 100 : 0;
  const actScore = Math.min(steps / 5000, 1) * 100;
  const moodScore = ((mood - 1) / 4) * 100;
  return Math.round(painScore * 0.30 + medScore * 0.25 + actScore * 0.20 + moodScore * 0.25);
}

export default function CheckIn() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [pain, setPain] = useState(5);
  const [mood, setMood] = useState(3);
  const [steps, setSteps] = useState(1000);
  const [medsTaken, setMedsTaken] = useState(true);
  const [symptoms, setSymptoms] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) navigate("/login");
    else setUser(currentUser);
  }, []);

  const PATIENT_ID = user?.email || "guest";
  const toggleSymptom = (s) => setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const handleSubmit = async () => {
    setSubmitting(true);
    const score = calcScore(pain, mood, steps, medsTaken);
    
    // Save daily log
    await addDoc(collection(db, "logs"), {
      patientId: PATIENT_ID,
      name: user?.profile?.name,
      condition: user?.profile?.condition,
      pain, mood, steps,
      medsToken: medsTaken ? 100 : 0,
      symptoms,
      recoveryScore: score,
      timestamp: serverTimestamp(),
    });

    // Fetch Last 3 Logs for Risk Engine
    let pastLogs = [];
    try {
      const q = query(collection(db, "logs"), where("patientId", "==", PATIENT_ID), orderBy("timestamp", "desc"), limit(3));
      const snap = await getDocs(q);
      pastLogs = snap.docs.map(d => d.data());
    } catch (e) {
      console.log("Error fetching past logs:", e);
      pastLogs = [{ pain, mood, steps, medsToken: medsTaken ? 100 : 0, recoveryScore: score }];
    }

    // Call AI Risk Engine
    try {
      const res = await fetch("http://localhost:5000/risk-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientProfile: user?.profile, logs: pastLogs })
      });
      if (res.ok) {
        const analysis = await res.json();
        await addDoc(collection(db, "riskAssessments"), {
          patientId: PATIENT_ID,
          name: user?.profile?.name,
          ...analysis,
          timestamp: serverTimestamp()
        });

        if (analysis.riskLevel === "HIGH" || analysis.escalation === "ESCALATE") {
          await addDoc(collection(db, "alerts"), {
            patientId: PATIENT_ID,
            name: user?.profile?.name,
            type: "AI_HIGH_RISK",
            message: `AI Alert: ${analysis.patternDetected}`,
            seen: false,
            timestamp: serverTimestamp(),
          });
        }
      }
    } catch (e) {
      console.error("AI Risk Engine Error:", e);
    }

    // Fallback baseline alert
    if (pain >= 8) {
      await addDoc(collection(db, "alerts"), {
        patientId: PATIENT_ID,
        name: user?.profile?.name,
        type: "HIGH_PAIN",
        message: `High pain reported (${pain}/10) — immediate review needed`,
        seen: false,
        timestamp: serverTimestamp(),
      });
    }

    navigate("/home");
  };

  const previewScore = calcScore(pain, mood, steps, medsTaken);
  const scoreColor = previewScore >= 75 ? "#10b981" : previewScore >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="min-h-screen bg-mesh" style={{paddingBottom:"40px"}}>

      {/* Top bar */}
      <div className="sticky top-0 z-10 px-5 pt-12 pb-4" style={{background:"rgba(7,13,26,0.85)", backdropFilter:"blur(20px)", borderBottom:"1px solid var(--border)"}}>
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/home")} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all" style={{background:"var(--glass)",border:"1px solid var(--border)"}}>
            <span className="text-sm" style={{color:"var(--text-2)"}}>←</span>
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold" style={{color:"var(--text-1)"}}>Daily Check-in</h1>
            <p className="text-xs" style={{color:"var(--text-2)"}}>How are you feeling today, {user?.profile?.name || "User"}?</p>
          </div>
          {/* Live Score Preview */}
          <div className="text-right">
            <div className="text-[22px] font-bold score-animate" style={{color: scoreColor, fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{previewScore}</div>
            <div className="text-[10px] font-medium" style={{color:"var(--text-3)"}}>Live score</div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 pt-5 space-y-4">

        {/* Pain */}
        <div className="glass rounded-[24px] p-5 fade-up">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm font-semibold" style={{color:"var(--text-1)"}}>Pain Level</p>
              <p className="text-xs" style={{color:"var(--text-2)"}}>How intense is your pain right now?</p>
            </div>
            <div className="text-2xl font-bold score-animate"
                 style={{color: pain >= 7 ? "#ef4444" : pain >= 4 ? "#f59e0b" : "#10b981", fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
              {pain}<span className="text-sm font-normal" style={{color:"var(--text-3)"}}>/10</span>
            </div>
          </div>
          <input type="range" min="1" max="10" value={pain} onChange={e => setPain(+e.target.value)} />
          <div className="flex justify-between mt-2 text-[10px]" style={{color:"var(--text-3)"}}>
            <span>No pain</span><span>Severe</span>
          </div>
        </div>

        {/* Mood */}
        <div className="glass rounded-[24px] p-5 fade-up-1">
          <p className="text-sm font-semibold mb-1" style={{color:"var(--text-1)"}}>Mood & Energy</p>
          <p className="text-xs mb-4" style={{color:"var(--text-2)"}}>How are you feeling emotionally?</p>
          <div className="flex justify-between gap-2">
            {["😔","😕","😐","🙂","😊"].map((emoji, i) => (
              <button key={i} onClick={() => setMood(i + 1)}
                className="flex-1 py-3 rounded-2xl text-2xl transition-all duration-200"
                style={mood === i+1
                  ? {background:"rgba(99,102,241,0.15)", border:"1px solid rgba(99,102,241,0.4)", transform:"scale(1.15)"}
                  : {background:"rgba(255,255,255,0.04)", border:"1px solid var(--border)", opacity:0.5}}>
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Medications */}
        <div className="glass rounded-[24px] p-5 fade-up-2">
          <p className="text-sm font-semibold mb-1" style={{color:"var(--text-1)"}}>💊 Medications Taken Today?</p>
          <p className="text-xs mb-4" style={{color:"var(--text-2)"}}>Did you take all your prescribed medications?</p>
          <div className="flex gap-3">
            {[{v:true,label:"✓ Yes, all taken"},{v:false,label:"✗ Missed some"}].map(({v,label}) => (
              <button key={String(v)} onClick={() => setMedsTaken(v)}
                className="flex-1 py-3 rounded-2xl text-sm font-medium transition-all duration-200"
                style={medsTaken===v
                  ? v ? {background:"rgba(16,185,129,0.15)",border:"1px solid rgba(16,185,129,0.4)",color:"#34d399"}
                      : {background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.4)",color:"#f87171"}
                  : {background:"rgba(255,255,255,0.04)",border:"1px solid var(--border)",color:"var(--text-3)"}}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="glass rounded-[24px] p-5 fade-up-3">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm font-semibold" style={{color:"var(--text-1)"}}>🚶 Steps Today</p>
              <p className="text-xs" style={{color:"var(--text-2)"}}>How much did you walk?</p>
            </div>
            <div className="text-xl font-bold" style={{color:"#60a5fa",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
              {steps.toLocaleString()}
            </div>
          </div>
          <input type="range" min="0" max="8000" step="100" value={steps} onChange={e => setSteps(+e.target.value)} />
          <div className="flex justify-between mt-2 text-[10px]" style={{color:"var(--text-3)"}}>
            <span>0 steps</span><span>8,000 steps</span>
          </div>
        </div>

        {/* Symptoms */}
        <div className="glass rounded-[24px] p-5 fade-up-4">
          <p className="text-sm font-semibold mb-1" style={{color:"var(--text-1)"}}>Any symptoms today?</p>
          <p className="text-xs mb-4" style={{color:"var(--text-2)"}}>Select all that apply</p>
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS.map(s => (
              <button key={s} onClick={() => toggleSymptom(s)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200"
                style={symptoms.includes(s)
                  ? {background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.4)",color:"#f87171"}
                  : {background:"rgba(255,255,255,0.05)",border:"1px solid var(--border)",color:"var(--text-2)"}}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={submitting} className="btn-primary" style={{opacity: submitting ? 0.6 : 1}}>
          {submitting ? "✨ AI analyzing your risk..." : "Submit Check-in →"}
        </button>
      </div>
    </div>
  );
}