'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';

// ─── Constants ─────────────────────────────────────────
const WORDS_ATTEMPT_1 = ["Umbrella", "Catalyst", "Penguin", "Harmony", "Telescope", "Cinnamon", "Glacier", "Voltage", "Marmalade", "Silhouette"];
const WORDS_ATTEMPT_2 = ["Chandelier", "Molecule", "Falcon", "Burgundy", "Compass", "Lavender", "Tornado", "Frequency", "Porcelain", "Blueprint"];

const ARG_PROMPT = "Social media has done more harm than good to modern society.";
const CRE_PROMPT = "Describe Red";

const MEMO_STUDY_TIME = 30;
const MEMO_RECALL_TIME = 60;
const WRITING_TIME = 600;



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

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
);

// ─── Main Component ────────────────────────────────────
export default function Home() {
  const [screen, setScreen] = useState('welcome');
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demographicInfo, setDemographicInfo] = useState({
    name: '',
    age: '',
    sex: '',
    major: '',
    gpa: '',
    englishFluency: 3,
    languages: '',
    readingFreq: 4,
    writingFreq: 4,
  });

  // Data — two different word lists for attempt 1 and 2
  const [words1, setWords1] = useState([]);
  const [words2, setWords2] = useState([]);
  const [argPrompt, setArgPrompt] = useState('');
  const [crePrompt, setCrePrompt] = useState('');

  // User inputs — separate recall for each attempt
  const [recallInput1, setRecallInput1] = useState('');
  const [recallInput2, setRecallInput2] = useState('');
  const [argInput, setArgInput] = useState('');
  const [creInput, setCreInput] = useState('');

  // Results — separate memo results for each attempt
  const [memoResults1, setMemoResults1] = useState(null);
  const [memoResults2, setMemoResults2] = useState(null);
  const [argResults, setArgResults] = useState(null);
  const [creResults, setCreResults] = useState(null);

  // Loading
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [loadingError, setLoadingError] = useState(null);

  // Refs for auto-submit guards
  const recallRef = useRef(null);
  const argRef = useRef(null);
  const creRef = useRef(null);
  const hasSubmittedRecall1 = useRef(false);
  const hasSubmittedRecall2 = useRef(false);
  const hasSubmittedArg = useRef(false);
  const hasSubmittedCre = useRef(false);

  // Timers
  const memoStudyTimer1 = useTimer(MEMO_STUDY_TIME, () => goToRecall1());
  const memoRecallTimer1 = useTimer(MEMO_RECALL_TIME, () => {
    if (!hasSubmittedRecall1.current) submitMemoRecall1();
  });
  const memoStudyTimer2 = useTimer(MEMO_STUDY_TIME, () => goToRecall2());
  const memoRecallTimer2 = useTimer(MEMO_RECALL_TIME, () => {
    if (!hasSubmittedRecall2.current) submitMemoRecall2();
  });
  const argTimer = useTimer(WRITING_TIME, () => {
    if (!hasSubmittedArg.current) submitArgumentative();
  });
  const creTimer = useTimer(WRITING_TIME, () => {
    if (!hasSubmittedCre.current) submitCreative();
  });

  // ── Start Test ──
  function startTest() {
    setWords1(WORDS_ATTEMPT_1);
    setWords2(WORDS_ATTEMPT_2);
    setArgPrompt(ARG_PROMPT);
    setCrePrompt(CRE_PROMPT);
    setRecallInput1('');
    setRecallInput2('');
    setArgInput('');
    setCreInput('');
    hasSubmittedRecall1.current = false;
    hasSubmittedRecall2.current = false;
    hasSubmittedArg.current = false;
    hasSubmittedCre.current = false;
    setScreen('memo-study-1');
    memoStudyTimer1.start(MEMO_STUDY_TIME);
  }

  // ── Attempt 1: Go to Recall ──
  function goToRecall1() {
    setScreen('memo-recall-1');
    memoRecallTimer1.start(MEMO_RECALL_TIME);
    setTimeout(() => recallRef.current?.focus(), 100);
  }

  // ── Attempt 1: Submit Recall → Start Attempt 2 ──
  function submitMemoRecall1() {
    if (hasSubmittedRecall1.current) return;
    hasSubmittedRecall1.current = true;
    memoRecallTimer1.stop();

    const recalled = recallInput1
      .split(/[,\n]+/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length > 0);

    const correctWords = words1.map(w => w.toLowerCase());
    const matched = [];
    const wrong = [];

    recalled.forEach(r => {
      if (correctWords.includes(r) && !matched.includes(r)) {
        matched.push(r);
      } else if (!correctWords.includes(r)) {
        wrong.push(r);
      }
    });

    setMemoResults1({
      score: matched.length,
      total: words1.length,
      matched,
      missed: correctWords.filter(w => !matched.includes(w)),
      wrong,
    });

    // Go to attempt 2
    setScreen('memo-study-2');
    memoStudyTimer2.start(MEMO_STUDY_TIME);
  }

  // ── Attempt 2: Go to Recall ──
  function goToRecall2() {
    setScreen('memo-recall-2');
    memoRecallTimer2.start(MEMO_RECALL_TIME);
    setTimeout(() => recallRef.current?.focus(), 100);
  }

  // ── Attempt 2: Submit Recall → Go to Argumentative ──
  function submitMemoRecall2() {
    if (hasSubmittedRecall2.current) return;
    hasSubmittedRecall2.current = true;
    memoRecallTimer2.stop();

    const recalled = recallInput2
      .split(/[,\n]+/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length > 0);

    const correctWords = words2.map(w => w.toLowerCase());
    const matched = [];
    const wrong = [];

    recalled.forEach(r => {
      if (correctWords.includes(r) && !matched.includes(r)) {
        matched.push(r);
      } else if (!correctWords.includes(r)) {
        wrong.push(r);
      }
    });

    setMemoResults2({
      score: matched.length,
      total: words2.length,
      matched,
      missed: correctWords.filter(w => !matched.includes(w)),
      wrong,
    });

    // Go to argumentative writing
    setScreen('argumentative');
    argTimer.start(WRITING_TIME);
    setTimeout(() => argRef.current?.focus(), 100);
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
      let argResult = null;
      let creResult = null;

      if (argInput.trim().length > 0) {
        const argRes = await fetch('/api/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'argumentative', prompt: argPrompt, text: argInput }),
        });
        if (!argRes.ok) {
          const err = await argRes.json();
          throw new Error(err.error || 'Failed to grade argumentative writing');
        }
        argResult = await argRes.json();
      }

      setLoadingProgress(55);
      setLoadingStatus('Grading creative writing...');

      if (creInput.trim().length > 0) {
        const creRes = await fetch('/api/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'creative', prompt: crePrompt, text: creInput }),
        });
        if (!creRes.ok) {
          const err = await creRes.json();
          throw new Error(err.error || 'Failed to grade creative writing');
        }
        creResult = await creRes.json();
      }

      setLoadingProgress(90);
      setLoadingStatus('Preparing your results...');
      setArgResults(argResult);
      setCreResults(creResult);

      await new Promise(r => setTimeout(r, 600));
      setLoadingProgress(100);
      await new Promise(r => setTimeout(r, 300));

      setScreen('thanks');
    } catch (err) {
      console.error('Grading error:', err);
      setLoadingError(err.message);
      setLoadingStatus(`Error: ${err.message}`);
    }
  }

  // ── Render current screen ──
  return (
    <>
      <SparkleTrail />
      {/* Ambient background */}
      <div className="ambient-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {screen === 'welcome' && <WelcomeScreen onStart={() => setShowDemoModal(true)} />}
      {showDemoModal && (
        <DemographicModal
          info={demographicInfo}
          onChange={setDemographicInfo}
          onSubmit={() => {
            setShowDemoModal(false);
            startTest();
          }}
          onClose={() => setShowDemoModal(false)}
        />
      )}

      {screen === 'memo-study-1' && (
        <MemoStudyScreen words={words1} timer={memoStudyTimer1} attempt={1} />
      )}
      {screen === 'memo-recall-1' && (
        <MemoRecallScreen
          attempt={1}
          timer={memoRecallTimer1}
          value={recallInput1}
          onChange={setRecallInput1}
          onSubmit={submitMemoRecall1}
          inputRef={recallRef}
        />
      )}
      {screen === 'memo-study-2' && (
        <MemoStudyScreen words={words2} timer={memoStudyTimer2} attempt={2} />
      )}
      {screen === 'memo-recall-2' && (
        <MemoRecallScreen
          attempt={2}
          timer={memoRecallTimer2}
          value={recallInput2}
          onChange={setRecallInput2}
          onSubmit={submitMemoRecall2}
          inputRef={recallRef}
        />
      )}

      {screen === 'argumentative' && (
        <WritingScreen
          taskNum="2"
          title="Argumentative Writing"
          subtitle="Write a persuasive paragraph arguing for or against the following statement."
          prompt={argPrompt}
          promptLabel="Prompt"
          placeholder="Start writing your argument..."
          timer={argTimer}
          value={argInput}
          onChange={setArgInput}
          onSubmit={submitArgumentative}
          submitLabel="Submit & Continue"
          inputRef={argRef}
        />
      )}
      {screen === 'creative' && (
        <WritingScreen
          taskNum="3"
          title="Creative Writing"
          subtitle="Write a short, creative story opening inspired by the image described below."
          prompt={crePrompt}
          promptLabel="Image Prompt"
          placeholder="Begin your story..."
          timer={creTimer}
          value={creInput}
          onChange={setCreInput}
          onSubmit={submitCreative}
          submitLabel="Submit & View Results"
          inputRef={creRef}
        />
      )}
      {screen === 'loading' && (
        <LoadingScreen progress={loadingProgress} status={loadingStatus} error={loadingError} />
      )}
      {screen === 'thanks' && (
        <ThanksScreen onDone={() => setScreen('results')} />
      )}
      {screen === 'results' && (
        <ResultsScreen
          memoResults1={memoResults1}
          memoResults2={memoResults2}
          argResults={argResults}
          creResults={creResults}
          demographicInfo={demographicInfo}
          argInput={argInput}
          creInput={creInput}
          argPrompt={argPrompt}
          crePrompt={crePrompt}
          onRetake={() => {
            setScreen('welcome');
            setMemoResults1(null);
            setMemoResults2(null);
            setArgResults(null);
            setCreResults(null);
          }}
        />
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
          This assessment measures your <strong>retention ability</strong> and{' '}
          <strong>expressive ability</strong> through three timed tasks.
          Your responses will be evaluated by AI.
        </p>
        <div className="task-preview">
          {[
            { num: '01', title: 'Memorisation', desc: 'Memorize and recall 10 words — 2 attempts' },
            { num: '02', title: 'Argumentative Writing', desc: 'Write a persuasive paragraph — 10 min' },
            { num: '03', title: 'Creative Writing', desc: 'Write a creative story opening — 10 min' },
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
        <div className="modal-header">
          <h2>Participant Information</h2>
          <p className="screen-subtitle">Please fill in your details before starting the assessment.</p>
        </div>
        <div className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name <span className="required">*</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="Your full name"
                value={info.name}
                onChange={e => update('name', e.target.value)}
              />
            </div>
            <div className="form-group form-group-sm">
              <label className="form-label">Age <span className="required">*</span></label>
              <input
                type="number"
                className="form-input"
                placeholder="Age"
                min="1"
                max="120"
                value={info.age}
                onChange={e => update('age', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Sex <span className="required">*</span></label>
            <div className="btn-group">
              {['Male', 'Female'].map(s => (
                <button
                  key={s}
                  className={`btn-toggle ${info.sex === s ? 'active' : ''}`}
                  onClick={() => update('sex', s)}
                >{s}</button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Major / Faculty</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Computer Science"
              value={info.major}
              onChange={e => update('major', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Academic Performance (GPA)</label>
            <select
              className="form-select"
              value={info.gpa}
              onChange={e => update('gpa', e.target.value)}
            >
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
                <button
                  key={n}
                  className={`btn-toggle ${info.englishFluency === n ? 'active' : ''}`}
                  onClick={() => update('englishFluency', n)}
                >{n}</button>
              ))}
            </div>
            <div className="scale-labels">
              <span>Basic</span>
              <span>Fluent</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Languages Spoken Fluently</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. English, Mandarin, Malay"
              value={info.languages}
              onChange={e => update('languages', e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Reading Frequency / Week</label>
              <div className="btn-group">
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <button
                    key={n}
                    className={`btn-toggle btn-toggle-sm ${info.readingFreq === n ? 'active' : ''}`}
                    onClick={() => update('readingFreq', n)}
                  >{n}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Writing Frequency / Week</label>
              <div className="btn-group">
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <button
                    key={n}
                    className={`btn-toggle btn-toggle-sm ${info.writingFreq === n ? 'active' : ''}`}
                    onClick={() => update('writingFreq', n)}
                  >{n}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          className="btn btn-primary btn-lg modal-submit"
          disabled={!isValid}
          onClick={onSubmit}
        >
          <span>Start Assessment</span>
          <ArrowIcon />
        </button>
      </div>
    </div>
  );
}

function MemoStudyScreen({ words, timer, attempt }) {
  return (
    <section className="screen" key={`memo-study-${attempt}`}>
      <div className="screen-content">
        <div className="screen-header">
          <div className="task-badge">Task 1 of 3 — Attempt {attempt} of 2</div>
          <h2>Memorisation</h2>
          <p className="screen-subtitle">Study these 10 words carefully. You will be asked to recall them.</p>
        </div>
        <div className={`timer-display ${timer.timerClass}`}>
          <ClockIcon />
          <span>{timer.formatted}</span>
        </div>
        <div className="word-grid">
          {words.map((w, i) => (
            <div className="word-card" key={i}>{w}</div>
          ))}
        </div>
        <div className="memo-hint">
          <InfoIcon />
          The words will disappear when the timer ends
        </div>
      </div>
    </section>
  );
}

function MemoRecallScreen({ attempt, timer, value, onChange, onSubmit, inputRef }) {
  return (
    <section className="screen" key={`memo-recall-${attempt}`}>
      <div className="screen-content">
        <div className="screen-header">
          <div className="task-badge">Task 1 of 3 — Attempt {attempt} of 2</div>
          <h2>Recall the Words</h2>
          <p className="screen-subtitle">Type as many words as you can remember, separated by commas or new lines.</p>
        </div>
        <div className={`timer-display ${timer.timerClass}`}>
          <ClockIcon />
          <span>{timer.formatted}</span>
        </div>
        <div className="textarea-wrapper">
          <textarea
            ref={inputRef}
            className="text-input"
            placeholder="Type the words you remember..."
            rows={6}
            value={value}
            onChange={e => onChange(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={onSubmit}>
          <span>{attempt === 1 ? 'Submit & Next Attempt' : 'Submit & Continue'}</span>
          <ArrowIcon />
        </button>
      </div>
    </section>
  );
}

function WritingScreen({ taskNum, title, subtitle, prompt, promptLabel, placeholder, timer, value, onChange, onSubmit, submitLabel, inputRef }) {
  const wordCount = countWords(value);

  return (
    <section className="screen" key={`writing-${taskNum}`}>
      <div className="screen-content">
        <div className="screen-header">
          <div className="task-badge">Task {taskNum} of 3</div>
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

function ResultsScreen({ memoResults1, memoResults2, argResults, creResults, demographicInfo, argInput, creInput, argPrompt, crePrompt, onRetake }) {
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

  const memo1Score = memoResults1?.score ?? 0;
  const memo2Score = memoResults2?.score ?? 0;
  const memoTotalScore = memo1Score + memo2Score;
  const memoTotalPossible = (memoResults1?.total ?? 10) + (memoResults2?.total ?? 10);

  const argTotal = argResults?.scores
    ? Object.values(argResults.scores).reduce((a, b) => a + b, 0)
    : 0;

  const creTotal = creResults?.scores
    ? Object.values(creResults.scores).reduce((a, b) => a + b, 0)
    : 0;

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
    doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth - margin, 27, { align: 'right' });
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

    // Memorisation
    checkPage(40);
    doc.setTextColor(99, 102, 241);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`Memorisation — ${memoTotalScore}/${memoTotalPossible}`, margin, y);
    y += 3;
    doc.line(margin, y, margin + contentWidth, y);
    y += 8;

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    [{ label: 'Attempt 1', result: memoResults1 }, { label: 'Attempt 2', result: memoResults2 }].forEach(({ label, result }) => {
      if (!result) return;
      checkPage(20);
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}: ${result.score}/${result.total}`, margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(16, 185, 129);
      doc.text(`Correct: ${result.matched.map(w => capitalizeFirst(w)).join(', ') || 'None'}`, margin + 4, y);
      y += 5;
      doc.setTextColor(239, 68, 68);
      doc.text(`Missed: ${result.missed.map(w => capitalizeFirst(w)).join(', ') || 'None'}`, margin + 4, y);
      y += 5;
      if (result.wrong.length > 0) {
        doc.setTextColor(245, 158, 11);
        doc.text(`Incorrect: ${result.wrong.map(w => capitalizeFirst(w)).join(', ')}`, margin + 4, y);
        y += 5;
      }
      doc.setTextColor(60, 60, 60);
      y += 3;
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
      // Written response
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
      // Written response
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

        {/* Memorisation — Both Attempts */}
        <div className="result-card">
          <div className="result-card-header">
            <div className="result-icon">🧠</div>
            <div>
              <h3>Memorisation</h3>
              <p className="result-subtitle">Raw retention ability</p>
            </div>
            <div className="result-score-badge">{memoTotalScore}/{memoTotalPossible}</div>
          </div>

          {/* Attempt 1 */}
          {memoResults1 && (
            <MemoAttemptResult label="Attempt 1" result={memoResults1} />
          )}

          {/* Attempt 2 */}
          {memoResults2 && (
            <MemoAttemptResult label="Attempt 2" result={memoResults2} />
          )}
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

// ─── Memo Attempt Result Sub-component ─────────────────
function MemoAttemptResult({ label, result }) {
  return (
    <div className="memo-attempt">
      <div className="memo-attempt-header">
        <span className="memo-attempt-label">{label}</span>
        <span className="memo-attempt-score">{result.score}/{result.total}</span>
      </div>
      <div className="memo-words-list">
        {result.matched.map(w => (
          <span className="memo-word-tag correct" key={`c-${w}`}>✓ {capitalizeFirst(w)}</span>
        ))}
        {result.missed.map(w => (
          <span className="memo-word-tag missed" key={`m-${w}`}>✗ {capitalizeFirst(w)}</span>
        ))}
      </div>
      {result.wrong.length > 0 && (
        <>
          <div style={{ marginTop: 8, marginBottom: 4, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Incorrect guesses:
          </div>
          <div className="memo-words-list">
            {result.wrong.map(w => (
              <span className="memo-word-tag wrong" key={`w-${w}`}>~ {capitalizeFirst(w)}</span>
            ))}
          </div>
        </>
      )}
    </div>
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

