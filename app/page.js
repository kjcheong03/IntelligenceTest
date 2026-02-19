'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';

// ─── Constants ─────────────────────────────────────────
const DSB_START_LEVEL = 5;
const DSB_LEVELS = [5, 7, 9]; // Updated to [5, 7, 9]

const OSPAN_LETTERS = ['F', 'H', 'J', 'K', 'L', 'N', 'P', 'Q', 'R', 'S', 'T', 'Y'];
const OSPAN_EQUATION_TIME = 8;
const OSPAN_LETTER_DISPLAY_MS = 1500;
const OSPAN_SET_SIZES = [5, 7, 9]; // Updated to [5, 7, 9]

const ARG_PROMPT = "Social media has done more harm than good to modern society.";
const CRE_PROMPT = "Describe Red";
const WRITING_TIME = 600;
const TOTAL_TASKS = 4;



function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateDSBSequence(length) {
  const digits = [];
  for (let i = 0; i < length; i++) {
    let d;
    do { d = Math.floor(Math.random() * 9) + 1; } while (i > 0 && d === digits[i - 1]);
    digits.push(d);
  }
  return digits;
}

function generateEquation() {
  const ops = ['+', '−', '×'];
  const opIdx = Math.floor(Math.random() * 3);
  const a = Math.floor(Math.random() * 9) + 1;
  const b = opIdx === 1 ? Math.floor(Math.random() * a) + 1 : Math.floor(Math.random() * 9) + 1;
  let mid;
  if (opIdx === 0) mid = a + b;
  else if (opIdx === 1) mid = a - b;
  else mid = a * b;
  const op2 = Math.random() > 0.5 ? '+' : '−';
  const c = Math.floor(Math.random() * 5) + 1;
  const correct = op2 === '+' ? mid + c : mid - c;
  const isCorrect = Math.random() > 0.5;
  let shown = correct;
  if (!isCorrect) {
    const off = (Math.floor(Math.random() * 3) + 1) * (Math.random() > 0.5 ? 1 : -1);
    shown = correct + off;
    if (shown === correct) shown += 1;
  }
  return { text: `(${a} ${ops[opIdx]} ${b}) ${op2} ${c} = ${shown}`, isCorrect };
}

function generateOSPANTrials(setSizes) {
  // Use fixed order as requested
  return setSizes.map(size => {
    const avail = [...OSPAN_LETTERS];
    const letters = [];
    for (let i = 0; i < size; i++) {
      const idx = Math.floor(Math.random() * avail.length);
      letters.push(avail.splice(idx, 1)[0]);
    }
    const equations = [];
    for (let i = 0; i < size; i++) equations.push(generateEquation());
    return { size, letters, equations };
  });
}

// ─── Timer Hook ────────────────────────────────────────
function useTimer(initialSeconds, onEnd) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useEffect(() => {
    if (!isRunning) return;
    if (remaining <= 0) {
      setIsRunning(false);
      onEndRef.current?.();
      return;
    }
    const id = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(id);
          setIsRunning(false);
          setTimeout(() => onEndRef.current?.(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, remaining]);

  const start = useCallback((secs) => {
    setRemaining(secs);
    setIsRunning(true);
  }, []);

  const stop = useCallback(() => setIsRunning(false), []);

  const timerClass = remaining <= 10 ? 'timer-danger' : remaining <= 30 ? 'timer-warning' : '';

  return { remaining, formatted: formatTime(remaining), start, stop, timerClass, isRunning };
}

// ─── SVG Icons ─────────────────────────────────────────
const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
);

const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);

const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
);

const RefreshIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
);

