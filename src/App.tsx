import { useState, useEffect, useRef } from 'react';
import { Play, Dices, Plus, Trophy, Crown, ArrowRight, Medal, Users, History, RotateCcw, Camera, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

type GameState = 'landing' | 'setup' | 'playing' | 'winner';

type Player = {
  id: number;
  name: string;
  score: number;
  avatar: string;
};

type LeaderboardEntry = {
  [name: string]: number;
};

const AVATARS = [
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Joko&hair=shortHairFrizzle&mouth=tongue&backgroundColor=b6e3f4",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Budi&hair=shortHairShaggyMullet&mouth=vomit&backgroundColor=c0aede",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Udin&hair=shortHairShortCurly&mouth=screamOpen&backgroundColor=d1d4f9",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Tono&hair=shortHairShortRound&mouth=smile&backgroundColor=ffdfbf"
];

export default function App() {
  const [gameState, setGameState] = useState<GameState>('landing');
  const [players, setPlayers] = useState<Player[]>([
    { id: 0, name: '', score: 0, avatar: AVATARS[0] },
    { id: 1, name: '', score: 0, avatar: AVATARS[1] },
    { id: 2, name: '', score: 0, avatar: AVATARS[2] },
    { id: 3, name: '', score: 0, avatar: AVATARS[3] },
  ]);
  const [order, setOrder] = useState<number[]>([0, 1, 2, 3]);
  const [roundScores, setRoundScores] = useState<{ [key: number]: string }>({
    0: '', 1: '', 2: '', 3: ''
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry>({});
  const [currentWinners, setCurrentWinners] = useState<Player[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  
  const isProcessingScore = useRef(false);

  const highestScore = Math.max(...players.map(p => p.score));

  const handleStartSetup = () => {
    setGameState('setup');
  };

  const handleNameChange = (id: number, name: string) => {
    setPlayers(players.map(p => p.id === id ? { ...p, name } : p));
  };

  const handleAvatarChange = (id: number, avatarUrl: string) => {
    const usedBy = players.find(p => p.avatar === avatarUrl && p.id !== id);
    if (usedBy) {
      // Swap avatars
      const currentAvatar = players.find(p => p.id === id)!.avatar;
      setPlayers(players.map(p => {
        if (p.id === id) return { ...p, avatar: avatarUrl };
        if (p.id === usedBy.id) return { ...p, avatar: currentAvatar };
        return p;
      }));
    } else {
      setPlayers(players.map(p => p.id === id ? { ...p, avatar: avatarUrl } : p));
    }
  };

  const handleFileUpload = (id: number, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPlayers(players.map(p => p.id === id ? { ...p, avatar: result } : p));
    };
    reader.readAsDataURL(file);
  };

  const isSetupValid = players.filter(p => p.name.trim() !== '').length >= 2;

  const startGame = () => {
    if (!isSetupValid) return;
    setGameState('playing');
    
    const activeIds = players.filter(p => p.name.trim() !== '').map(p => p.id);
    setIsSpinning(true);
    setTimeout(() => {
      const newArr = [...activeIds];
      for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
      }
      setOrder(newArr);
      setIsSpinning(false);
    }, 600);
  };

  const shuffleOrder = () => {
    setIsSpinning(true);
    setTimeout(() => {
      setOrder(prev => {
        const newArr = [...prev];
        for (let i = newArr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
      });
      setIsSpinning(false);
    }, 600); // Shuffle animation duration
  };

  const handleScoreChange = (id: number, val: string) => {
    if (val === '' || /^\d+$/.test(val) || (val.startsWith('-') && /^-?\d*$/.test(val))) {
      setRoundScores(prev => ({ ...prev, [id]: val }));
    }
  };

  const addScores = () => {
    const hasScores = Object.values(roundScores).some(val => val !== '');
    if (!hasScores || isProcessingScore.current) return;
    
    isProcessingScore.current = true;

    const newPlayers = players.map(p => {
      const add = parseInt(roundScores[p.id]) || 0;
      return { ...p, score: p.score + add };
    });

    setPlayers(newPlayers);
    setRoundScores({ 0: '', 1: '', 2: '', 3: '' });

    // Check winner
    const maxScore = Math.max(...newPlayers.map(p => p.score));
    if (maxScore >= 1000) {
      const winners = newPlayers.filter(p => p.score === maxScore);
      setCurrentWinners(winners);
      
      setLeaderboard(prev => {
        const next = { ...prev };
        winners.forEach(w => {
          const playerName = w.name.trim(); // Trim for safety
          next[playerName] = (next[playerName] || 0) + 1;
        });
        return next;
      });

      setGameState('winner');
      triggerConfetti();
    } else {
      // Update leader to start next
      let newHighest = -1;
      let leaderIndex = -1;
      newPlayers.forEach((p, idx) => {
        if (p.score > newHighest) {
          newHighest = p.score;
          leaderIndex = p.id;
        }
      });
      if (newHighest > 0 && leaderIndex !== -1) {
        setOrder(prev => {
          const newOrder = prev.filter(id => id !== leaderIndex);
          newOrder.push(leaderIndex);
          return newOrder;
        });
      }
    }
    
    // Release lock
    setTimeout(() => {
      isProcessingScore.current = false;
    }, 500);
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#22c55e', '#3b82f6', '#eab308']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#22c55e', '#3b82f6', '#eab308']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const resetGame = () => {
    setPlayers(players.map(p => ({ ...p, score: 0 })));
    setRoundScores({ 0: '', 1: '', 2: '', 3: '' });
    setGameState('playing');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,_#1e293b_0%,_#0f172a_100%)] text-slate-50 font-sans selection:bg-green-500/30">
      <AnimatePresence mode="wait">
        
        {/* LANDING PAGE */}
        {gameState === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="relative flex flex-col items-center justify-center min-h-screen w-full px-4 py-12 md:p-6 overflow-hidden"
          >
            {/* Background Atmosphere */}
            <div className="absolute top-[-20%] left-[-10%] w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-green-500/20 rounded-full blur-[100px] md:blur-[140px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-blue-500/20 rounded-full blur-[100px] md:blur-[140px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] md:w-[800px] md:h-[800px] bg-yellow-400/5 rounded-full blur-[120px] md:blur-[180px] pointer-events-none" />

            {/* Floating Card Suits - Hidden on very small screens, smaller on mobile */}
            <motion.div animate={{ y: [0, -20, 0], rotate: [0, 10, 0], opacity: [0.05, 0.2, 0.05] }} transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }} className="hidden sm:block absolute top-[15%] left-[10%] lg:left-[20%] text-6xl md:text-8xl text-slate-100 select-none pointer-events-none">♠️</motion.div>
            <motion.div animate={{ y: [0, 30, 0], rotate: [0, -15, 0], opacity: [0.05, 0.2, 0.05] }} transition={{ repeat: Infinity, duration: 7, ease: "easeInOut", delay: 1 }} className="hidden sm:block absolute top-[20%] right-[10%] lg:right-[20%] text-7xl md:text-9xl text-rose-500 select-none pointer-events-none">♥️</motion.div>
            <motion.div animate={{ y: [0, -15, 0], rotate: [0, 20, 0], opacity: [0.05, 0.2, 0.05] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 2 }} className="hidden sm:block absolute bottom-[20%] left-[15%] lg:left-[25%] text-7xl md:text-9xl text-rose-500 select-none pointer-events-none">♦️</motion.div>
            <motion.div animate={{ y: [0, 25, 0], rotate: [0, -10, 0], opacity: [0.05, 0.2, 0.05] }} transition={{ repeat: Infinity, duration: 8, ease: "easeInOut", delay: 0.5 }} className="hidden sm:block absolute bottom-[15%] right-[15%] lg:right-[25%] text-6xl md:text-8xl text-slate-100 select-none pointer-events-none">♣️</motion.div>

            {/* Main Content Card */}
            <div className="relative z-10 flex flex-col items-center w-full max-w-2xl px-6 py-12 md:py-24 md:px-16 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] md:rounded-[4rem] shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
              <div className="w-20 h-20 md:w-28 md:h-28 bg-gradient-to-tr from-white/5 to-white/10 rounded-full flex items-center justify-center mb-6 md:mb-10 shadow-[inset_0_2px_20px_rgba(255,255,255,0.05)] border border-white/10">
                <span className="text-4xl md:text-6xl drop-shadow-xl">🃏</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-center mb-4 text-green-400 drop-shadow-sm filter">
                Poker Ceki<br/> <span className="text-white">Score</span>
              </h1>
              
              <p className="text-slate-400 text-center max-w-md mb-10 md:mb-16 text-[10px] md:text-xs uppercase tracking-[0.2em] font-semibold">
                by <span className="text-blue-400">@lukayproject</span>
              </p>
              
              <button
                onClick={handleStartSetup}
                className="group relative overflow-hidden inline-flex items-center justify-center w-full sm:w-auto px-8 md:px-14 py-4 md:py-6 font-bold text-white transition-all duration-300 bg-gradient-to-r from-green-500 to-emerald-600 rounded-[1.5rem] md:rounded-[2rem] hover:from-green-400 hover:to-emerald-500 focus:outline-none focus:ring-4 focus:ring-green-500/50 hover:scale-[1.02] active:scale-[0.98] shadow-[0_15px_35px_rgba(34,197,94,0.3)] border border-green-400/40"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <span className="relative z-10 text-lg md:text-xl uppercase tracking-[0.1em] drop-shadow-md">Mulai Main</span>
                <Play className="relative z-10 w-6 h-6 md:w-7 md:h-7 ml-3 md:ml-4 transition-transform duration-300 group-hover:translate-x-1.5 drop-shadow-md" fill="currentColor" />
              </button>
            </div>
          </motion.div>
        )}

        {/* SETUP PAGE */}
        {gameState === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="relative flex flex-col items-center justify-center min-h-screen w-full px-4 py-8 md:py-12 overflow-hidden"
          >
            {/* Background Orbs */}
            <div className="absolute top-[-5%] left-[-5%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blue-500/10 md:bg-blue-500/20 rounded-full blur-[100px] md:blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[10%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-green-500/10 md:bg-green-500/10 rounded-full blur-[100px] md:blur-[150px] pointer-events-none" />
            
           <div className="relative z-10 w-full max-w-xl flex flex-col min-h-[85vh]">
               {/* Back Button */}
               <div className="w-full flex justify-start mb-6 lg:mb-8">
                 <button
                   onClick={() => setGameState('landing')}
                   className="flex items-center text-slate-400 hover:text-white transition-colors text-[11px] md:text-xs font-semibold tracking-wider uppercase"
                 >
                   <ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali
                 </button>
               </div>

               <div className="flex flex-col items-center justify-center mb-6 md:mb-10">
                 <div className="w-12 h-12 md:w-16 md:h-16 bg-white/5 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] border border-white/10 backdrop-blur-md">
                   <Users className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
                 </div>
                 <h2 className="text-3xl md:text-5xl font-extrabold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400 text-center drop-shadow-sm">
                   Set Pemain
                 </h2>
                 <p className="mt-2 md:mt-3 text-slate-400 text-[10px] md:text-xs uppercase tracking-[0.2em] font-medium text-center opacity-70">
                   Konfigurasi nama & avatar
                 </p>
               </div>
               
               <div className="bg-slate-900/60 backdrop-blur-xl p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 relative overflow-hidden">
                 {/* Decorative top border gradient */}
                 <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
                 
                 <div className="space-y-4 md:space-y-6">
                   {players.map((p, i) => (
                     <div key={p.id} className="group flex flex-col gap-2 md:gap-3">
                       <div>
                         <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 mb-1.5 md:mb-2 uppercase tracking-[0.1em] transition-colors group-focus-within:text-blue-400 ml-1">
                           Pemain {i + 1}
                         </label>
                         <div className="relative">
                           <input
                             type="text"
                             value={p.name}
                             onChange={(e) => handleNameChange(p.id, e.target.value)}
                             placeholder={`Nama Pemain ${i + 1}`}
                             className="w-full px-4 md:px-5 py-3 md:py-4 bg-slate-950/40 border border-white/5 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none text-white text-base md:text-lg placeholder:text-slate-600 shadow-inner hover:border-white/10"
                           />
                           <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-slate-700 transition-colors group-focus-within:bg-blue-500 group-focus-within:shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                         </div>
                       </div>
                       
                       <div className="flex justify-between md:justify-start gap-2 md:gap-4 p-2 md:p-3 bg-slate-950/20 rounded-xl md:rounded-2xl border border-white/5 overflow-x-auto hide-scrollbar">
                         {AVATARS.map((avatarUrl, idx) => {
                           const isSelected = p.avatar === avatarUrl;
                           const isUsedByOther = players.some(other => other.id !== p.id && other.avatar === avatarUrl);
                           
                           return (
                             <button
                               key={idx}
                               onClick={() => handleAvatarChange(p.id, avatarUrl)}
                               className={`relative flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 transition-all duration-300 ${
                                 isSelected ? 'border-green-400 scale-[1.1] shadow-[0_0_15px_rgba(34,197,94,0.3)] z-10' : 
                                 isUsedByOther ? 'border-transparent opacity-20 cursor-not-allowed' : 
                                 'border-white/10 hover:border-white/30 hover:scale-105 cursor-pointer'
                               }`}
                               disabled={isUsedByOther && !isSelected}
                             >
                               <img src={avatarUrl} alt="avatar" className={`w-full h-full object-cover transition-colors ${isSelected ? 'bg-white/10' : 'bg-transparent'}`} />
                             </button>
                           );
                         })}

                         {/* Custom Avatar Upload Button */}
                         <label className={`relative flex-shrink-0 w-10 h-10 md:w-12 md:h-12 ml-auto rounded-full overflow-hidden border-2 transition-all duration-300 cursor-pointer flex items-center justify-center ${
                           !AVATARS.includes(p.avatar) ? 'border-green-400 scale-[1.1] shadow-[0_0_15px_rgba(34,197,94,0.3)] z-10 bg-white/5' : 'border-dashed border-white/20 hover:border-white/40 bg-white/5 text-slate-400'
                         }`}>
                           {!AVATARS.includes(p.avatar) ? (
                             <img src={p.avatar} alt="custom avatar" className="w-full h-full object-cover" />
                           ) : (
                             <Camera className="w-4 h-4 md:w-5 md:h-5 opacity-60 group-hover/label:opacity-100 transition-opacity" />
                           )}
                           <input 
                             type="file" 
                             accept="image/*" 
                             className="hidden" 
                             onChange={(e) => handleFileUpload(p.id, e.target.files?.[0])} 
                           />
                         </label>
                       </div>
                     </div>
                   ))}
                 </div>
                 
                 <div className="mt-8 md:mt-12 flex justify-center">
                   <button
                     onClick={startGame}
                     disabled={!isSetupValid}
                     className="group relative w-full overflow-hidden inline-flex items-center justify-center px-6 md:px-8 py-4 md:py-5 font-bold text-white transition-all duration-300 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl md:rounded-2xl hover:from-green-400 hover:to-emerald-500 hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-green-500/50 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(34,197,94,0.2)] border border-green-400/30"
                   >
                     <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <span className="relative z-10 text-base md:text-lg uppercase tracking-[0.15em] drop-shadow-md">Mulai Game</span>
                     <ArrowRight className="relative z-10 w-5 h-5 md:w-6 md:h-6 ml-3 transition-transform duration-300 group-hover:translate-x-1.5 drop-shadow-md" />
                   </button>
                 </div>
               </div>

               {/* Copyright Footer */}
               <div className="mt-auto pt-10 pb-4 text-center">
                 <p className="text-slate-500/80 text-[10px] md:text-xs font-semibold uppercase tracking-widest">© 2026 @lukayproject</p>
               </div>
            </div>
          </motion.div>
        )}

        {/* PLAYING PAGE */}
        {gameState === 'playing' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-5xl mx-auto min-h-screen pt-6 pb-2 md:pt-10 px-4 md:px-6 flex flex-col justify-between"
          >
            <div className="w-full flex flex-col gap-8 md:gap-10">
              {/* MAIN BOARD */}
              <div className="w-full flex flex-col space-y-5 md:space-y-6">
              {/* Back Button */}
              <div className="flex items-center mb-2">
                <button
                  onClick={() => setGameState('setup')}
                  className="flex items-center text-slate-400 hover:text-white transition-colors text-[11px] md:text-xs font-semibold tracking-wider uppercase"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-white/10 gap-4">
                <div>
                  <h1 className="m-0 text-xl md:text-3xl tracking-wide uppercase text-green-400 font-extrabold flex items-center">
                    Poker Ceki
                  </h1>
                  <p className="m-0 md:mt-1 text-[10px] md:text-xs opacity-60 uppercase tracking-[0.1em] text-slate-50">
                    Professional Tracker System
                  </p>
                </div>
                <div className="flex gap-2.5 shrink-0 self-stretch sm:self-auto w-full sm:w-auto">
                  <button
                    onClick={shuffleOrder}
                    disabled={isSpinning}
                    className="flex-1 sm:flex-none flex items-center justify-center px-3 py-2.5 md:px-5 md:py-2.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl md:rounded-2xl font-semibold transition-all disabled:opacity-50 hover:bg-blue-500/30 text-sm md:text-base"
                  >
                    <Dices className={`w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-2.5 ${isSpinning ? 'animate-spin' : ''}`} />
                    Spin
                  </button>
                  <button
                    onClick={resetGame}
                    className="flex-1 sm:flex-none flex items-center justify-center px-3 py-2.5 md:px-5 md:py-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl md:rounded-2xl font-semibold hover:bg-rose-500/20 transition-colors text-sm md:text-base"
                  >
                    <RotateCcw className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-2.5" />
                    Reset
                  </button>
                </div>
              </div>

              {/* TURN ORDER BANNER */}
              <div className="bg-slate-900/60 backdrop-blur-md py-2.5 md:py-3 px-4 md:px-6 rounded-xl md:rounded-full flex flex-col sm:flex-row items-center justify-between gap-3 border border-white/5 shadow-inner">
                <div className="flex-1 overflow-x-auto hide-scrollbar w-full">
                  <div className="flex items-center text-[10px] md:text-xs text-white/50 space-x-2 md:space-x-3 min-w-max pb-1 sm:pb-0">
                    <span className="font-semibold uppercase tracking-widest mr-2">Giliran:</span>
                    <AnimatePresence mode="popLayout">
                      {order.map((pid, i) => {
                        const isFirst = i === order.length - 1;
                        return (
                          <motion.div 
                            layout
                            key={pid}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            className="flex items-center"
                          >
                            <span className={`transition-colors text-xs md:text-sm font-semibold truncate max-w-[80px] md:max-w-none ${
                               isFirst 
                                 ? "text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]"
                                 : "text-white"
                            }`}>
                              {players.find(p => p.id === pid)?.name}
                            </span>
                            {!isFirst && <span className="opacity-30 mx-2 text-sm leading-none">→</span>}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* PLAYER CARDS GRID */}
              <div className={`grid gap-3 md:gap-5 ${
                order.length === 2 ? 'grid-cols-2 max-w-2xl mx-auto w-full' : 
                order.length === 3 ? 'grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto w-full' : 
                'grid-cols-2 lg:grid-cols-4'
              }`}>
                <AnimatePresence>
                  {order.map((pid, i) => {
                    const p = players.find(x => x.id === pid)!;
                    const isLeader = highestScore > 0 && p.score === highestScore;
                    const isFirstTurn = i === 0;
                    return (
                      <motion.div
                        layout
                        key={p.id}
                        className={`bg-slate-800/60 backdrop-blur-xl rounded-[1.25rem] md:rounded-[2rem] p-4 md:p-6 flex flex-col items-center relative transition-transform duration-300 ${
                          isLeader ? 'border md:border-2 border-green-500/70 shadow-[0_5px_25px_rgba(34,197,94,0.15)] bg-slate-800/80' : 'border border-white/5 shadow-sm hover:border-white/10'
                        }`}
                      >
                        <div className="h-8 md:h-10 flex items-center justify-center text-2xl md:text-[32px] mb-2 absolute -top-4 md:-top-5 z-20 mix-blend-plus-lighter">
                           {isLeader ? '👑' : ''}
                        </div>
                        
                        <div className={`w-14 h-14 md:w-20 md:h-20 rounded-full mb-2 md:mb-3 overflow-hidden border-2 md:border-4 border-slate-900 shadow-md ${isLeader ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-slate-800' : ''}`}>
                          <img src={p.avatar} alt="avatar" className="w-full h-full object-cover bg-white/5" />
                        </div>
                        
                        <div className="text-sm md:text-lg font-bold mb-0 md:mb-1 text-center text-slate-50 truncate w-full px-1">{p.name || `Pemain ${p.id+1}`}</div>
                        <div className="text-[9px] md:text-[10px] uppercase tracking-[0.1em] opacity-50 mb-3 md:mb-5">
                          {isLeader ? 'Leader' : isFirstTurn ? 'Dealer' : `Pemain ${i + 1}`}
                        </div>

                        <div className="font-mono text-3xl md:text-5xl font-light text-slate-50 mb-4 md:mb-6 flex items-baseline gap-1 tracking-tight">
                          {p.score}<span className="text-[10px] md:text-sm opacity-40 font-sans tracking-normal">pts</span>
                        </div>

                        <div className="w-full mt-auto flex flex-col gap-2">
                          <div className="relative">
                            <input
                              type="number"
                              inputMode="decimal"
                              value={roundScores[p.id]}
                              onChange={(e) => handleScoreChange(p.id, e.target.value)}
                              placeholder="Skor"
                              className="bg-slate-900/60 border border-white/10 rounded-lg md:rounded-xl p-2.5 md:p-3 text-white text-sm md:text-base text-center w-full box-border outline-none focus:border-green-500/50 focus:bg-slate-900/80 placeholder:text-slate-500/70 transition-colors"
                            />
                            {roundScores[p.id] && (
                              <button 
                                onClick={() => handleScoreChange(p.id, '')}
                                className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* ACTION BUTTON */}
              <div className="pt-2 pb-6 md:pb-12">
                <button
                  onClick={addScores}
                  className="group w-full py-3.5 md:py-4 bg-green-500 text-white font-bold text-sm md:text-base uppercase tracking-widest rounded-xl md:rounded-2xl hover:bg-green-600 transition-all shadow-[0_8px_20px_rgba(34,197,94,0.3)] hover:shadow-[0_10px_25px_rgba(34,197,94,0.4)] flex items-center justify-center hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Plus className="w-5 h-5 md:w-6 md:h-6 mr-2 transition-transform group-hover:rotate-90" />
                  Simpan Skor
                </button>
              </div>
            </div>

            {/* LEADERBOARD PANEL */}
            <div className="w-full shrink-0">
               <div className="bg-slate-900/40 backdrop-blur-md rounded-[1.25rem] md:rounded-[2rem] p-4 md:p-6 flex flex-col gap-4 border border-white/5">
                  <div className="text-xs md:text-sm font-bold uppercase tracking-widest text-blue-400 flex items-center justify-center sm:justify-start gap-2">
                    <History className="w-4 h-4 md:w-5 md:h-5" /> Riwayat Juara
                  </div>
                  
                  {Object.keys(leaderboard).length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-white/10 rounded-xl md:rounded-2xl bg-white/5 opacity-60">
                      <Trophy className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-3 opacity-50" />
                      <p className="text-xs md:text-sm">Belum ada pemenang.</p>
                    </div>
                  ) : (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 m-0 p-0">
                      {Object.entries(leaderboard)
                        .sort(([, a], [, b]) => b - a)
                        .map(([name, wins], index) => (
                        <li key={name} className="flex justify-between items-center p-3 md:p-4 bg-slate-800/40 rounded-xl md:rounded-2xl border border-white/5 hover:bg-slate-800/60 transition-colors">
                          <div className="font-semibold text-xs md:text-sm text-slate-50 flex items-center gap-3">
                            <span className="opacity-40 text-[10px] md:text-xs min-w-[16px]">#{index + 1}</span>
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden bg-white/5 flex-shrink-0 border border-white/10">
                              <img src={players.find(p => p.name === name)?.avatar || AVATARS[0]} alt="avatar" className="w-full h-full object-cover" />
                            </div>
                            <span className="truncate max-w-[100px] md:max-w-[150px]">{name}</span>
                          </div>
                          <div className="text-green-400 font-bold flex items-center gap-1.5 text-sm md:text-base">
                            {wins} <Crown className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-4 pt-5 border-t border-white/5 text-[10px] md:text-xs opacity-40 text-center uppercase tracking-widest font-semibold flex justify-center items-center gap-2">
                    <span>Target Skor: <span className="text-white font-mono">1000</span> Poin</span>
                  </div>
               </div>
              </div>
            </div>

            {/* Copyright Footer */}
            <div className="mt-8 mb-4 text-center">
              <p className="text-slate-500/80 text-[10px] md:text-xs font-semibold uppercase tracking-widest">© 2026 @lukayproject</p>
            </div>
          </motion.div>
        )}

        {/* WINNER SCREEN */}
        {gameState === 'winner' && (
          <motion.div
            key="winner"
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900/90 backdrop-blur-3xl p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] text-center border-t-2 border-green-400 shadow-[0_20px_60px_rgba(34,197,94,0.2)] max-w-[420px] w-full relative overflow-hidden"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[100px] bg-green-500/20 blur-[50px] pointer-events-none" />
              
              <div className="text-[64px] mb-4 md:mb-5 leading-none relative z-10 flex justify-center gap-2">
                {currentWinners.map((w, i) => (
                  <div key={i} className="relative">
                    <img src={w.avatar} className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-green-400 shadow-xl bg-slate-800 object-cover" />
                    <span className="absolute -bottom-2 -right-2 text-3xl md:text-4xl">👑</span>
                  </div>
                ))}
              </div>
              
              <h2 className="text-2xl md:text-[32px] font-bold text-slate-50 mb-2 md:mb-3 relative z-10">
                <span className="text-green-400">{currentWinners.map(w => w.name).join(' & ')}</span> Menang!
              </h2>
              <div className="text-[13px] md:text-sm text-slate-400 mb-6 md:mb-8 max-w-xs mx-auto relative z-10">
                Berhasil mencapai target poin dan mendominasi permainan.
              </div>

              <div className="bg-slate-950/50 rounded-2xl p-4 md:p-6 border border-white/5 mb-6 md:mb-8 relative z-10">
                <p className="text-[10px] md:text-xs font-semibold text-white/40 uppercase tracking-widest mb-1 md:mb-2">Skor Akhir</p>
                <p className="text-[40px] md:text-[56px] font-light font-mono text-white leading-none tracking-tight">{currentWinners[0]?.score}</p>
              </div>

              <button
                onClick={resetGame}
                className="w-full py-4 md:py-5 bg-white text-slate-900 font-bold rounded-xl md:rounded-2xl hover:bg-slate-200 transition-colors flex items-center justify-center text-sm md:text-base uppercase tracking-widest relative z-10"
              >
                Main Lagi
              </button>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
