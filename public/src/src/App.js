import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ShieldCheck, BookOpen, Car, Scale, RotateCcw, ChevronRight, AlertCircle, Loader2, Target, Lightbulb, Check, X, Percent, ShieldAlert, Infinity, Crosshair, Award, TrendingUp, History, Info, Cloud, Database } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';

// --- CONFIGURAÇÃO CORRIGIDA ---
const firebaseConfig = {
  apiKey: "AIzaSyBrXdHCEQfF-WTTIc89hG2KfAMM8bhFdfs",
  authDomain: "prf-elite.firebaseapp.com",
  projectId: "prf-elite-002",
  storageBucket: "prf-elite.firebasestorage.app",
  messagingSenderId: "582154402260",
  appId: "1:582154402260:web:d58a84bb2c50751e6bbe41",
  measurementId: "G-ZCNV654N5W"
};
// ------------------------------

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'prf-elite-prod';

const BLOCKS = {
  BLOCO_I: { title: "Bloco I - Básicas", icon: <BookOpen className="w-5 h-5" />, subjects: ["Português", "Raciocínio Lógico-Matemático", "Informática", "Física", "Ética e Cidadania", "Geopolítica", "História da PRF"] },
  BLOCO_II: { title: "Bloco II - Trânsito", icon: <Car className="w-5 h-5" />, subjects: ["CTB + Resoluções CONTRAN"] },
  BLOCO_III: { title: "Bloco III - Direito", icon: <Scale className="w-5 h-5" />, subjects: ["Direito Constitucional", "Direito Administrativo", "Direito Penal", "Processo Penal", "Direitos Humanos"] }
};