// ─── Main Component ────────────────────────────────────
export default function Home() {
  const [screen, setScreen] = useState('welcome');
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demographicInfo, setDemographicInfo] = useState({
    name: '', age: '', sex: '', major: '', gpa: '',
    englishFluency: 3, languages: '', readingFreq: 4, writingFreq: 4,
  });

  // DSB State
  const [dsbTrialIdx, setDsbTrialIdx] = useState(0); // Track progress through [3, 5, 7]
  const [dsbLevel, setDsbLevel] = useState(DSB_LEVELS[0]);
  const [dsbSequence, setDsbSequence] = useState([]);
  const [dsbDisplayIndex, setDsbDisplayIndex] = useState(-1);
  const [dsbUserInput, setDsbUserInput] = useState('');
  const [dsbResults, setDsbResults] = useState([]);
  const [dsbMaxSpan, setDsbMaxSpan] = useState(0);

  // OSPAN State
  const [ospanTrials, setOspanTrials] = useState([]);
  const [ospanTrialIdx, setOspanTrialIdx] = useState(0);
  const [ospanPairIdx, setOspanPairIdx] = useState(0);
  const [ospanEqResults, setOspanEqResults] = useState([]);
  const [ospanRecalled, setOspanRecalled] = useState([]);
  const [ospanResults, setOspanResults] = useState([]);
  const hasAnsweredEq = useRef(false);

  // Writing State
  const [argPrompt, setArgPrompt] = useState('');
  const [crePrompt, setCrePrompt] = useState('');
  const [argInput, setArgInput] = useState('');
  const [creInput, setCreInput] = useState('');
  const [argResults, setArgResults] = useState(null);
  const [creResults, setCreResults] = useState(null);

  // Loading
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [loadingError, setLoadingError] = useState(null);

  // Refs
  const dsbInputRef = useRef(null);
  const argRef = useRef(null);
  const creRef = useRef(null);
  const hasSubmittedArg = useRef(false);
  const hasSubmittedCre = useRef(false);

  // Timers
  const ospanEqTimer = useTimer(OSPAN_EQUATION_TIME, () => {
    if (!hasAnsweredEq.current) { hasAnsweredEq.current = true; handleOspanEqTimeout(); }
  });
  const argTimer = useTimer(WRITING_TIME, () => { if (!hasSubmittedArg.current) submitArgumentative(); });
  const creTimer = useTimer(WRITING_TIME, () => { if (!hasSubmittedCre.current) submitCreative(); });

  // ── DSB: Animate digit display ──
  useEffect(() => {
    if (screen !== 'dsb-display') return;
    if (dsbDisplayIndex >= dsbSequence.length) {
      setScreen('dsb-input');
      setDsbUserInput('');
      setTimeout(() => dsbInputRef.current?.focus(), 100);
      return;
    }
    // Dynamic speed: Slower for lower levels (5), faster for higher (9)
    // 5 -> 1200ms, 7 -> 900ms, 9 -> 600ms
    const delay = dsbLevel <= 5 ? 1200 : dsbLevel <= 7 ? 900 : 600;
    const t = setTimeout(() => setDsbDisplayIndex(p => p + 1), delay);
    return () => clearTimeout(t);
  }, [screen, dsbDisplayIndex, dsbSequence.length, dsbLevel]);

  // ── OSPAN: Letter auto-advance ──
  useEffect(() => {
    if (screen !== 'ospan-letter') return;
    const t = setTimeout(() => {
      const trial = ospanTrials[ospanTrialIdx];
      if (!trial) return;
      if (ospanPairIdx + 1 < trial.size) {
        setOspanPairIdx(p => p + 1);
        hasAnsweredEq.current = false;
        setScreen('ospan-equation');
        ospanEqTimer.start(OSPAN_EQUATION_TIME);
      } else {
        setOspanRecalled([]);
        setScreen('ospan-recall');
      }
    }, OSPAN_LETTER_DISPLAY_MS);
    return () => clearTimeout(t);
  }, [screen, ospanPairIdx, ospanTrialIdx, ospanTrials]);

  // ── Start Test ──
  function startTest() {
    setDsbTrialIdx(0);
    const startLevel = DSB_LEVELS[0];
    const seq = generateDSBSequence(startLevel);
    setDsbLevel(startLevel);
    setDsbSequence(seq);
    setDsbDisplayIndex(0);
    setDsbResults([]);
    setDsbMaxSpan(0);
    setDsbUserInput('');
    setOspanTrials(generateOSPANTrials(OSPAN_SET_SIZES));
    setOspanTrialIdx(0); setOspanPairIdx(0);
    setOspanEqResults([]); setOspanRecalled([]); setOspanResults([]);
    setArgPrompt(ARG_PROMPT); setCrePrompt(CRE_PROMPT);
    setArgInput(''); setCreInput('');
    hasSubmittedArg.current = false; hasSubmittedCre.current = false;
    setScreen('dsb-display');
  }

  // ── DSB: Submit answer ──
  function submitDSBAnswer() {
    const reversed = [...dsbSequence].reverse();
    const userDigits = dsbUserInput.split('').map(Number).filter(n => !isNaN(n));
    let numCorrect = 0;
    for (let i = 0; i < reversed.length; i++) {
      if (i < userDigits.length && userDigits[i] === reversed[i]) {
        numCorrect++;
      }
    }
    const isCorrect = reversed.length === userDigits.length && numCorrect === reversed.length;
    const attempt = { level: dsbLevel, sequence: [...dsbSequence], reversed, userAnswer: userDigits, correct: isCorrect, numCorrect };
    const newResults = [...dsbResults, attempt];
    setDsbResults(newResults);

    if (isCorrect && dsbLevel > dsbMaxSpan) {
      setDsbMaxSpan(dsbLevel);
    }

    // Move to next fixed level regardless of success/failure (battery style)
    const nextIdx = dsbTrialIdx + 1;
    if (nextIdx < DSB_LEVELS.length) {
      setDsbTrialIdx(nextIdx);
      const nextLevel = DSB_LEVELS[nextIdx];
      setDsbLevel(nextLevel);
      setDsbSequence(generateDSBSequence(nextLevel));
      setDsbDisplayIndex(0);
      setScreen('dsb-display');
    } else {
      startOSPAN();
    }
  }

  // ── Start OSPAN ──
  function startOSPAN() {
    setOspanTrialIdx(0); setOspanPairIdx(0);
    setOspanEqResults([]); setOspanRecalled([]);
    hasAnsweredEq.current = false;
    setScreen('ospan-equation');
    ospanEqTimer.start(OSPAN_EQUATION_TIME);
  }

  // ── OSPAN: equation answer ──
  function handleOspanEqAnswer(userAnswer) {
    if (hasAnsweredEq.current) return;
    hasAnsweredEq.current = true;
    ospanEqTimer.stop();
    const trial = ospanTrials[ospanTrialIdx];
    const eq = trial.equations[ospanPairIdx];
    setOspanEqResults(p => [...p, userAnswer === eq.isCorrect]);
    setScreen('ospan-letter');
  }

  function handleOspanEqTimeout() {
    ospanEqTimer.stop();
    setOspanEqResults(p => [...p, false]);
    setScreen('ospan-letter');
  }

  // ── OSPAN: submit recall ──
  function submitOSPANRecall() {
    const trial = ospanTrials[ospanTrialIdx];
    let lettersCorrect = 0;
    for (let i = 0; i < trial.letters.length; i++) {
      if (i < ospanRecalled.length && ospanRecalled[i] === trial.letters[i]) lettersCorrect++;
    }
    const mathCorrect = ospanEqResults.filter(Boolean).length;
    const result = {
      setSize: trial.size, correctLetters: trial.letters,
      recalledLetters: [...ospanRecalled], lettersCorrect,
      allCorrect: lettersCorrect === trial.letters.length,
      mathCorrect, mathTotal: trial.size, eqResults: [...ospanEqResults],
    };
    const newResults = [...ospanResults, result];
    setOspanResults(newResults);

    if (ospanTrialIdx + 1 < ospanTrials.length) {
      setOspanTrialIdx(p => p + 1);
      setOspanPairIdx(0); setOspanEqResults([]); setOspanRecalled([]);
      hasAnsweredEq.current = false;
      setScreen('ospan-equation');
      ospanEqTimer.start(OSPAN_EQUATION_TIME);
    } else {
      setScreen('argumentative');
      argTimer.start(WRITING_TIME);
      setTimeout(() => argRef.current?.focus(), 100);
    }
  }

  // ── Submit Argumentative ──
  function submitArgumentative() {
    if (hasSubmittedArg.current) return;
    hasSubmittedArg.current = true;
    argTimer.stop();
    setScreen('creative');
    creTimer.start(WRITING_TIME);
    setTimeout(() => creRef.current?.focus(), 100);
  }

  // ── Submit Creative ──
  function submitCreative() {
    if (hasSubmittedCre.current) return;
    hasSubmittedCre.current = true;
    creTimer.stop();
    setScreen('loading');
    gradeAll();
  }

  // ── Grade via API ──
  async function gradeAll() {
    setLoadingProgress(10);
    setLoadingStatus('Grading argumentative writing...');
    setLoadingError(null);
    try {
      let argResult = null, creResult = null;
      if (argInput.trim().length > 0) {
        const r = await fetch('/api/grade', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'argumentative', prompt: argPrompt, text: argInput })
        });
        if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed to grade argumentative writing'); }
        argResult = await r.json();
      }
      setLoadingProgress(55); setLoadingStatus('Grading creative writing...');
      if (creInput.trim().length > 0) {
        const r = await fetch('/api/grade', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'creative', prompt: crePrompt, text: creInput })
        });
        if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed to grade creative writing'); }
        creResult = await r.json();
      }
      setLoadingProgress(90); setLoadingStatus('Preparing your results...');
      setArgResults(argResult); setCreResults(creResult);
      await new Promise(r => setTimeout(r, 600));
      setLoadingProgress(100); await new Promise(r => setTimeout(r, 300));
      setScreen('thanks');
    } catch (err) {
      console.error('Grading error:', err);
      setLoadingError(err.message); setLoadingStatus(`Error: ${err.message}`);
    }
  }

  // ── Render ──
  return (
    <>
      <SparkleTrail />
      <div className="ambient-bg">
        <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
      </div>

      {screen === 'welcome' && <WelcomeScreen onStart={() => setShowDemoModal(true)} />}
      {showDemoModal && (
        <DemographicModal info={demographicInfo} onChange={setDemographicInfo}
          onSubmit={() => { setShowDemoModal(false); startTest(); }}
          onClose={() => setShowDemoModal(false)} />
      )}

      {screen === 'dsb-display' && (
        <DSBDisplayScreen digit={dsbDisplayIndex >= 0 && dsbDisplayIndex < dsbSequence.length ? dsbSequence[dsbDisplayIndex] : null}
          position={dsbDisplayIndex} total={dsbSequence.length} level={dsbLevel} />
      )}
      {screen === 'dsb-input' && (
        <DSBInputScreen level={dsbLevel} sequenceLength={dsbSequence.length}
          value={dsbUserInput} onChange={setDsbUserInput} onSubmit={submitDSBAnswer} inputRef={dsbInputRef} />
      )}

      {screen === 'ospan-equation' && ospanTrials[ospanTrialIdx] && (
        <OSPANEquationScreen trial={ospanTrials[ospanTrialIdx]} trialIdx={ospanTrialIdx}
          totalTrials={ospanTrials.length} pairIdx={ospanPairIdx} timer={ospanEqTimer}
          onAnswer={handleOspanEqAnswer} />
      )}
      {screen === 'ospan-letter' && ospanTrials[ospanTrialIdx] && (
        <OSPANLetterScreen letter={ospanTrials[ospanTrialIdx].letters[ospanPairIdx]}
          pairIdx={ospanPairIdx} totalPairs={ospanTrials[ospanTrialIdx].size} />
      )}
      {screen === 'ospan-recall' && ospanTrials[ospanTrialIdx] && (
        <OSPANRecallScreen trialIdx={ospanTrialIdx} totalTrials={ospanTrials.length}
          setSize={ospanTrials[ospanTrialIdx].size} selected={ospanRecalled}
          onSelect={l => { if (ospanRecalled.length < ospanTrials[ospanTrialIdx].size) setOspanRecalled(p => [...p, l]); }}
          onUndo={() => setOspanRecalled(p => p.slice(0, -1))}
          onClear={() => setOspanRecalled([])}
          onSubmit={submitOSPANRecall} />
      )}

      {screen === 'argumentative' && (
        <WritingScreen taskNum="3" totalTasks={TOTAL_TASKS}
          title="Argumentative Writing"
          subtitle="Write a persuasive paragraph arguing for or against the following statement."
          prompt={argPrompt} promptLabel="Prompt" placeholder="Start writing your argument..."
          timer={argTimer} value={argInput} onChange={setArgInput}
          onSubmit={submitArgumentative} submitLabel="Submit & Continue" inputRef={argRef} />
      )}
      {screen === 'creative' && (
        <WritingScreen taskNum="4" totalTasks={TOTAL_TASKS}
          title="Creative Writing"
          subtitle="Write a short, creative story opening inspired by the image described below."
          prompt={crePrompt} promptLabel="Image Prompt" placeholder="Begin your story..."
          timer={creTimer} value={creInput} onChange={setCreInput}
          onSubmit={submitCreative} submitLabel="Submit & View Results" inputRef={creRef} />
      )}

      {screen === 'loading' && <LoadingScreen progress={loadingProgress} status={loadingStatus} error={loadingError} />}
      {screen === 'thanks' && <ThanksScreen onDone={() => setScreen('results')} />}
      {screen === 'results' && (
        <ResultsScreen dsbResults={dsbResults} dsbMaxSpan={dsbMaxSpan}
          ospanResults={ospanResults} argResults={argResults} creResults={creResults}
          demographicInfo={demographicInfo} argInput={argInput} creInput={creInput}
          argPrompt={argPrompt} crePrompt={crePrompt}
          onRetake={() => {
            setScreen('welcome'); setDsbResults([]); setDsbMaxSpan(0);
            setOspanResults([]); setArgResults(null); setCreResults(null);
          }} />
      )}
    </>
  );
}

