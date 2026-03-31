import { useState, useRef } from "react";

export default function ChatBot({ patientLog, patientProfile }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: `Hi ${patientProfile?.name || "there"}! I'm your care assistant. How are you feeling? Describe any symptoms or concerns.` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const recognitionRef = useRef(null);

  /* ── Voice Input (Speech → Text) ── */
  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please use Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(prev => prev ? prev + " " + transcript : transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  /* ── Text-to-Speech (Text → Voice) ── */
  const speak = (text) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.lang = "en-US";
    // Prefer a natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes("Google") || v.name.includes("Natural") || v.lang === "en-US");
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
  };

  /* ── Send Message ── */
  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, patientLog, patientProfile }),
      });
      const data = await res.json();
      const text = data.reply;
      const level = text.includes("[ESCALATE]") ? "escalate"
                  : text.includes("[MONITOR]")  ? "monitor"
                  : "reassure";
      const cleanText = text.replace(/\[(REASSURE|MONITOR|ESCALATE)\]/g, "").trim();
      setMessages(prev => [...prev, { role: "assistant", text: cleanText, level }]);
      speak(cleanText);
    } catch {
      const errText = "I'm having trouble connecting. Please call your doctor directly if urgent.";
      setMessages(prev => [...prev, { role: "assistant", text: errText, level: "escalate" }]);
      speak(errText);
    }
    setLoading(false);
  };

  const levelStyle = (level) => {
    if (level === "escalate") return "bg-red-50 text-red-800 border border-red-200";
    if (level === "monitor")  return "bg-amber-50 text-amber-800 border border-amber-200";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm mt-4 overflow-hidden border border-slate-100">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400"></div>
        <p className="text-sm font-medium text-slate-700">Care Assistant</p>
        <span className="text-xs text-slate-400 ml-auto mr-2">AI · Not a doctor</span>
        {/* TTS Toggle */}
        <button
          onClick={() => {
            if (ttsEnabled) window.speechSynthesis?.cancel();
            setTtsEnabled(!ttsEnabled);
          }}
          title={ttsEnabled ? "Disable voice responses" : "Enable voice responses"}
          className={`text-xs px-2 py-1 rounded-full border transition-colors ${
            ttsEnabled
              ? "bg-blue-50 border-blue-300 text-blue-600"
              : "border-slate-200 text-slate-400"
          }`}
        >
          🔊
        </button>
      </div>

      {/* Messages */}
      <div className="h-56 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
              m.role === "user" ? "bg-blue-600 text-white" : levelStyle(m.level)}`}>
              {m.text}
              {m.level === "escalate" && (
                <p className="text-xs font-medium mt-1 text-red-600">⚠ Contact your doctor now</p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 px-4 py-2 rounded-xl">
              <div className="flex gap-1 items-center h-4">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:"0ms"}}></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:"150ms"}}></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:"300ms"}}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Row */}
      <div className="flex gap-2 p-3 border-t border-slate-100">
        {/* Mic Button */}
        <button
          onClick={listening ? stopVoice : startVoice}
          title={listening ? "Stop listening" : "Speak your symptoms"}
          className={`px-3 rounded-xl border text-sm transition-colors ${
            listening
              ? "bg-red-50 border-red-300 text-red-600 animate-pulse"
              : "border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-300"
          }`}
        >
          🎤
        </button>

        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder={listening ? "Listening..." : "Describe your symptoms..."}
          className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-300 transition-colors"
        />
        <button onClick={send} disabled={loading}
          className="bg-blue-600 text-white px-4 rounded-xl text-sm font-medium disabled:opacity-50">
          Send
        </button>
      </div>
    </div>
  );
}