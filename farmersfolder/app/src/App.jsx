
import React from "react";
import { HashRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

function AccessGateway() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-4xl w-full text-center">
        <div className="inline-block px-4 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wider uppercase mb-3">
          Rythu Mandi � Access Gateway
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-2">
          Rythu Mandi Procurement Portal
        </h1>
        <p className="text-slate-400 text-lg mb-10">
          Select Your Preferred Interaction Mode
        </p>

        <div className="grid md:grid-cols-2 gap-8 text-left">
          {/* Card 1: Educated / Educated / Literate Farmer */}
          <div className="bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-8 hover:border-emerald-400 transition-all duration-300 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-2xl">
                  ??
                </div>
                <span className="px-3 py-1 text-xs font-bold bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                  DIGITAL WEB PORTAL
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">
                Educated / Educated / Literate Farmer
              </h2>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-4">
                Full Digital Smartphone App
              </p>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Rich interactive digital screen UI designed for farmers who are comfortable reading text & forms.
              </p>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl shadow-lg transition duration-200 text-center"
            >
              Sign In to Digital Portal ?
            </button>
          </div>

          {/* Card 2: Uneducated / Uneducated / Illiterate Farmer */}
          <div className="bg-slate-900/90 border border-sky-500/40 rounded-3xl p-8 hover:border-sky-400 transition-all duration-300 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/20 flex items-center justify-center text-2xl">
                  ??
                </div>
                <span className="px-3 py-1 text-xs font-bold bg-sky-500/20 text-sky-400 rounded-full border border-sky-500/30">
                  VOICE IVR TELEPHONY
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">
                Uneducated / Uneducated / Illiterate Farmer
              </h2>
              <p className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-4">
                Automated Phone Call / IVR
              </p>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Voice-guided telephony call interface tailored for farmers who prefer audio instructions in local dialects.
              </p>
            </div>
            <a
              href="http://localhost:3000/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 bg-sky-600 hover:bg-sky-500 text-white font-extrabold rounded-2xl shadow-lg transition duration-200 text-center block"
            >
              Open Voice Telephony Portal ?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AccessGateway />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