const App = () => {
  const [user, setUser] = useState(null);
  const [userStats, setUserStats] = useState({ totalAnswered: 0, correct: 0, incorrect: 0, globalScore: 0 });
  const [appState, setAppState] = useState('config'); 
  const [selectedBlock, setSelectedBlock] = useState('BLOCO_I');
  const [selectedSubject, setSelectedSubject] = useState('Português');
  const [customTopic, setCustomTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [marathonMode, setMarathonMode] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [seconds, setSeconds] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [error, setError] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { signInAnonymously(auth).catch(e => console.error(e)); return onAuthStateChanged(auth, setUser); }, []);
  
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'history'));
    return onSnapshot(q, (snapshot) => {
      let t=0, c=0, i=0, s=0;
      snapshot.forEach(doc => { const d=doc.data(); t+=d.totalQuestions||0; c+=d.correctCount||0; i+=d.incorrectCount||0; s+=(d.correctCount||0)-(d.incorrectCount||0); });
      setUserStats({ totalAnswered: t, correct: c, incorrect: i, globalScore: s });
    });
  }, [user]);

  useEffect(() => { let interval; if (appState === 'quiz') interval = setInterval(() => setSeconds(s => s + 1), 1000); return () => clearInterval(interval); }, [appState]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' }); }, [currentIndex]);

  const startMission = async (more = false) => {
    if (!more) { setAppState('loading'); setQuestions([]); setAnswers({}); setSeconds(0); setCurrentIndex(0); } else setIsLoadingMore(true);
    setLoadingStatus("Conectando base segura..."); setError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ contents: [{ parts: [{ text: `Gere ${numQuestions} itens C/E de ${selectedSubject}. JSON: { "caderno": [{ "contexto": "...", "pergunta": "...", "gabarito": "C/E", "fundamentacao": "..." }] }` }] }] })
      });
      const data = await res.json();
      if (data.error) throw new Error("Erro API");
      const batch = JSON.parse(data.candidates[0].content.parts[0].text).caderno.map(i => ({ contexto: i.contexto, item: i.pergunta, gabarito: i.gabarito, explanation: i.fundamentacao }));
      if (more) { setQuestions(p => [...p, ...batch]); setIsLoadingMore(false); } else { setQuestions(batch); setAppState('quiz'); }
    } catch (e) { setError("Erro de conexão (Verifique a API Key na Vercel)"); setAppState('config'); setIsLoadingMore(false); }
  };

  const handleChoice = (c) => { if (!answers[currentIndex]) setAnswers(p => ({ ...p, [currentIndex]: { choice: c, isCorrect: c === questions[currentIndex].gabarito } })); };
  const finish = async () => {
    const cor = Object.values(answers).filter(a => a.isCorrect).length;
    const inc = Object.values(answers).length - cor;
    if (user) await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'history'), { timestamp: serverTimestamp(), correctCount: cor, incorrectCount: inc, totalQuestions: questions.length });
    setAppState('results');
  };

  const results = useMemo(() => {
     const cor = Object.values(answers).filter(a => a.isCorrect).length;
     return { score: cor - (Object.values(answers).length - cor), accuracy: questions.length ? (cor/questions.length)*100 : 0 };
  }, [answers, questions]);

  return (
    <div className="min-h-screen text-slate-300 flex flex-col p-6 max-w-md mx-auto">
      {appState === 'config' && (
        <div className="space-y-6 text-center mt-10">
          <h1 className="text-4xl font-black text-white italic">PRF <span className="text-blue-500">ELITE</span></h1>
          <div className="bg-[#0c1220] p-6 rounded-3xl border border-white/10 space-y-4">
            <div className="flex justify-between text-xs font-bold uppercase text-slate-500"><span>Nota: <b className="text-blue-400">{userStats.globalScore}</b></span><span>Itens: <b className="text-white">{userStats.totalAnswered}</b></span></div>
            <select className="w-full bg-slate-900 p-3 rounded-xl border border-slate-800" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>{BLOCKS[selectedBlock].subjects.map(s => <option key={s} value={s}>{s}</option>)}</select>
            {error && <div className="text-red-500 text-xs font-bold">{error}</div>}
            <button onClick={() => startMission(false)} className="w-full py-4 bg-blue-600 text-white font-black rounded-xl uppercase">Iniciar Missão</button>
          </div>
        </div>
      )}
      {appState === 'loading' && <div className="text-center mt-20"><Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4"/><p className="text-white font-black">{loadingStatus}</p></div>}
      {appState === 'quiz' && questions[currentIndex] && (
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between mb-4 font-black text-xs uppercase"><span>{selectedSubject}</span><span>{formatTime(seconds)}</span></div>
          <div className="flex-1 bg-[#0c1220] p-6 rounded-3xl border border-white/10 mb-4 overflow-y-auto">
             <p className="text-sm italic text-slate-400 mb-6">"{questions[currentIndex].contexto}"</p>
             <h3 className="text-lg font-bold text-white mb-8">{questions[currentIndex].item}</h3>
             <div className="grid grid-cols-2 gap-3 mb-6">
                <button onClick={() => handleChoice('C')} className={`py-6 rounded-xl font-black text-xl border-2 ${answers[currentIndex]?.choice === 'C' ? (answers[currentIndex].isCorrect ? 'bg-green-600 border-green-500 text-white' : 'bg-red-600 border-red-500 text-white') : 'border-slate-800'}`}>C</button>
                <button onClick={() => handleChoice('E')} className={`py-6 rounded-xl font-black text-xl border-2 ${answers[currentIndex]?.choice === 'E' ? (answers[currentIndex].isCorrect ? 'bg-green-600 border-green-500 text-white' : 'bg-red-600 border-red-500 text-white') : 'border-slate-800'}`}>E</button>
             </div>
             {answers[currentIndex] && <div className="p-4 bg-blue-900/20 rounded-xl text-xs text-blue-200">{questions[currentIndex].explanation}</div>}
          </div>
          <button onClick={() => currentIndex === questions.length -1 ? finish() : setCurrentIndex(c => c+1)} className="w-full py-4 bg-blue-600 text-white font-black rounded-xl uppercase">{currentIndex === questions.length -1 ? 'Finalizar' : 'Próxima'}</button>
        </div>
      )}
      {appState === 'results' && (
        <div className="text-center mt-20 space-y-6">
           <h2 className="text-4xl font-black text-white italic">RELATÓRIO</h2>
           <div className="text-6xl font-black text-blue-500">{results.score}</div>
           <p className="text-xs font-bold text-slate-500 uppercase">Pontuação Líquida</p>
           <button onClick={() => setAppState('config')} className="w-full py-4 bg-white text-black font-black rounded-xl uppercase">Nova Missão</button>
        </div>
      )}
    </div>
  );
};
const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
export default App;
