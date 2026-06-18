import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';

// Dynamic Themes Configuration List
const ENHANCED_THEMES = {
  default: {
    name: "Standard Speaker",
    avatar: "🎙️",
    accentBg: "#3b82f6",
    popupBg: "#ffffff",
    textColor: "#1e293b",
    dialogue: "Reading your document clearly..."
  },
  cricket: {
    name: "cricket Avatar",
    avatar: "🏏🦁",
    accentBg: "#facc15",
    popupBg: "#fef08a",
    textColor: "#1e3a8a",
    dialogue: "Defending the text and hitting it out of the park! Listening, buddy?"
  },
  space: {
    name: "Alien Astronaut",
    avatar: "👽🚀",
    accentBg: "#a855f7",
    popupBg: "#2e1065",
    textColor: "#f3e8ff",
    dialogue: "Receiving deep space transmission from your document..."
  },
  horror: {
    name: "Haunted Ghost",
    avatar: "👻🧛",
    accentBg: "#ef4444",
    popupBg: "#1a0505",
    textColor: "#fca5a5",
    dialogue: "Reading the ancient files aloud... if you dare to listen..."
  },
  retro: {
    name: "90s Cartoon Bot",
    avatar: "🤖📺",
    accentBg: "#14b8a6",
    popupBg: "#ccfbf1",
    textColor: "#115e59",
    dialogue: "Bleep-bloop! Booting classic narrative machine processing v1.0..."
  }
};

