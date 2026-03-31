import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* =======================
   🔌 MONGODB CONNECTION
======================= */
mongoose.connect("mongodb://127.0.0.1:27017/recoveryAI")
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

/* =======================
   🧬 USER SCHEMA
======================= */
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: String,

  profile: {
    name: String,
    age: Number,
    condition: String,
    medications: [String]
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model("User", userSchema);

/* =======================
   🤖 GEMINI SETUP
======================= */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* =======================
   📝 REGISTER API
======================= */
app.post("/register", async (req, res) => {
  try {
    const { email, password, role, profile, doctorCode } = req.body;

    if (role === "doctor") {
      const validCode = process.env.DOCTOR_SECRET_CODE || "HEAL2024";
      if (doctorCode !== validCode) {
        return res.status(403).json({ message: "Invalid Doctor Registration Code" });
      }
    }

    const newUser = new User({
      email,
      password,
      role,
      profile
    });

    await newUser.save();

    res.json({ message: "User registered successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error registering user" });
  }
});

/* =======================
   🔐 LOGIN API
======================= */
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, password });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: "Login error" });
  }
});

/* =======================
   🧠 TRIAGE API (EXISTING)
======================= */
app.post("/triage", async (req, res) => {
  try {
    const { message, patientLog, patientProfile } = req.body;

    const safeProfile = patientProfile || {};
    const safeLog = patientLog || {};

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const prompt = `
You are a medical triage assistant.

Patient Details:
Name: ${safeProfile.name || "Unknown"}
Age: ${safeProfile.age || "Unknown"}
Condition: ${safeProfile.condition || "Unknown"}
Recovery Day: ${safeProfile.day || "Unknown"}
Medications: ${(safeProfile.medications || []).join(", ")}

Today's Patient Log:
- Pain Level: ${safeLog.pain ?? "N/A"}
- Mood: ${safeLog.mood || "N/A"}
- Steps Walked: ${safeLog.steps ?? "N/A"}
- Notes: ${safeLog.notes || "N/A"}

User Message:
${message}

Instructions:
- Respond in a calm and safe tone
- Keep it short (2-4 sentences)
- Add ONLY ONE tag at the end:
  [REASSURE], [MONITOR], or [ESCALATE]
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      reply: "Something went wrong. Please try again.",
    });
  }
});

/* =======================
   📋 PERSONALIZED RECOVERY PLAN API
======================= */
app.post("/generate-plan", async (req, res) => {
  try {
    const { condition, medications, age } = req.body;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are a medical recovery planning assistant.

Patient Information:
- Age: ${age || "Unknown"}
- Medical Condition: ${condition || "General recovery"}
- Current Medications: ${(medications || []).join(", ") || "None listed"}

Generate exactly 5 specific, actionable daily recovery goals tailored to this patient's condition.
Return ONLY a valid JSON array. No extra text, no markdown, no explanation.

Format:
[
  { "icon": "emoji", "label": "short goal under 10 words", "type": "activity|medication|nutrition|rest|monitoring" },
  ...
]

Make each goal specific to the patient's condition (e.g. cardiac patient gets different goals than knee surgery patient).
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) throw new Error("No JSON array found in response");

    const goals = JSON.parse(jsonMatch[0]);
    res.json({ goals });

  } catch (error) {
    console.error("Plan generation error:", error);
    // Fallback generic goals
    res.json({
      goals: [
        { icon: "🚶", label: "Walk at least 3,000 steps", type: "activity" },
        { icon: "💊", label: "Take all prescribed medications on time", type: "medication" },
        { icon: "💧", label: "Drink at least 8 glasses of water", type: "nutrition" },
        { icon: "😴", label: "Rest adequately — 7 to 8 hours of sleep", type: "rest" },
        { icon: "📝", label: "Complete your daily check-in", type: "monitoring" },
      ]
    });
  }
});

/* =======================
   🏥 RISK ANALYSIS ENGINE API
======================= */
app.post("/risk-analysis", async (req, res) => {
  try {
    const { patientProfile, logs } = req.body;

    const safeProfile = patientProfile || {};
    const safeLogs = Array.isArray(logs) ? logs : [];

    // Format past 3 days of logs for the prompt
    let logsHistory = "No recent logs.";
    if (safeLogs.length > 0) {
      logsHistory = safeLogs.map((l, i) => 
        `Day -${i}: Score ${l.recoveryScore}, Pain ${l.pain}/10, Steps ${l.steps}, Mood ${l.mood}, Meds ${l.medsToken}%`
      ).join("\n");
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const prompt = `
You are an advanced Medical Risk Engine for post-discharge recovery.

Patient Context:
Condition: ${safeProfile.condition || "Unknown"}
Age: ${safeProfile.age || "Unknown"}

Recent History (Last to First):
${logsHistory}

Analyze this patient's trajectory and provide a structured JSON response predicting risk and actionable interventions.
Return ONLY valid JSON. No markdown, no explanations.

Schema:
{
  "riskLevel": "LOW" | "MODERATE" | "HIGH",
  "trend": "Declining" | "Stable" | "Improving",
  "patternDetected": "Short 1-sentence description of the pattern (e.g., 'Pain rising for 3 consecutive days, steps declining')",
  "intervention": "Actionable advice for the patient (e.g., 'Reduce walking by 50% today, elevate leg, monitor swelling for 24 hours')",
  "escalation": "REASSURE" | "MONITOR" | "ESCALATE",
  "simulation": "1-sentence prediction of what could go wrong if pattern continues (e.g., 'If pain and swelling continue, infection risk increases significantly within 48 hours')"
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error("No JSON object found in response");

    const analysis = JSON.parse(jsonMatch[0]);
    res.json(analysis);

  } catch (error) {
    console.error("Risk Analysis Error:", error);
    res.status(500).json({ error: "Failed to generate risk analysis" });
  }
});

/* =======================
   🚀 SERVER START
======================= */
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});