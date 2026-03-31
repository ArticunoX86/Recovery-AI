import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot, where, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import ScoreBadge from "../components/ScoreBadge";
import { logoutUser } from "../utils/auth";

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [noteTarget, setNoteTarget] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [noteSending, setNoteSending] = useState(false);
  const [noteSent, setNoteSent] = useState(false);
  const [activeTab, setActiveTab] = useState("logs");
  const [riskMap, setRiskMap] = useState({});

  useEffect(() => {
    const off1 = onSnapshot(query(collection(db,"logs"), orderBy("timestamp","desc")),
      snap => setLogs(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
    const off2 = onSnapshot(query(collection(db,"alerts"), where("seen","==",false), orderBy("timestamp","desc")),
      snap => setAlerts(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
    const off3 = onSnapshot(query(collection(db,"riskAssessments"), orderBy("timestamp","desc")),
      snap => {
        const latest = {};
        snap.docs.forEach(d => {
          const data = { id:d.id, ...d.data() };
          if (!latest[data.patientId]) latest[data.patientId] = data;
        });
        setRiskMap(latest);
      });
    return () => { off1(); off2(); off3(); };
  }, []);

  const dismiss = async (id) => await updateDoc(doc(db,"alerts",id), { seen:true });

  const sendNote = async () => {
    if (!noteText.trim() || !noteTarget) return;
    setNoteSending(true);
    await addDoc(collection(db,"recommendations"), {
      patientId: noteTarget.patientId, patientName: noteTarget.name,
      note: noteText.trim(), timestamp: serverTimestamp(),
    });
    setNoteSending(false); setNoteSent(true); setNoteText("");
    setTimeout(() => { setNoteSent(false); setNoteTarget(null); }, 2000);
  };

  // Adherence stats per patient
  const patientMap = {};
  logs.forEach(log => {
    const pid = log.patientId;
    if (!patientMap[pid]) patientMap[pid] = { patientId:pid, name:log.name||pid, condition:log.condition||"Recovery", totalDays:0, medDays:0, stepDays:0, scoreSum:0, latestScore:null };
    const p = patientMap[pid];
    p.totalDays++; if (log.medsToken===100) p.medDays++; if ((log.steps||0)>=3000) p.stepDays++;
    p.scoreSum += log.recoveryScore||0; if (p.latestScore===null) p.latestScore = log.recoveryScore;
  });
  const adherenceList = Object.values(patientMap);

  return (
    <div className="min-h-screen bg-mesh" style={{paddingBottom:"40px"}}>

      {/* Header */}
      <div className="sticky top-0 z-20 px-5 pt-12 pb-4" style={{background:"rgba(7,13,26,0.85)",backdropFilter:"blur(24px)",borderBottom:"1px solid var(--border)"}}>
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold" style={{fontFamily:"'Plus Jakarta Sans',sans-serif",color:"var(--text-1)"}}>
              Doctor Dashboard
            </h1>
            <p className="text-xs" style={{color:"var(--text-2)"}}>Live patient monitoring &amp; care</p>
          </div>
          <div className="flex items-center gap-3">
            {alerts.length > 0 && (
              <span className="relative text-xs px-3 py-1.5 rounded-xl font-bold" style={{background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)",color:"#f87171"}}>
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 pulse-ring" />
                ⚠ {alerts.length} Alert{alerts.length>1?"s":""}
              </span>
            )}
            <button onClick={() => { logoutUser(); navigate("/login"); }}
              className="text-xs px-4 py-2 rounded-xl transition-all"
              style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",color:"#f87171"}}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-5 space-y-4">

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-3 fade-up">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{color:"#f87171"}}>⚠ Active Alerts</p>
            {alerts.map(a => (
              <div key={a.id} className="rounded-[20px] p-4 flex justify-between items-start"
                   style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)"}}>
                <div>
                  <p className="text-sm font-semibold" style={{color:"#fca5a5"}}>{a.message}</p>
                  <p className="text-xs mt-1" style={{color:"rgba(239,68,68,0.7)"}}>Patient: {a.name || a.patientId || "Unknown"}</p>
                </div>
                <div className="flex gap-2 ml-3 flex-shrink-0">
                  <button onClick={() => { setNoteTarget({patientId:a.patientId,name:a.name||a.patientId}); setNoteText(""); setNoteSent(false); }}
                    className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
                    style={{background:"rgba(59,130,246,0.15)",border:"1px solid rgba(59,130,246,0.3)",color:"#60a5fa"}}>
                    Reply
                  </button>
                  <button onClick={() => dismiss(a.id)}
                    className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
                    style={{background:"rgba(255,255,255,0.06)",border:"1px solid var(--border)",color:"var(--text-2)"}}>
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Write Note Panel */}
        {noteTarget && (
          <div className="glass rounded-[24px] p-5 fade-up" style={{border:"1px solid rgba(59,130,246,0.3)"}}>
            <p className="text-sm font-semibold mb-1" style={{color:"var(--text-1)"}}>
              ✉️ Note to <span style={{color:"#60a5fa"}}>{noteTarget.name}</span>
            </p>
            <p className="text-xs mb-3" style={{color:"var(--text-3)"}}>Appears in patient's Recovery Plan in real-time</p>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="e.g. Increase daily steps to 5,000. Take medications before meals. Avoid strenuous exercise this week."
              className="input-field mb-3" style={{height:"88px", resize:"none"}} />
            <div className="flex gap-2">
              <button onClick={sendNote} disabled={noteSending || !noteText.trim()}
                className="btn-primary" style={{opacity: (noteSending||!noteText.trim()) ? 0.5 : 1}}>
                {noteSending ? "Sending..." : noteSent ? "✓ Sent!" : "Send to Patient"}
              </button>
              <button onClick={() => setNoteTarget(null)} className="btn-secondary" style={{flex:"0 0 auto",width:"auto",padding:"14px 20px"}}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1.5 p-1.5 rounded-2xl fade-up" style={{background:"rgba(255,255,255,0.04)",border:"1px solid var(--border)"}}>
          {["logs","adherence"].map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className="flex-1 py-2.5 rounded-[14px] text-[13px] font-semibold capitalize transition-all duration-200"
              style={activeTab===t
                ? {background:"rgba(255,255,255,0.08)",color:"var(--text-1)",boxShadow:"0 2px 8px rgba(0,0,0,0.3)"}
                : {color:"var(--text-2)"}}>
              {t === "logs" ? "📋 Check-in Logs" : "📊 Adherence Report"}
            </button>
          ))}
        </div>

        {/* Logs Tab */}
        {activeTab === "logs" && (
          <div className="space-y-3 fade-up">
            {logs.length === 0 && (
              <div className="glass rounded-[24px] p-10 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-sm" style={{color:"var(--text-2)"}}>No check-ins yet</p>
              </div>
            )}
            {logs.map(log => (
              <div key={log.id} className="glass rounded-[24px] p-5 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-semibold text-sm" style={{color:"var(--text-1)"}}>{log.name || log.patientId || "Unknown"}</p>
                    <p className="text-xs mt-0.5" style={{color:"var(--text-3)"}}>{log.condition || "Recovery"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ScoreBadge score={log.recoveryScore} />
                    <button onClick={() => { setNoteTarget({patientId:log.patientId,name:log.name||log.patientId}); setNoteText(""); setNoteSent(false); }}
                      className="text-[11px] px-2.5 py-1 rounded-xl font-medium transition-all"
                      style={{background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.25)",color:"#60a5fa"}}>
                      + Note
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[["Score",log.recoveryScore],["Pain",`${log.pain}/10`],["Steps",log.steps?.toLocaleString()],["Meds",`${log.medsToken}%`]].map(([l,v]) => (
                    <div key={l} className="rounded-xl p-2.5 text-center" style={{background:"rgba(255,255,255,0.04)",border:"1px solid var(--border)"}}>
                      <p className="text-[10px] uppercase tracking-wider mb-1" style={{color:"var(--text-3)"}}>{l}</p>
                      <p className="font-bold text-sm" style={{color:"var(--text-1)"}}>{v}</p>
                    </div>
                  ))}
                </div>
                {log.symptoms?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {log.symptoms.map(s => (
                      <span key={s} className="text-[11px] px-2.5 py-1 rounded-lg font-medium"
                        style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",color:"#f87171"}}>{s}</span>
                    ))}
                  </div>
                )}
                {/* AI Snippet on log */}
                {riskMap[log.patientId] && (
                  <div className="mt-3 p-3 rounded-xl flex justify-between items-center" style={{background: riskMap[log.patientId].riskLevel === "HIGH" ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.03)"}}>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{color: riskMap[log.patientId].riskLevel === "HIGH" ? "#f87171" : "var(--text-3)"}}>⚡ AI Detected Trend</p>
                      <p className="text-xs" style={{color:"var(--text-2)"}}>{riskMap[log.patientId].patternDetected}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Adherence Tab */}
        {activeTab === "adherence" && (
          <div className="space-y-3 fade-up">
            {adherenceList.length === 0 && (
              <div className="glass rounded-[24px] p-10 text-center">
                <div className="text-4xl mb-3">📊</div>
                <p className="text-sm" style={{color:"var(--text-2)"}}>No patient data yet</p>
              </div>
            )}
            {adherenceList.sort((a,b) => {
              const rA = riskMap[a.patientId]?.riskLevel === "HIGH" ? 1 : 0;
              const rB = riskMap[b.patientId]?.riskLevel === "HIGH" ? 1 : 0;
              return rB - rA;
            }).map(p => {
              const medPct  = p.totalDays > 0 ? Math.round((p.medDays  / p.totalDays) * 100) : 0;
              const stepPct = p.totalDays > 0 ? Math.round((p.stepDays / p.totalDays) * 100) : 0;
              const avgScore= p.totalDays > 0 ? Math.round(p.scoreSum  / p.totalDays)         : 0;
              const barColor = (v) => v >= 80 ? "#10b981" : v >= 50 ? "#f59e0b" : "#ef4444";
              const riskInfo = riskMap[p.patientId];

              return (
                <div key={p.patientId} className="glass rounded-[24px] p-5" style={{border: riskInfo?.riskLevel === "HIGH" ? "1px solid rgba(239,68,68,0.4)" : "none"}}>
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold" style={{color:"var(--text-1)"}}>{p.name}</p>
                        {riskInfo && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{
                            background: riskInfo.riskLevel === "HIGH" ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)",
                            color: riskInfo.riskLevel === "HIGH" ? "#f87171" : "#34d399"
                          }}>{riskInfo.riskLevel} RISK</span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{color:"var(--text-3)"}}>{p.condition} · {p.totalDays} check-in{p.totalDays!==1?"s":""}</p>
                    </div>
                    <ScoreBadge score={p.latestScore} />
                  </div>

                  <div className="space-y-3 mb-5">
                    {[["💊 Medication Adherence",medPct],["🚶 Step Goal Adherence",stepPct],["📊 Avg Recovery Score",avgScore]].map(([label,pct]) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span style={{color:"var(--text-2)"}}>{label}</span>
                          <span className="font-bold" style={{color:barColor(pct)}}>{pct}%</span>
                        </div>
                        <div className="h-2 rounded-full" style={{background:"rgba(255,255,255,0.06)"}}>
                          <div className="h-2 rounded-full transition-all duration-700"
                               style={{width:`${pct}%`, background:`linear-gradient(90deg,${barColor(pct)}88,${barColor(pct)})`}} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {riskInfo && (
                     <div className="mb-5 rounded-[16px] p-4" style={{background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)"}}>
                        <p className="text-[10px] uppercase font-bold tracking-widest mb-2" style={{color:"#60a5fa"}}>⚡ AI Action Recommendation</p>
                        <p className="text-xs text-gray-300 mb-2"><strong>Issue:</strong> {riskInfo.patternDetected}</p>
                        <p className="text-xs text-blue-200 mb-3 block"><strong>Action:</strong> {riskInfo.intervention}</p>
                        <button onClick={() => { 
                            setNoteTarget({patientId:p.patientId,name:p.name}); 
                            setNoteText(riskInfo.intervention); 
                            window.scrollTo({top:0, behavior:"smooth"});
                          }}
                          className="text-[11px] font-semibold w-full py-2 rounded-xl"
                          style={{background:"rgba(59,130,246,0.15)", border:"1px solid rgba(59,130,246,0.4)", color:"#93c5fd"}}>
                          Send AI Intervention to Patient →
                        </button>
                     </div>
                  )}

                  {!riskInfo && (
                    <button onClick={() => { setNoteTarget({patientId:p.patientId,name:p.name}); setNoteText(""); setActiveTab("logs"); window.scrollTo({top:0, behavior:"smooth"}); }}
                      className="text-xs px-4 py-2 rounded-xl font-medium transition-all"
                      style={{background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.25)",color:"#60a5fa"}}>
                      ✉ Send Recommendation
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}