function App() {
  // Application basic states
  const [extractedText, setExtractedText] = useState("");
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  // Theme and modal management states
  const [selectedThemeKey, setSelectedThemeKey] = useState("default");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [animatedText, setAnimatedText] = useState("");

  // NEW STATES: For Story Language Selection and Translation tracking
  const [storyLanguage, setStoryLanguage] = useState("en"); // "en" for English, "ta" for Tamil
  const [isTranslating, setIsTranslating] = useState(false);

  // Load available browser voices on mount
  useEffect(() => {
    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      setVoices(allVoices);
      
      // Auto-select first available English voice as default setup
      const defaultEng = allVoices.find(voice => voice.lang.includes('en'));
      if (defaultEng) setSelectedVoice(defaultEng.name);
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Filter voices dynamically based on selected story language mode
  const filteredVoices = voices.filter(voice => {
    if (storyLanguage === "ta") {
      return voice.lang.includes("ta") || voice.lang.includes("IN"); // Fallback check for Indian accents if explicit Tamil missing
    }
    return voice.lang.includes("en");
  });

  // Handle Word document processing and text extraction
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

  // Helper method to execute translation via free MyMemory API structure
  const translateTextToTamil = async (text) => {
    try {
      setIsTranslating(true);
      // Using public free API to translate english text to tamil language
      const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ta`);
      const data = await response.json();
      setIsTranslating(false);
      return data.responseData.translatedText || text;
    } catch (error) {
      console.error("Translation API failure:", error);
      setIsTranslating(false);
      alert("Translation failed. Using original text instead.");
      return text;
    }
  };
// Main execution script for Text-to-Speech narration engine
  const speakStory = async () => {
    if (!extractedText) return alert("Please upload a Word file first!");

    // PREMIUM CHECK: If text exceeds 500 characters, show premium subscription prompt
    if (extractedText.length > 500) {
      alert(
        "🚀 Premium Limit Reached!\n\n" +
        "You are trying to read/translate " + extractedText.length + " characters. " +
        "Free tier limits translation and narration to 500 characters.\n\n" +
        "Upgrade to Premium Subscription to unlock unlimited text generation, standard voices, and fast processing!"
      );
      return; // Stops execution immediately
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsModalOpen(false);
      setAnimatedText("");
      return;
    }

    let textToNarrate = extractedText;

    // Check if user explicitly requested Tamil narration mode
    if (storyLanguage === "ta") {
      textToNarrate = await translateTextToTamil(extractedText);
    }

    const utterance = new SpeechSynthesisUtterance(textToNarrate);
    
    // Explicitly enforce language constraint on speech synthesis instance
    utterance.lang = storyLanguage === "ta" ? "ta-IN" : "en-US";

    const activeVoice = voices.find(v => v.name === selectedVoice);
    if (activeVoice) {
      utterance.voice = activeVoice;
    } else if (storyLanguage === "ta") {
      // Automatic fallback selection if user hasn't explicitly chosen a local Tamil voice
      const tamilVoice = voices.find(v => v.lang.includes("ta"));
      if (tamilVoice) utterance.voice = tamilVoice;
    }

    // Capture boundaries during narration to synchronize moving text display
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const currentWordIndex = event.charIndex;
        const remainingText = textToNarrate.substring(0, currentWordIndex + event.charLength);
        setAnimatedText(remainingText);
      }
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsModalOpen(false);
      setAnimatedText("");
    };
    
    setIsModalOpen(true);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Setup browser configurations for Speech to Text tracking loop
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

  const downloadAsWord = () => {
    if (!spokenText || spokenText.startsWith("Listening...")) return alert("There is no text available to download!");
    const element = document.createElement("a");
    const file = new Blob([spokenText], { type: 'application/msword' });
    element.href = URL.createObjectURL(file);
    element.download = "my_spoken_work.doc";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadAsPDF = () => {
    if (!spokenText || spokenText.startsWith("Listening...")) return alert("There is no text available to download!");
    const doc = new jsPDF();
    const splitText = doc.splitTextToSize(spokenText, 180);
    doc.text(splitText, 10, 10);
    doc.save("my_spoken_work.pdf");
  };

  const currentTheme = ENHANCED_THEMES[selectedThemeKey];

  // Dynamic layout styling engine based on runtime properties
  const themeStyles = {
    container: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', minHeight: '100vh', backgroundColor: darkMode ? '#0f172a' : '#f8fafc', color: darkMode ? '#f1f5f9' : '#1e293b', transition: 'background-color 0.3s ease, color 0.3s ease' },
    navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', backgroundColor: darkMode ? '#1e293b' : '#ffffff', borderBottom: darkMode ? '1px solid #334155' : '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: '12px' },
    navTitle: { fontSize: '1.25rem', fontWeight: '700', color: darkMode ? '#38bdf8' : '#3b82f6', margin: 0 },
    navRightBox: { display: 'flex', alignItems: 'center', gap: '16px' },
    profileBadge: { fontWeight: '600', fontSize: '0.9rem', color: darkMode ? '#cbd5e1' : '#475569', backgroundColor: darkMode ? '#334155' : '#f1f5f9', padding: '6px 12px', borderRadius: '20px' },
    themeBtn: { cursor: 'pointer', border: 'none', background: 'none', fontSize: '1.25rem', padding: '4px 8px' },
    mainLayout: { maxWidth: '800px', margin: '0 auto', padding: '24px 16px', boxSizing: 'border-box' },
    heroSection: { textAlign: 'center', marginBottom: '32px' },
    heroSubtitle: { color: darkMode ? '#94a3b8' : '#64748b', margin: '4px 0 0 0', fontSize: '0.95rem' },
    card: { backgroundColor: darkMode ? '#1e293b' : '#ffffff', margin: '20px 0', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0' },
    cardTitle: { fontSize: '1.2rem', fontWeight: '600', margin: '0 0 16px 0', color: darkMode ? '#f8fafc' : '#334155' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' },
    label: { fontSize: '0.85rem', fontWeight: '500', color: darkMode ? '#94a3b8' : '#475569' },
    select: { padding: '10px 14px', borderRadius: '8px', border: darkMode ? '1px solid #475569' : '1px solid #cbd5e1', backgroundColor: darkMode ? '#1e293b' : '#ffffff', fontSize: '0.95rem', color: darkMode ? '#f1f5f9' : '#334155', outline: 'none', width: '100%' },
    fileInput: { padding: '12px', borderRadius: '8px', border: darkMode ? '1px dashed #475569' : '1px dashed #cbd5e1', backgroundColor: darkMode ? '#0f172a' : '#f8fafc', color: darkMode ? '#94a3b8' : '#475569', cursor: 'pointer', width: '100%', boxSizing: 'border-box' },
    btnPrimary: { padding: '12px 20px', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '500', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center', maxWidth: '240px' },
    btnSecondary: { padding: '12px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '500', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center', maxWidth: '240px' },
    outputBox: { marginTop: '20px', backgroundColor: darkMode ? '#0f172a' : '#f1f5f9', padding: '16px', borderRadius: '8px', border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0', maxHeight: '160px', overflowY: 'auto' },
    outputText: { margin: '6px 0 0 0', fontSize: '0.95rem', color: darkMode ? '#cbd5e1' : '#334155', lineHeight: '1.5' },
    actionPanel: { marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' },
    btnWord: { padding: '10px 16px', backgroundColor: '#1e3a8a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer', flexGrow: 1, textAlign: 'center' },
    btnPdf: { padding: '10px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer', flexGrow: 1, textAlign: 'center' },
    
    // Layout configurations for character modal stage
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
    modalContent: { width: '100%', maxWidth: '500px', borderRadius: '16px', padding: '24px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)', border: `3px solid ${currentTheme.accentBg}` },
    avatarStage: { fontSize: '5rem', margin: '0 0 16px 0', animation: isSpeaking ? 'bounce 0.8s infinite alternate' : 'none' },
    dialogueBubble: { backgroundColor: 'rgba(0,0,0,0.04)', padding: '12px', borderRadius: '12px', fontStyle: 'italic', marginBottom: '20px', fontSize: '0.9rem', borderLeft: `4px solid ${currentTheme.accentBg}` },
    speechDisplay: { padding: '16px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.15)', minHeight: '100px', maxHeight: '180px', overflowY: 'auto', textAlign: 'left', fontSize: '1.05rem', lineHeight: '1.6', fontWeight: '500' }
  };

  return (
    <div style={themeStyles.container}>
      <style>{`@keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-12px); } }`}</style>

      {/* NAVBAR */}
      <nav style={themeStyles.navbar}>
        <h2 style={themeStyles.navTitle}>🎙️ Studio Suite Pro</h2>
        <div style={themeStyles.navRightBox}>
          <span style={themeStyles.profileBadge}>👤 Senthil Kumar</span>
          <button style={themeStyles.themeBtn} onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <main style={themeStyles.mainLayout}>
        <header style={themeStyles.heroSection}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', margin: 0 }}>StoryTeller & Voice Converter</h1>
          <p style={themeStyles.heroSubtitle}>Convert voice to documentation or read documents dynamically</p>
        </header>

       {/* SECTION 1: Document Reader with Translation Switch */}
<div style={themeStyles.card}>
  <h3 style={themeStyles.cardTitle}>Option 1: Document Reader (TTS)</h3>
  
  <div style={themeStyles.inputGroup}>
    <label style={themeStyles.label}>Upload Story Document (.docx)</label>
    <input type="file" accept=".docx" onChange={handleFileUpload} style={themeStyles.fileInput} />
  </div>

  {/* 🗣️ CHOOSE STORY OUTPUT LANGUAGE - CARDS STYLE */}
  <div style={{ ...themeStyles.inputGroup, marginBottom: '24px' }}>
    <label style={themeStyles.label}>🗣️ Choose Story Output Language</label>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
      
      {/* English Card */}
      <div 
        onClick={() => {
          setStoryLanguage("en");
          setSelectedVoice("");
        }}
        style={{
          padding: '16px',
          borderRadius: '10px',
          cursor: 'pointer',
          textAlign: 'center',
          border: storyLanguage === 'en' ? `2px solid ${currentTheme.accentBg}` : (darkMode ? '1px solid #475569' : '1px solid #cbd5e1'),
          backgroundColor: storyLanguage === 'en' ? (darkMode ? '#1e293b' : '#eff6ff') : (darkMode ? '#0f172a' : '#ffffff'),
          transition: 'all 0.2s ease',
          transform: storyLanguage === 'en' ? 'scale(1.02)' : 'scale(1)'
        }}
      >
        <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🇺🇸</div>
        <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>English</div>
        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Original Text</div>
      </div>

      {/* Tamil Card */}
      <div 
        onClick={() => {
          setStoryLanguage("ta");
          setSelectedVoice("");
        }}
        style={{
          padding: '16px',
          borderRadius: '10px',
          cursor: 'pointer',
          textAlign: 'center',
          border: storyLanguage === 'ta' ? `2px solid ${currentTheme.accentBg}` : (darkMode ? '1px solid #475569' : '1px solid #cbd5e1'),
          backgroundColor: storyLanguage === 'ta' ? (darkMode ? '#1e293b' : '#eff6ff') : (darkMode ? '#0f172a' : '#ffffff'),
          transition: 'all 0.2s ease',
          transform: storyLanguage === 'ta' ? 'scale(1.02)' : 'scale(1)'
        }}
      >
        <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🇮🇳</div>
        <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>தமிழ் (Tamil)</div>
        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Translate & Read</div>
      </div>

    </div>
  </div>

  {/* ✨ SELECT NARRATOR THEME - CARDS STYLE */}
  <div style={{ ...themeStyles.inputGroup, marginBottom: '24px' }}>
    <label style={themeStyles.label}>✨ Select Narrator Theme</label>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginTop: '4px' }}>
      
      {Object.keys(ENHANCED_THEMES).map((key) => {
        const theme = ENHANCED_THEMES[key];
        const isSelected = selectedThemeKey === key;
        return (
          <div
            key={key}
            onClick={() => setSelectedThemeKey(key)}
            style={{
              padding: '12px 8px',
              borderRadius: '10px',
              cursor: 'pointer',
              textAlign: 'center',
              border: isSelected ? `2px solid ${theme.accentBg}` : (darkMode ? '1px solid #475569' : '1px solid #e2e8f0'),
              backgroundColor: isSelected ? theme.popupBg : (darkMode ? '#0f172a' : '#f8fafc'),
              color: isSelected ? theme.textColor : (darkMode ? '#f1f5f9' : '#1e293b'),
              transition: 'all 0.2s ease',
              transform: isSelected ? 'scale(1.03)' : 'scale(1)',
              boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <div style={{ fontSize: '1.8rem', marginBottom: '4px' }}>{theme.avatar}</div>
            <div style={{ fontWeight: '600', fontSize: '0.85rem', lineHeight: '1.2' }}>{theme.name}</div>
          </div>
        );
      })}

    </div>
  </div>
  
  <div style={themeStyles.inputGroup}>
    <label style={themeStyles.label}>Select Voice Accent</label>
    <select value={selectedVoice || ''} onChange={(e) => setSelectedVoice(e.target.value)} style={themeStyles.select}>
      <option value="">-- Select Voice --</option>
      {filteredVoices.map((voice, index) => (
        <option key={index} value={voice.name}>
          {voice.name} ({voice.lang})
        </option>
      ))}
    </select>
  </div>

  {/* Playback Button */}
  <button 
    onClick={speakStory} 
    disabled={isTranslating}
    style={{
      ...themeStyles.btnPrimary, 
      backgroundColor: isSpeaking ? '#ef4444' : currentTheme.accentBg,
      color: selectedThemeKey === 'cricket' ? '#1e3a8a' : 'white',
      opacity: isTranslating ? 0.6 : 1,
      marginTop: '12px'
    }}
  >
    {isTranslating ? "🔄 Translating..." : isSpeaking ? "⏹ Stop Playback" : "▶ Read Story Aloud"}
  </button>

  {extractedText && (
    <div style={themeStyles.outputBox}>
      <strong style={{fontSize: '0.8rem', color: '#3b82f6', textTransform: 'uppercase'}}>Full Document Data:</strong> 
      <p style={themeStyles.outputText}>{extractedText}</p>
    </div>
  )}
</div>

        {/* SECTION 2: Voice Dictation */}
        <div style={{...themeStyles.card, borderLeft: '4px solid #10b981'}}>
          <h3 style={themeStyles.cardTitle}>Option 2: Voice Dictation (STT)</h3>
          
          <button onClick={startListening} style={themeStyles.btnSecondary}>
            🎙️ Start Recording
          </button>
          
          <div style={{...themeStyles.outputBox, backgroundColor: darkMode ? '#0f172a' : '#ffffff', border: '1px dashed #10b981', minHeight: '80px'}}>
            <strong style={{fontSize: '0.8rem', color: '#10b981', textTransform: 'uppercase'}}>Live Transcription:</strong>
            <p style={{...themeStyles.outputText, color: spokenText.startsWith("Listening") ? '#64748b' : (darkMode ? '#f1f5f9' : '#0f172a')}}>
              {spokenText || "Click the mic button and start speaking..."}
            </p>
          </div>

          {spokenText && !spokenText.startsWith("Listening...") && (
            <div style={themeStyles.actionPanel}>
              <button onClick={downloadAsWord} style={themeStyles.btnWord}>📄 Export as Word</button>
              <button onClick={downloadAsPDF} style={themeStyles.btnPdf}>📕 Export as PDF</button>
            </div>
          )}
        </div>
      </main>

      {/* DYNAMIC POPUP MODAL STAGE FOR THEME CARTOON CHARACTER */}
      {isModalOpen && (
        <div style={themeStyles.modalOverlay}>
          <div style={{ ...themeStyles.modalContent, backgroundColor: currentTheme.popupBg, color: currentTheme.textColor }}>
            <h2 style={{margin: '0 0 10px 0', fontSize: '1.4rem'}}>{currentTheme.name}</h2>
            
            <div style={themeStyles.avatarStage}>
              {currentTheme.avatar}
            </div>

            <div style={themeStyles.dialogueBubble}>
              "{currentTheme.dialogue}"
            </div>

            <div style={themeStyles.speechDisplay}>
              <span style={{color: currentTheme.accentBg, fontWeight: '700'}}>Reading Box ({storyLanguage === 'ta' ? 'Tamil' : 'English'}): </span>
              {animatedText || "Preparing script..."}
            </div>

            <button 
              onClick={speakStory}
              style={{ marginTop: '20px', padding: '10px 20px', border: 'none', borderRadius: '8px', backgroundColor: '#ef4444', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Dismiss & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;