// ─── Screen Components ─────────────────────────────────

function WelcomeScreen({ onStart }) {
  return (
    <section className="screen" key="welcome">
      <div className="screen-content">
        <div className="welcome-badge">Cognitive Assessment</div>
        <h1 className="welcome-title">
          <span className="title-line">Intelligence</span>
          <span className="title-line gradient-text">Test</span>
        </h1>
        <p className="welcome-desc">
          This assessment measures your <strong>working memory</strong> and{' '}
          <strong>expressive ability</strong> through four timed tasks.
          Your responses will be evaluated by AI.
        </p>
        <div className="task-preview">
          {[
            { num: '01', title: 'Digit Span Backward', desc: 'Recall digit sequences in reverse order' },
            { num: '02', title: 'Operation Span', desc: 'Math judgements + letter recall under load' },
            { num: '03', title: 'Argumentative Writing', desc: 'Write a persuasive paragraph — 10 min' },
            { num: '04', title: 'Creative Writing', desc: 'Write a creative story opening — 10 min' },
          ].map(t => (
            <div className="task-preview-item" key={t.num}>
              <div className="task-number">{t.num}</div>
              <div className="task-info">
                <h3>{t.title}</h3>
                <p>{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-lg" onClick={onStart}>
          <span>Begin Assessment</span>
          <ArrowIcon />
        </button>
      </div>
    </section>
  );
}

// ─── Demographic Modal ─────────────────────────────────
function DemographicModal({ info, onChange, onSubmit, onClose }) {
  const update = (field, value) => onChange({ ...info, [field]: value });
  const isValid = info.name.trim() && info.age && info.sex;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <CloseIcon />
        </button>
        <div className="modal-header">
          <h2>Participant Information</h2>
          <p className="screen-subtitle">Please fill in your details before starting the assessment.</p>
        </div>
        <div className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name <span className="required">*</span></label>
              <input type="text" className="form-input" placeholder="Your full name"
                value={info.name} onChange={e => update('name', e.target.value)} />
            </div>
            <div className="form-group form-group-sm">
              <label className="form-label">Age <span className="required">*</span></label>
              <input type="number" className="form-input" placeholder="Age" min="1" max="120"
                value={info.age} onChange={e => update('age', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Sex <span className="required">*</span></label>
            <div className="btn-group">
              {['Male', 'Female'].map(s => (
                <button key={s} className={`btn-toggle ${info.sex === s ? 'active' : ''}`}
                  onClick={() => update('sex', s)}>{s}</button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Major / Faculty</label>
            <input type="text" className="form-input" placeholder="e.g. Computer Science"
              value={info.major} onChange={e => update('major', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Academic Performance (GPA)</label>
            <select className="form-select" value={info.gpa} onChange={e => update('gpa', e.target.value)}>
              <option value="">Select GPA range</option>
              <option value="Below 3">Below 3</option>
              <option value="3 - 3.5">3 – 3.5</option>
              <option value="3.5 - 4">3.5 – 4</option>
              <option value="4 - 4.5">4 – 4.5</option>
              <option value="4.5 - 5">4.5 – 5</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Self-perceived English Fluency</label>
            <div className="btn-group">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} className={`btn-toggle ${info.englishFluency === n ? 'active' : ''}`}
                  onClick={() => update('englishFluency', n)}>{n}</button>
              ))}
            </div>
            <div className="scale-labels"><span>Basic</span><span>Fluent</span></div>
          </div>
          <div className="form-group">
            <label className="form-label">Languages Spoken Fluently</label>
            <input type="text" className="form-input" placeholder="e.g. English, Mandarin, Malay"
              value={info.languages} onChange={e => update('languages', e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Reading Frequency / Week</label>
              <div className="btn-group">
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <button key={n} className={`btn-toggle btn-toggle-sm ${info.readingFreq === n ? 'active' : ''}`}
                    onClick={() => update('readingFreq', n)}>{n}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Writing Frequency / Week</label>
              <div className="btn-group">
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <button key={n} className={`btn-toggle btn-toggle-sm ${info.writingFreq === n ? 'active' : ''}`}
                    onClick={() => update('writingFreq', n)}>{n}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <button className="btn btn-primary btn-lg modal-submit" disabled={!isValid} onClick={onSubmit}>
          <span>Start Assessment</span>
          <ArrowIcon />
        </button>
      </div>
    </div>
  );
}

// ─── DSB Display Screen ────────────────────────────────
function DSBDisplayScreen({ digit, position, total, level }) {
  return (
    <section className="screen" key={`dsb-display-${level}-${position}`}>
      <div className="screen-content">
        <div className="screen-header">
          <div className="task-badge">Task 1 of {TOTAL_TASKS}</div>
          <h2>Digit Span Backward</h2>
          <p className="screen-subtitle">Watch the digits carefully. You will type them in <strong>reverse order</strong>.</p>
        </div>
        <div className="dsb-level-badge">Level {level} — {total} digits</div>
        {digit !== null ? (
          <div className="dsb-digit-display" key={`${level}-${position}`}>
            <span className="dsb-digit">{digit}</span>
          </div>
        ) : (
          <div className="dsb-digit-display">
            <span className="dsb-digit dsb-digit-ready">…</span>
          </div>
        )}
        <div className="dsb-progress">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className={`dsb-dot ${i < position ? 'done' : i === position ? 'active' : ''}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── DSB Input Screen ──────────────────────────────────
function DSBInputScreen({ level, sequenceLength, value, onChange, onSubmit, inputRef }) {
  return (
    <section className="screen" key={`dsb-input-${level}`}>
      <div className="screen-content">
        <div className="screen-header">
          <div className="task-badge">Task 1 of {TOTAL_TASKS}</div>
          <h2>Type Digits in Reverse</h2>
          <p className="screen-subtitle">
            Enter the {sequenceLength} digits you just saw, but in <strong>reverse order</strong> (last digit first).
          </p>
        </div>
        <div className="dsb-level-badge">Level {level}</div>
        <div className="dsb-input-wrap">
          <input ref={inputRef} type="text" inputMode="numeric" pattern="[0-9]*"
            className="form-input dsb-input"
            placeholder={`Enter ${sequenceLength} digits reversed…`}
            value={value} onChange={e => onChange(e.target.value.replace(/[^0-9]/g, ''))}
            maxLength={sequenceLength}
            onKeyDown={e => { if (e.key === 'Enter' && value.length === sequenceLength) onSubmit(); }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button className="btn btn-primary" disabled={value.length !== sequenceLength} onClick={onSubmit}>
            <span>Submit</span>
            <ArrowIcon />
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── OSPAN Equation Screen ─────────────────────────────
function OSPANEquationScreen({ trial, trialIdx, totalTrials, pairIdx, timer, onAnswer }) {
  const eq = trial.equations[pairIdx];
  const pct = (timer.remaining / OSPAN_EQUATION_TIME) * 100;
  return (
    <section className="screen" key={`ospan-eq-${trialIdx}-${pairIdx}`}>
      <div className="screen-content">
        <div className="screen-header">
          <div className="task-badge">Task 2 of {TOTAL_TASKS} — Set {trialIdx + 1} of {totalTrials}</div>
          <h2>Operation Span</h2>
          <p className="screen-subtitle">Is this equation correct? ({pairIdx + 1} of {trial.size}) — Time: <span style={{ color: timer.remaining <= 3 ? 'var(--danger)' : 'inherit', fontWeight: 600 }}>{timer.remaining}s</span></p>
        </div>
        <div className="ospan-timer-bar">
          <div className="ospan-timer-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="ospan-equation-card">
          <span className="ospan-equation-text">{eq.text}</span>
        </div>
        <div className="ospan-tf-buttons">
          <button className="btn ospan-btn-true" onClick={() => onAnswer(true)}>
            <span>✓ True</span>
          </button>
          <button className="btn ospan-btn-false" onClick={() => onAnswer(false)}>
            <span>✗ False</span>
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── OSPAN Letter Screen ───────────────────────────────
function OSPANLetterScreen({ letter, pairIdx, totalPairs }) {
  return (
    <section className="screen" key={`ospan-letter-${pairIdx}`}>
      <div className="screen-content">
        <div className="screen-header">
          <div className="task-badge">Task 2 of {TOTAL_TASKS}</div>
          <h2>Remember This Letter</h2>
          <p className="screen-subtitle">Letter {pairIdx + 1} of {totalPairs}</p>
        </div>
        <div className="ospan-letter-display">
          <span className="ospan-letter">{letter}</span>
        </div>
      </div>
    </section>
  );
}

// ─── OSPAN Recall Screen ───────────────────────────────
function OSPANRecallScreen({ trialIdx, totalTrials, setSize, selected, onSelect, onUndo, onClear, onSubmit }) {
  return (
    <section className="screen" key={`ospan-recall-${trialIdx}`}>
      <div className="screen-content">
        <div className="screen-header">
          <div className="task-badge">Task 2 of {TOTAL_TASKS} — Set {trialIdx + 1} of {totalTrials}</div>
          <h2>Recall the Letters</h2>
          <p className="screen-subtitle">Click the letters in the <strong>order they appeared</strong>. ({selected.length}/{setSize})</p>
        </div>
        <div className="ospan-selected-row">
          {Array.from({ length: setSize }).map((_, i) => (
            <div key={i} className={`ospan-selected-slot ${i < selected.length ? 'filled' : ''}`}>
              {selected[i] || '—'}
            </div>
          ))}
        </div>
        <div className="ospan-letter-grid">
          {OSPAN_LETTERS.map(l => (
            <button key={l} className={`ospan-grid-btn ${selected.includes(l) ? 'used' : ''}`}
              disabled={selected.includes(l) || selected.length >= setSize}
              onClick={() => onSelect(l)}>
              {l}
            </button>
          ))}
        </div>
        <div className="ospan-recall-actions">
          <button className="btn btn-secondary" onClick={onUndo} disabled={selected.length === 0}>Undo</button>
          <button className="btn btn-secondary" onClick={onClear} disabled={selected.length === 0}>Clear</button>
          <button className="btn btn-primary" onClick={onSubmit}>
            <span>Submit</span>
            <ArrowIcon />
          </button>
        </div>
      </div>
    </section>
  );
}


function WritingScreen({ taskNum, totalTasks, title, subtitle, prompt, promptLabel, placeholder, timer, value, onChange, onSubmit, submitLabel, inputRef }) {
  const wordCount = countWords(value);

  return (
    <section className="screen" key={`writing-${taskNum}`}>
      <div className="screen-content">
        <div className="screen-header">
          <div className="task-badge">Task {taskNum} of {totalTasks}</div>
          <h2>{title}</h2>
          <p className="screen-subtitle">{subtitle}</p>
        </div>
        <div className={`timer-display timer-large ${timer.timerClass}`}>
          <ClockIcon />
          <span>{timer.formatted}</span>
        </div>
        <div className="prompt-card">
          <div className="prompt-label">{promptLabel}</div>
          <p className="prompt-text">&ldquo;{prompt}&rdquo;</p>
        </div>
        <div className="textarea-wrapper">
          <textarea
            ref={inputRef}
            className="text-input text-input-large"
            placeholder={placeholder}
            rows={12}
            value={value}
            onChange={e => onChange(e.target.value)}
          />
          <div className="word-count">{wordCount} words</div>
        </div>
        <button className="btn btn-primary" onClick={onSubmit}>
          <span>{submitLabel}</span>
          <ArrowIcon />
        </button>
      </div>
    </section>
  );
}

function LoadingScreen({ progress, status, error }) {
  return (
    <section className="screen" key="loading">
      <div className="screen-content loading-content">
        <div className="loading-spinner">
          <div className="spinner-ring" />
          <div className="spinner-ring spinner-ring-2" />
          <div className="spinner-ring spinner-ring-3" />
        </div>
        <h2 className="loading-title">Analysing Your Responses</h2>
        <p className="loading-subtitle">{status}</p>
        <div className="loading-progress">
          <div
            className="loading-progress-bar"
            style={{ width: `${progress}%`, background: error ? 'var(--danger)' : undefined }}
          />
        </div>
      </div>
    </section>
  );
}

function ResultsScreen({ dsbResults = [], dsbMaxSpan = 0, ospanResults = [], argResults, creResults, demographicInfo, argInput, creInput, argPrompt, crePrompt, onRetake }) {
  const argDimensions = [
    { key: 'thesis_focus', label: 'Thesis & Focus' },
    { key: 'evidence_support', label: 'Evidence & Support' },
    { key: 'structure_coherence', label: 'Structure & Coherence' },
    { key: 'syntax_fluency', label: 'Syntax & Fluency' },
    { key: 'word_choice', label: 'Word Choice' },
  ];

  const creDimensions = [
    { key: 'originality', label: 'Originality' },
    { key: 'imagery_detail', label: 'Imagery & Detail' },
    { key: 'narrative_structure', label: 'Narrative Structure' },
    { key: 'figurative_language', label: 'Figurative Language' },
    { key: 'pacing_rhythm', label: 'Pacing & Rhythm' },
  ];

  const argTotal = argResults?.scores ? Object.values(argResults.scores).reduce((a, b) => a + b, 0) : 0;
  const creTotal = creResults?.scores ? Object.values(creResults.scores).reduce((a, b) => a + b, 0) : 0;

  const [showArgEssay, setShowArgEssay] = useState(false);
  const [showCreEssay, setShowCreEssay] = useState(false);

  // OSPAN Stats
  const ospanTotalLetters = ospanResults.reduce((sum, r) => sum + r.lettersCorrect, 0);
  const ospanTotalPossible = ospanResults.reduce((sum, r) => sum + r.setSize, 0);
  const ospanMathCorrect = ospanResults.reduce((sum, r) => sum + r.mathCorrect, 0);
  const ospanMathTotal = ospanResults.reduce((sum, r) => sum + r.mathTotal, 0);

  // ── PDF Download ──
  function downloadPDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    const checkPage = (needed = 20) => {
      if (y + needed > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 20;
      }
    };

    // Header
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Intelligence Test — Results', margin, 27);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(dateStr, pageWidth - margin, 27, { align: 'right' });
    y = 52;

    // Demographic Info
    doc.setTextColor(99, 102, 241);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Participant Information', margin, y);
    y += 3;
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentWidth, y);
    y += 8;

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const demoFields = [
      ['Name', demographicInfo.name || '—'],
      ['Age', demographicInfo.age || '—'],
      ['Sex', demographicInfo.sex || '—'],
      ['Major / Faculty', demographicInfo.major || '—'],
      ['GPA Range', demographicInfo.gpa || '—'],
      ['English Fluency', `${demographicInfo.englishFluency} / 5`],
      ['Languages', demographicInfo.languages || '—'],
      ['Reading Freq.', `${demographicInfo.readingFreq}x / week`],
      ['Writing Freq.', `${demographicInfo.writingFreq}x / week`],
    ];
    demoFields.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 45, y);
      y += 6;
    });
    y += 6;

    // DSB Results
    checkPage(40);
    doc.setTextColor(99, 102, 241);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`Digit Span Backward — Max Span: ${dsbMaxSpan}`, margin, y);
    y += 3;
    doc.line(margin, y, margin + contentWidth, y);
    y += 8;

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    dsbResults.forEach((res) => {
      checkPage(15);
      const label = `Level ${res.level} (${res.sequence.length} digits)`;
      const status = res.correct ? 'PASSED' : 'FAILED';
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, margin, y);
      doc.setTextColor(res.correct ? 16 : 239, res.correct ? 185 : 68, res.correct ? 129 : 68);
      doc.text(status, margin + 40, y);
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
      doc.text(`(${res.numCorrect}/${res.sequence.length} correct)`, margin + 60, y);
      y += 5;
      const seqStr = res.sequence.join('');
      const revStr = res.reversed.join('');
      const ansStr = res.userAnswer.join('');
      doc.text(`Seq: ${seqStr}  |  Rev: ${revStr}  |  Ans: ${ansStr}`, margin + 4, y);
      y += 6;
    });
    y += 4;

    // OSPAN Results
    checkPage(40);
    doc.setTextColor(99, 102, 241);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`Operation Span — Score: ${ospanTotalLetters}/${ospanTotalPossible}`, margin, y);
    y += 3;
    doc.line(margin, y, margin + contentWidth, y);
    y += 8;

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    const mathAcc = ospanMathTotal > 0 ? Math.round(ospanMathCorrect / ospanMathTotal * 100) : 0;
    doc.text(`Math Accuracy: ${ospanMathCorrect}/${ospanMathTotal} (${mathAcc}%)`, margin, y);
    y += 6;

    ospanResults.forEach((res, i) => {
      checkPage(15);
      doc.setFont('helvetica', 'bold');
      doc.text(`Set ${i + 1} (Size ${res.setSize}):`, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${res.lettersCorrect}/${res.setSize} letters recall, ${res.mathCorrect}/${res.setSize} math`, margin + 40, y);
      y += 5;
      const recStr = res.recalledLetters.join('');
      const corStr = res.correctLetters.join('');
      doc.text(`Correct: ${corStr}  |  Recalled: ${recStr}`, margin + 4, y);
      y += 6;
    });
    y += 4;

    // Argumentative Writing
    checkPage(50);
    doc.setTextColor(99, 102, 241);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`Argumentative Writing — ${argTotal}/20`, margin, y);
    y += 3;
    doc.line(margin, y, margin + contentWidth, y);
    y += 8;

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    if (argResults?.scores) {
      doc.setFont('helvetica', 'italic');
      doc.text(`Prompt: "${argPrompt}"`, margin, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      argDimensions.forEach(d => {
        checkPage();
        const score = argResults.scores[d.key] || 1;
        doc.setFont('helvetica', 'bold');
        doc.text(`${d.label}:`, margin + 4, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${score}/4`, margin + 60, y);
        y += 5;
      });
      y += 3;
      if (argResults.feedback) {
        checkPage(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Feedback:', margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        const fbLines = doc.splitTextToSize(argResults.feedback, contentWidth - 4);
        fbLines.forEach(line => {
          checkPage();
          doc.text(line, margin + 4, y);
          y += 5;
        });
      }
      if (argInput && argInput.trim()) {
        y += 4;
        checkPage(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Written Response:', margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        const argLines = doc.splitTextToSize(argInput.trim(), contentWidth - 4);
        argLines.forEach(line => {
          checkPage();
          doc.text(line, margin + 4, y);
          y += 5;
        });
      }
    } else {
      doc.text('No writing submitted.', margin, y);
    }
    y += 8;

    // Creative Writing
    checkPage(50);
    doc.setTextColor(99, 102, 241);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`Creative Writing — ${creTotal}/20`, margin, y);
    y += 3;
    doc.line(margin, y, margin + contentWidth, y);
    y += 8;

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    if (creResults?.scores) {
      doc.setFont('helvetica', 'italic');
      doc.text(`Prompt: "${crePrompt}"`, margin, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      creDimensions.forEach(d => {
        checkPage();
        const score = creResults.scores[d.key] || 1;
        doc.setFont('helvetica', 'bold');
        doc.text(`${d.label}:`, margin + 4, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${score}/4`, margin + 60, y);
        y += 5;
      });
      y += 3;
      if (creResults.feedback) {
        checkPage(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Feedback:', margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        const fbLines = doc.splitTextToSize(creResults.feedback, contentWidth - 4);
        fbLines.forEach(line => {
          checkPage();
          doc.text(line, margin + 4, y);
          y += 5;
        });
      }
      if (creInput && creInput.trim()) {
        y += 4;
        checkPage(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Written Response:', margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        const creLines = doc.splitTextToSize(creInput.trim(), contentWidth - 4);
        creLines.forEach(line => {
          checkPage();
          doc.text(line, margin + 4, y);
          y += 5;
        });
      }
    } else {
      doc.text('No writing submitted.', margin, y);
    }

    const safeName = (demographicInfo.name || 'participant').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Intelligence_Test_${safeName}.pdf`);
  }

  return (
    <section className="screen" key="results">
      <div className="screen-content results-content">
        <div className="screen-header">
          <div className="welcome-badge">Assessment Complete</div>
          <h2>Your Results</h2>
        </div>

        {/* DSB Results */}
        <div className="result-card">
          <div className="result-card-header">
            <div className="result-icon">🔢</div>
            <div>
              <h3>Digit Span Backward</h3>
              <p className="result-subtitle">Working Memory Capacity</p>
            </div>
            <div className="result-score-badge">Max: {dsbMaxSpan}</div>
          </div>
          <div className="memo-words-list">
            {dsbResults.map((r, i) => (
              <div key={i} className={`memo-word-tag ${r.correct ? 'correct' : 'wrong'}`} style={{ display: 'block', width: '100%', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, marginRight: 8 }}>Level {r.level} ({r.sequence.length} digits):</span>
                {r.correct ? 'PASSED' : 'FAILED'} ({r.numCorrect}/{r.sequence.length} correct) — Seq: {r.sequence.join('')} | Rev: {r.reversed.join('')} | Ans: {r.userAnswer.join('')}
              </div>
            ))}
          </div>
        </div>

        {/* OSPAN Results */}
        <div className="result-card">
          <div className="result-card-header">
            <div className="result-icon">🧠</div>
            <div>
              <h3>Operation Span</h3>
              <p className="result-subtitle">Dual-Task Efficiency</p>
            </div>
            <div className="result-score-badge">{ospanTotalLetters}/{ospanTotalPossible}</div>
          </div>
          <p style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>
            Math Accuracy: <strong>{ospanMathTotal > 0 ? Math.round(ospanMathCorrect / ospanMathTotal * 100) : 0}%</strong> ({ospanMathCorrect}/{ospanMathTotal})
          </p>
          <div className="memo-words-list">
            {ospanResults.map((r, i) => (
              <div key={i} className="memo-attempt" style={{ width: '100%' }}>
                <div className="memo-attempt-header">
                  <span className="memo-attempt-label">Set {i + 1} (Size {r.setSize})</span>
                  <span className="memo-attempt-score">{r.lettersCorrect}/{r.setSize}</span>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Target: {r.correctLetters.join('')} <br />
                  Recall: {r.recalledLetters.join('')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Argumentative */}
        <div className="result-card">
          <div className="result-card-header">
            <div className="result-icon">⚖️</div>
            <div>
              <h3>Argumentative Writing</h3>
              <p className="result-subtitle">Rhetorical skill</p>
            </div>
            <div className="result-score-badge">{argTotal}/20</div>
          </div>
          {argResults?.scores ? (
            <>
              <div className="rubric-grid">
                {argDimensions.map(d => {
                  const score = argResults.scores[d.key] || 1;
                  return (
                    <div className="rubric-row" key={d.key}>
                      <span className="rubric-label">{d.label}</span>
                      <div className="rubric-bar-container">
                        <div className={`rubric-bar score-${score}`} />
                      </div>
                      <span className={`rubric-score score-${score}`}>{score}/4</span>
                    </div>
                  );
                })}
              </div>
              <div className="result-feedback">
                <strong>Feedback:</strong> {argResults.feedback || 'No feedback available.'}
              </div>
              {argInput && argInput.trim() && (
                <div className="essay-section">
                  <button className="essay-toggle-btn" onClick={() => setShowArgEssay(!showArgEssay)}>
                    {showArgEssay ? 'Hide Your Response' : 'Show Your Response'}
                    <span style={{ transform: showArgEssay ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                  </button>
                  {showArgEssay && <div className="essay-container">{argInput}</div>}
                </div>
              )}
            </>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No writing submitted.</p>
          )}
        </div>

        {/* Creative */}
        <div className="result-card">
          <div className="result-card-header">
            <div className="result-icon">✨</div>
            <div>
              <h3>Creative Writing</h3>
              <p className="result-subtitle">Imaginative expression</p>
            </div>
            <div className="result-score-badge">{creTotal}/20</div>
          </div>
          {creResults?.scores ? (
            <>
              <div className="rubric-grid">
                {creDimensions.map(d => {
                  const score = creResults.scores[d.key] || 1;
                  return (
                    <div className="rubric-row" key={d.key}>
                      <span className="rubric-label">{d.label}</span>
                      <div className="rubric-bar-container">
                        <div className={`rubric-bar score-${score}`} />
                      </div>
                      <span className={`rubric-score score-${score}`}>{score}/4</span>
                    </div>
                  );
                })}
              </div>
              <div className="result-feedback">
                <strong>Feedback:</strong> {creResults.feedback || 'No feedback available.'}
              </div>
              {creInput && creInput.trim() && (
                <div className="essay-section">
                  <button className="essay-toggle-btn" onClick={() => setShowCreEssay(!showCreEssay)}>
                    {showCreEssay ? 'Hide Your Response' : 'Show Your Response'}
                    <span style={{ transform: showCreEssay ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                  </button>
                  {showCreEssay && <div className="essay-container">{creInput}</div>}
                </div>
              )}
            </>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No writing submitted.</p>
          )}
        </div>

        <div className="results-actions">
          <button className="btn btn-secondary btn-lg" onClick={downloadPDF}>
            <DownloadIcon />
            <span>Download PDF</span>
          </button>
          <button className="btn btn-primary btn-lg" onClick={onRetake}>
            <span>Retake Assessment</span>
            <RefreshIcon />
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Thanks Interstitial Screen ────────────────────────
function ThanksScreen({ onDone }) {
  const audioRef = useRef(null);

  useEffect(() => {
    // Play sound
    const audio = new Audio('/sound.mp3');
    audioRef.current = audio;
    audio.play().catch(() => { });

    // Auto transition to results after 3.5 seconds
    const timer = setTimeout(() => {
      onDone();
    }, 3500);

    return () => {
      clearTimeout(timer);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [onDone]);

  return (
    <section className="screen" key="thanks">
      <div className="screen-content thanks-content">
        <div className="thanks-character-wrapper">
          <img
            src="/character.png"
            alt="Thank you character"
            className="thanks-character"
          />
        </div>
        <h2 className="thanks-text">Thanks for taking the test!</h2>
      </div>
    </section>
  );
}

// ─── Sparkle Cursor Trail ──────────────────────────────
function SparkleTrail() {
  const canvasRef = useRef(null);
  const particles = useRef([]);
  const animId = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const COLORS = ['#a78bfa', '#818cf8', '#c4b5fd', '#fbbf24', '#f9fafb'];

    function onMouseMove(e) {
      for (let i = 0; i < 2 + Math.random(); i++) {
        particles.current.push({
          x: e.clientX + (Math.random() - 0.5) * 10,
          y: e.clientY + (Math.random() - 0.5) * 10,
          size: Math.random() * 4 + 1.5,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5 - 0.5,
          life: 1,
          decay: 0.015 + Math.random() * 0.02,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.2,
        });
      }
    }
    window.addEventListener('mousemove', onMouseMove);

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const ps = particles.current;

      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        p.rotation += p.rotSpeed;

        if (p.life <= 0) { ps.splice(i, 1); continue; }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.life;

        // Draw a 4-point star sparkle
        const s = p.size * p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        for (let j = 0; j < 4; j++) {
          const angle = (j / 4) * Math.PI * 2 - Math.PI / 2;
          const outerX = Math.cos(angle) * s;
          const outerY = Math.sin(angle) * s;
          const innerAngle = angle + Math.PI / 4;
          const innerX = Math.cos(innerAngle) * s * 0.35;
          const innerY = Math.sin(innerAngle) * s * 0.35;
          if (j === 0) ctx.moveTo(outerX, outerY);
          else ctx.lineTo(outerX, outerY);
          ctx.lineTo(innerX, innerY);
        }
        ctx.closePath();
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();
      }
      animId.current = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      if (animId.current) cancelAnimationFrame(animId.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    />
  );
}

