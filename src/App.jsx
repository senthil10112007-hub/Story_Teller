import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';

function App() {
  // States
  const [extractedText, setExtractedText] = useState("");
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [darkMode, setDarkMode] = useState(false); // Dark Mode toggle state

  // Load available browser voices
  useEffect(() => {
    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      const englishVoices = allVoices.filter(voice => voice.lang.includes('en'));
      setVoices(englishVoices);
      if (englishVoices.length > 0) setSelectedVoice(englishVoices[0].name);
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // 1. Word File Upload & Text Extract
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target.result;
      try {
        const result = await mammoth.extractRawText({ arrayBuffer });
        setExtractedText(result.value);
      } catch (error) {
        alert("Unable to read the Word file. Please check the file format.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 2. Story Telling (Text to Speech)
  const speakStory = () => {
    if (!extractedText) return alert("Please upload a Word file first!");

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(extractedText);
    const activeVoice = voices.find(v => v.name === selectedVoice);
    if (activeVoice) utterance.voice = activeVoice;

    utterance.onend = () => setIsSpeaking(false);
    
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // 3. Speech to Text (Voice to Word)
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return alert("Your browser does not support speech recognition. Please use Google Chrome.");
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setSpokenText("Listening... Please speak your name or description in English...");
    };

    recognition.onresult = (event) => {
      const resultText = event.results[0][0].transcript;
      setSpokenText(resultText);
    };

    recognition.onerror = () => {
      setSpokenText("Speech not recognized. Please try again.");
    };

    recognition.start();
  };

  // 🚀 Download as Word (.doc)
  const downloadAsWord = () => {
    if (!spokenText || spokenText.startsWith("Listening...")) {
      return alert("There is no text available to download!");
    }
    const element = document.createElement("a");
    const file = new Blob([spokenText], { type: 'application/msword' });
    element.href = URL.createObjectURL(file);
    element.download = "my_spoken_work.doc";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // 🚀 Download as PDF
  const downloadAsPDF = () => {
    if (!spokenText || spokenText.startsWith("Listening...")) {
      return alert("There is no text available to download!");
    }
    const doc = new jsPDF();
    const splitText = doc.splitTextToSize(spokenText, 180);
    doc.text(splitText, 10, 10);
    doc.save("my_spoken_work.pdf");
  };

  // Dynamic Styles Object based on Dark/Light mode
  const themeStyles = {
    container: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      minHeight: '100vh',
      backgroundColor: darkMode ? '#0f172a' : '#f8fafc',
      color: darkMode ? '#f1f5f9' : '#1e293b',
      transition: 'background-color 0.3s ease, color 0.3s ease',
    },
    navbar: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 24px',
      backgroundColor: darkMode ? '#1e293b' : '#ffffff',
      borderBottom: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      flexWrap: 'wrap',
      gap: '12px'
    },
    navTitle: {
      fontSize: '1.25rem',
      fontWeight: '700',
      color: darkMode ? '#38bdf8' : '#3b82f6',
      margin: 0,
    },
    navRightBox: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    },
    profileBadge: {
      fontWeight: '600',
      fontSize: '0.9rem',
      color: darkMode ? '#cbd5e1' : '#475569',
      backgroundColor: darkMode ? '#334155' : '#f1f5f9',
      padding: '6px 12px',
      borderRadius: '20px',
    },
    themeBtn: {
      cursor: 'pointer',
      border: 'none',
      background: 'none',
      fontSize: '1.25rem',
      padding: '4px 8px',
    },
    mainLayout: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: '24px 16px',
      boxSizing: 'border-box',
    },
    heroSection: {
      textAlign: 'center',
      marginBottom: '32px',
    },
    heroSubtitle: {
      color: darkMode ? '#94a3b8' : '#64748b',
      margin: '4px 0 0 0',
      fontSize: '0.95rem',
    },
    card: {
      backgroundColor: darkMode ? '#1e293b' : '#ffffff',
      margin: '20px 0',
      padding: '24px',
      borderRadius: '12px',
      boxShadow: darkMode ? '0 4px 6px -1px rgba(0,0,0,0.2)' : '0 4px 6px -1px rgba(0,0,0,0.05)',
      border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
    },
    cardTitle: {
      fontSize: '1.2rem',
      fontWeight: '600',
      margin: '0 0 16px 0',
      color: darkMode ? '#f8fafc' : '#334155',
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      marginBottom: '16px',
    },
    label: {
      fontSize: '0.85rem',
      fontWeight: '500',
      color: darkMode ? '#94a3b8' : '#475569',
    },
    select: {
      padding: '10px 14px',
      borderRadius: '8px',
      border: darkMode ? '1px solid #475569' : '1px solid #cbd5e1',
      backgroundColor: darkMode ? '#1e293b' : '#ffffff',
      fontSize: '0.95rem',
      color: darkMode ? '#f1f5f9' : '#334155',
      outline: 'none',
      width: '100%',
    },
    fileInput: {
      padding: '12px',
      borderRadius: '8px',
      border: darkMode ? '1px dashed #475569' : '1px dashed #cbd5e1',
      backgroundColor: darkMode ? '#0f172a' : '#f8fafc',
      color: darkMode ? '#94a3b8' : '#475569',
      cursor: 'pointer',
      width: '100%',
      boxSizing: 'border-box',
    },
    btnPrimary: {
      padding: '12px 20px',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      width: '100%', // Mobile optimized width
      justifyContent: 'center',
      maxWidth: '240px',
    },
    btnSecondary: {
      padding: '12px 20px',
      backgroundColor: '#10b981',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      width: '100%',
      justifyContent: 'center',
      maxWidth: '240px',
    },
    outputBox: {
      marginTop: '20px',
      backgroundColor: darkMode ? '#0f172a' : '#f1f5f9',
      padding: '16px',
      borderRadius: '8px',
      border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
      maxHeight: '160px',
      overflowY: 'auto',
    },
    outputText: {
      margin: '6px 0 0 0',
      fontSize: '0.95rem',
      color: darkMode ? '#cbd5e1' : '#334155',
      lineHeight: '1.5',
    },
    actionPanel: {
      marginTop: '20px',
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
    },
    btnWord: {
      padding: '10px 16px',
      backgroundColor: '#1e3a8a',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '0.9rem',
      fontWeight: '500',
      cursor: 'pointer',
      flexGrow: 1, // Responsive layout sizing
      textAlign: 'center',
    },
    btnPdf: {
      padding: '10px 16px',
      backgroundColor: '#ef4444',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '0.9rem',
      fontWeight: '500',
      cursor: 'pointer',
      flexGrow: 1,
      textAlign: 'center',
    }
  };

  return (
    <div style={themeStyles.container}>
      {/* GLOBAL NAVBAR HEADER */}
      <nav style={themeStyles.navbar}>
        <h2 style={themeStyles.navTitle}>🎙 Studio Suite</h2>
        <div style={themeStyles.navRightBox}>
          <span style={themeStyles.profileBadge}>👤 Senthil Kumar</span>
          <button 
            style={themeStyles.themeBtn} 
            onClick={() => setDarkMode(!darkMode)}
            title="Toggle Light/Dark Theme"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>

      {/* MAIN CONTAINER RESPONSIVE WRAPPER */}
      <main style={themeStyles.mainLayout}>
        <header style={themeStyles.heroSection}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', margin: 0 }}>StoryTeller & Voice Converter</h1>
          <p style={themeStyles.heroSubtitle}>Convert voice to documentation or read documents dynamically</p>
        </header>

        {/* SECTION 1: Document Reader */}
        <div style={themeStyles.card}>
          <h3 style={themeStyles.cardTitle}>Option 1: Document Reader (TTS)</h3>
          
          <div style={themeStyles.inputGroup}>
            <label style={themeStyles.label}>Upload Story Document (.docx)</label>
            <input type="file" accept=".docx" onChange={handleFileUpload} style={themeStyles.fileInput} />
          </div>
          
          <div style={themeStyles.inputGroup}>
            <label style={themeStyles.label}>Select Voice Accent</label>
            <select value={selectedVoice || ''} onChange={(e) => setSelectedVoice(e.target.value)} style={themeStyles.select}>
              {voices.map((voice, index) => (
                <option key={index} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>

          <button 
            onClick={speakStory} 
            style={{...themeStyles.btnPrimary, backgroundColor: isSpeaking ? '#64748b' : '#3b82f6'}}
          >
            {isSpeaking ? "⏹ Stop Playback" : "▶ Read Story Aloud"}
          </button>

          {extractedText && (
            <div style={themeStyles.outputBox}>
              <strong style={{fontSize: '0.8rem', color: '#3b82f6', textTransform: 'uppercase'}}>Extracted Text:</strong> 
              <p style={themeStyles.outputText}>{extractedText}</p>
            </div>
          )}
        </div>

        {/* SECTION 2: Voice Dictation */}
        <div style={{...themeStyles.card, borderLeft: '4px solid #10b981'}}>
          <h3 style={themeStyles.cardTitle}>Option 2: Voice Dictation (STT)</h3>
          
          <button onClick={startListening} style={themeStyles.btnSecondary}>
            🎙 Start Recording
          </button>
          
          <div style={{...themeStyles.outputBox, backgroundColor: darkMode ? '#0f172a' : '#ffffff', border: '1px dashed #10b981', minHeight: '80px'}}>
            <strong style={{fontSize: '0.8rem', color: '#10b981', textTransform: 'uppercase'}}>Live Transcription:</strong>
            <p style={{...themeStyles.outputText, color: spokenText.startsWith("Listening") ? '#64748b' : (darkMode ? '#f1f5f9' : '#0f172a')}}>
              {spokenText || "Click the mic button and start speaking..."}
            </p>
          </div>

          {/* Download Buttons Panel */}
          {spokenText && !spokenText.startsWith("Listening...") && (
            <div style={themeStyles.actionPanel}>
              <button onClick={downloadAsWord} style={themeStyles.btnWord}>
                📄 Export as Word
              </button>
              <button onClick={downloadAsPDF} style={themeStyles.btnPdf}>
                📕 Export as PDF
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;