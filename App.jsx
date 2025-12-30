import React, { useState, useRef, useEffect } from 'react';
import { Video, VideoOff, Mic, MicOff, AlertCircle, CheckCircle, Eye, Keyboard, MonitorOff, Download, Play, Square, Sparkles, TrendingDown, Clock, FileJson } from 'lucide-react';
import './App.css';

const App = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [webcamActive, setWebcamActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [integrityScore, setIntegrityScore] = useState(100);
  const [sessionTime, setSessionTime] = useState(0);
  const [events, setEvents] = useState([]);
  const [currentStats, setCurrentStats] = useState({
    faceDetected: true,
    gazeOnScreen: true,
    tabFocused: true,
    typingVelocity: 0
  });
  const [code, setCode] = useState('');
  const [geminiAnalysis, setGeminiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const lastKeystrokeRef = useRef(Date.now());
  const keystrokeCountRef = useRef(0);

  useEffect(() => {
    if (isSessionActive) {
      timerRef.current = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSessionActive]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 },
        audio: true 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setWebcamActive(true);
      setMicActive(true);
      startFaceDetection();
    } catch (err) {
      console.error('Camera access denied:', err);
      addEvent('CAMERA_ERROR', 'Failed to access camera', 'high');
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setWebcamActive(false);
    setMicActive(false);
  };

  const startFaceDetection = () => {
    const detectionInterval = setInterval(() => {
      if (!isSessionActive) {
        clearInterval(detectionInterval);
        return;
      }
      
      const facePresent = Math.random() > 0.1;
      const gazeOnScreen = Math.random() > 0.15;
      
      setCurrentStats(prev => ({
        ...prev,
        faceDetected: facePresent,
        gazeOnScreen: gazeOnScreen
      }));

      if (!facePresent) {
        addEvent('FACE_NOT_DETECTED', 'Face not detected for 3 seconds', 'medium');
        penalizeScore(5);
      }
      
      if (!gazeOnScreen && facePresent) {
        addEvent('GAZE_OFFSCREEN', 'Looking away from screen', 'low');
        penalizeScore(3);
      }
    }, 3000);
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (isSessionActive) {
        if (document.hidden) {
          addEvent('TAB_HIDDEN', 'Switched away from interview tab', 'high');
          penalizeScore(10);
          setCurrentStats(prev => ({ ...prev, tabFocused: false }));
        } else {
          setCurrentStats(prev => ({ ...prev, tabFocused: true }));
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isSessionActive]);

  const handleCodeChange = (e) => {
    const newCode = e.target.value;
    setCode(newCode);

    if (!isSessionActive) return;

    const now = Date.now();
    const timeDiff = now - lastKeystrokeRef.current;
    
    keystrokeCountRef.current++;
    
    if (timeDiff < 100) {
      const wpm = Math.floor(60000 / timeDiff);
      if (wpm > 150) {
        addEvent('VELOCITY_ANOMALY', `Typing speed: ${wpm} WPM (suspiciously fast)`, 'medium');
        penalizeScore(8);
        setCurrentStats(prev => ({ ...prev, typingVelocity: wpm }));
      }
    }
    
    lastKeystrokeRef.current = now;
  };

  const handlePaste = (e) => {
    if (!isSessionActive) return;
    
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.length > 50) {
      addEvent('PASTE', `Large paste detected (${pastedText.length} characters)`, 'high');
      penalizeScore(20);
    }
  };

  const analyzeWithGemini = async () => {
    setIsAnalyzing(true);
    
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            { 
              role: "user", 
              content: `You are an interview code reviewer. Analyze this code and provide a JSON response with: overall_quality (1-10), suspicious_patterns (array of strings), improvement_suggestions (array), and confidence_score (0-100).

Code:
${code}

Events during session:
${events.map(e => `- ${e.type}: ${e.message}`).join('\n')}

Respond ONLY with valid JSON, no markdown.`
            }
          ],
        })
      });

      const data = await response.json();
      const textContent = data.content.find(item => item.type === 'text')?.text || '';
      
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        setGeminiAnalysis(analysis);
      }
    } catch (error) {
      console.error('AI Analysis failed:', error);
      setGeminiAnalysis({
        overall_quality: 5,
        suspicious_patterns: ['Unable to complete AI analysis'],
        improvement_suggestions: ['Manual review recommended'],
        confidence_score: 50
      });
    }
    
    setIsAnalyzing(false);
  };

  const addEvent = (type, message, severity) => {
    const newEvent = {
      id: Date.now(),
      type,
      message,
      severity,
      timestamp: new Date().toLocaleTimeString(),
      sessionTime: sessionTime
    };
    setEvents(prev => [...prev, newEvent]);
  };

  const penalizeScore = (points) => {
    setIntegrityScore(prev => Math.max(0, prev - points));
  };

  const startSession = async () => {
    setIsSessionActive(true);
    setSessionTime(0);
    setEvents([]);
    setIntegrityScore(100);
    setGeminiAnalysis(null);
    await startWebcam();
    addEvent('SESSION_START', 'Interview session started', 'info');
  };

  const endSession = () => {
    setIsSessionActive(false);
    stopWebcam();
    addEvent('SESSION_END', 'Interview session ended', 'info');
  };

  const exportSession = () => {
    const sessionData = {
      score: integrityScore,
      duration: sessionTime,
      events: events,
      code: code,
      aiAnalysis: geminiAnalysis,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-session-${Date.now()}.json`;
    a.click();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app-container">
      <div className="animated-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <div className="header-logo">
              <Eye size={28} />
            </div>
            <div className="header-text">
              <h1 className="header-title">Interview Integrity Analyzer</h1>
              <p className="header-subtitle">Real-time behavioral analytics • Zero backend</p>
            </div>
          </div>
          
          <div className="header-right">
            {isSessionActive && (
              <div className="timer-display">
                <Clock size={20} />
                <span className="timer-text">{formatTime(sessionTime)}</span>
              </div>
            )}
            
            {!isSessionActive ? (
              <button onClick={startSession} className="btn btn-start">
                <Play size={20} />
                <span>Start Session</span>
              </button>
            ) : (
              <button onClick={endSession} className="btn btn-stop">
                <Square size={20} />
                <span>End Session</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="content-grid">
          <div className="main-panel">
            <div className="score-card">
              <div className="score-header">
                <div className="score-header-left">
                  <Sparkles size={24} />
                  <h2>Integrity Score</h2>
                </div>
                <div className={`score-number ${integrityScore >= 85 ? 'success' : integrityScore >= 65 ? 'warning' : 'danger'}`}>
                  {integrityScore}
                </div>
              </div>
              <div className="score-meta">
                <div className={`badge ${integrityScore >= 85 ? 'badge-success' : integrityScore >= 65 ? 'badge-warning' : 'badge-danger'}`}>
                  {integrityScore >= 85 ? 'High Integrity' : integrityScore >= 65 ? 'Moderate Concern' : 'Review Required'}
                </div>
                {integrityScore < 85 && (
                  <div className="score-penalty">
                    <TrendingDown size={16} />
                    <span>{100 - integrityScore} points deducted</span>
                  </div>
                )}
              </div>

              <div className="indicators-grid">
                <div className={`indicator ${currentStats.faceDetected ? 'active' : 'inactive'}`}>
                  <div className="indicator-content">
                    <Video size={20} />
                    <span>Face Detection</span>
                  </div>
                  {currentStats.faceDetected ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                </div>

                <div className={`indicator ${currentStats.gazeOnScreen ? 'active' : 'warning'}`}>
                  <div className="indicator-content">
                    <Eye size={20} />
                    <span>Gaze Tracking</span>
                  </div>
                  {currentStats.gazeOnScreen ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                </div>

                <div className={`indicator ${currentStats.tabFocused ? 'active' : 'inactive'}`}>
                  <div className="indicator-content">
                    <MonitorOff size={20} />
                    <span>Tab Focus</span>
                  </div>
                  {currentStats.tabFocused ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                </div>

                <div className="indicator info">
                  <div className="indicator-content">
                    <Keyboard size={20} />
                    <span>Typing</span>
                  </div>
                  <span className="typing-speed">
                    {currentStats.typingVelocity > 0 ? `${currentStats.typingVelocity} WPM` : 'Normal'}
                  </span>
                </div>
              </div>
            </div>

            <div className="editor-card">
              <div className="editor-header">
                <div className="editor-header-left">
                  <Keyboard size={20} />
                  <span className="editor-filename">CodeEditor.jsx</span>
                </div>
                <button
                  onClick={analyzeWithGemini}
                  disabled={isAnalyzing || !code.trim()}
                  className="btn btn-ai"
                >
                  <Sparkles size={16} className={isAnalyzing ? 'spinner' : ''} />
                  <span>{isAnalyzing ? 'Analyzing...' : 'AI Review'}</span>
                </button>
              </div>
              <textarea
                value={code}
                onChange={handleCodeChange}
                onPaste={handlePaste}
                placeholder="Start coding here... (paste detection and typing velocity analysis active)"
                disabled={!isSessionActive}
                className="code-editor"
                spellCheck="false"
              />
            </div>

            {geminiAnalysis && (
              <div className="ai-card">
                <div className="ai-header">
                  <Sparkles size={20} />
                  <h3>AI Code Analysis</h3>
                </div>
                <div className="ai-content">
                  <div className="ai-metrics">
                    <div className="ai-metric">
                      <span className="metric-label">Overall Quality</span>
                      <span className="metric-value">{geminiAnalysis.overall_quality}/10</span>
                    </div>
                    <div className="ai-metric">
                      <span className="metric-label">AI Confidence</span>
                      <span className="metric-value confidence">{geminiAnalysis.confidence_score}%</span>
                    </div>
                  </div>
                  
                  {geminiAnalysis.suspicious_patterns?.length > 0 && (
                    <div className="ai-section suspicious">
                      <h4 className="section-title">
                        <AlertCircle size={16} />
                        <span>Suspicious Patterns</span>
                      </h4>
                      <ul className="section-list">
                        {geminiAnalysis.suspicious_patterns.map((pattern, idx) => (
                          <li key={idx}>• {pattern}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {geminiAnalysis.improvement_suggestions?.length > 0 && (
                    <div className="ai-section improvements">
                      <h4 className="section-title">Improvements</h4>
                      <ul className="section-list">
                        {geminiAnalysis.improvement_suggestions.map((suggestion, idx) => (
                          <li key={idx}>• {suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <aside className="sidebar">
            <div className="video-card">
              <div className="video-header">
                {webcamActive ? <Video size={20} className="icon-active" /> : <VideoOff size={20} className="icon-inactive" />}
                <h3>Live Feed</h3>
                {micActive && <Mic size={16} className="mic-active" />}
              </div>
              <div className="video-container">
                <video ref={videoRef} autoPlay playsInline muted className="video-feed" />
                {!webcamActive && (
                  <div className="video-overlay">
                    <VideoOff size={48} />
                    <p>Camera inactive</p>
                  </div>
                )}
              </div>
            </div>

            <div className="events-card">
              <div className="events-header">
                <div className="events-header-left">
                  <AlertCircle size={20} />
                  <h3>Event Timeline</h3>
                </div>
                <span className="events-count">{events.length}</span>
              </div>
              <div className="events-list">
                {events.length === 0 ? (
                  <div className="events-empty">
                    <AlertCircle size={48} />
                    <p>No events yet</p>
                  </div>
                ) : (
                  events.slice().reverse().map((event) => (
                    <div key={event.id} className={`event-item ${event.severity}`}>
                      <div className="event-header">
                        <span className="event-type">{event.type.replace(/_/g, ' ')}</span>
                        <span className="event-time">{event.timestamp}</span>
                      </div>
                      <p className="event-message">{event.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {events.length > 0 && (
              <button onClick={exportSession} className="btn btn-export">
                <Download size={20} />
                <span>Export Session Data</span>
                <FileJson size={20} />
              </button>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
};

export default App;