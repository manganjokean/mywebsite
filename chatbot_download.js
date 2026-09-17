// Full chatbot.js source
/**
 * CyberBot // Sentinel-AI - Pure Conversational AI Chatbot
 * Powered by live Generative AI:
 * - Answers ANY question (science, tech, coding, math, history, jokes, general knowledge, etc.)
 * - Grounded in John Manganelli's cybersecurity portfolio & PhishShield Academy proposal
 * - Multi-turn conversational memory
 * - Markdown & code syntax rendering
 * - Offline heuristic fallback
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. SITE & PORTFOLIO KNOWLEDGE BASE
  // =========================================================================

  const SITE_DATA = {
    owner: "John Manganelli",
    standing: "Senior",
    major: "Information Technology",
    course: "IT Computer Security",
    instructor: "Prof. Xiwang Guo",
    assignment: "Assignment 1: Cybersecurity Problem & Website Proposal",
    hobbies: "Playing guitar and fighting games",
    homelabFact: "Built a dedicated multi-node physical home lab server using enterprise hardware to configure isolated virtual subnets, test custom firewalls, and simulate defensive security environments.",
    skills: ["Linux terminal (Ubuntu, Kali)", "Python & Bash scripting", "Wireshark packet capture", "Nmap port scanning", "HTML/CSS web development", "VirtualBox & Proxmox hypervisors"],
    careerGoals: "Security Operations Center (SOC) Analyst or Incident Response Specialist defending organizations from data breaches and intrusion.",
    privacyPolicy: "Intentionally withholds sensitive Personally Identifiable Information (PII) like home address, phone number, passwords, student ID, SSN, and financial details to prevent spear-phishing, credential harvesting, and identity theft.",
    proposal: {
      name: "PhishShield Academy",
      problem: "Phishing and credential theft cause over 80% of enterprise and university security breaches. Traditional training relies on passive slides/videos that fail to develop practical detection intuition.",
      concept: "An interactive educational web sandbox that provides hands-on dissection of simulated phishing emails, fake login portals, and malicious URLs.",
      targetUsers: "University students (often targeted by fake financial aid & campus job scams), faculty/staff handling sensitive administrative data, and IT/security learners.",
      deliverables: {
        d1: "Website Concept: PhishShield Academy interactive training sandbox for email and URL dissection.",
        d2: "Target Users: Students, university faculty & staff, and cybersecurity trainees.",
        d3: "Functional Requirements: Interactive email inspection sandbox, URL decoder for spoofed lookalike domains, scenario-based quizzes, and an MFA defense demonstration.",
        d4: "Security Requirements: Zero credential retention (no real passwords ever logged), strict input sanitization against XSS, TLS 1.3 encryption, and client-side simulation isolation.",
        d5: "Potential Threats & Mitigations: XSS (mitigated by strict HTML encoding), simulation confusion (mitigated by prominent educational watermarks), and DoS (mitigated by client-side execution & rate limiting).",
        d6: "Research Question: 'Does interactive web simulation improve a student's ability to identify spear-phishing attacks significantly better than passive training videos?'",
        d7: "Project Objectives: Build an accessible UI, deploy 3 realistic attack scenarios, measure detection rate improvement, and enforce zero-data-retention security."
      }
    }
  };

  const SYSTEM_PROMPT = `You are CyberBot (Sentinel-AI), a friendly, highly capable AI assistant on John Manganelli's website for his IT Computer Security course (taught by Prof. Xiwang Guo).

YOUR INSTRUCTIONS:
1. You are a REAL, conversational AI chatbot. You can talk freely and answer ANY question the user asks on ANY topic—including coding, math, general science, trivia, history, pop culture, advice, jokes, creative writing, or casual conversation.
2. You also know everything about John Manganelli and his academic project:
   - John Manganelli is a Senior majoring in Information Technology.
   - Course: IT Computer Security with Prof. Xiwang Guo.
   - Enterprise Homelab Server: Built a dedicated physical multi-node server to test isolated subnets, custom firewalls, and defense environments.
   - Skills: Linux (Kali, Ubuntu), Wireshark, Nmap, Python defensive scripting & log parsing, HTML/CSS.
   - Career goal: SOC Analyst or Incident Response Specialist.
   - Hobbies: Guitar and fighting games.
   - Website Proposal: "PhishShield Academy" — interactive training sandbox for dissecting phishing emails & URLs.
   - Privacy Policy: Intentionally omits PII (address, phone, SSN, passwords) to demonstrate good security hygiene.
3. If the user asks you to quiz them or test them on cybersecurity, create a fun multiple-choice question directly in your text response and wait for their answer!

FORMATTING:
- Use clean Markdown (**bold**, *italic*, bullet points, `inline code`, and ```code blocks```).
- Keep your tone sharp, helpful, and friendly.`;

  // =========================================================================
  // 2. CHATBOT STATE & MULTI-TURN HISTORY
  // =========================================================================

  let chatOpen = false;
  let isExpanded = false;
  let isAudioMuted = true;
  // Voice chat state
  let isVoiceOutputEnabled = false;
  let isRecognitionActive = false;
  let recognition = null;

  // Multi-turn conversation memory
  const conversationHistory = [];

  // Local storage keys
  const STORAGE_KEY_API_KEY = "jm_cyberbot_gemini_key";

  // Initialize Speech Recognition if supported
  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported in this browser.');
      return;
    }
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      console.log('Voice input:', transcript);
      const input = document.getElementById('chat-input');
      if (input) {
        input.value = transcript;
        handleSend();
      }
    };
    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      alert('Voice input error: ' + event.error);
    };
    recognition.onend = () => {
      isRecognitionActive = false;
      updateMicButton(false);
    };
  }

  function startVoiceRecognition() {
    if (!recognition) initSpeechRecognition();
    if (recognition && !isRecognitionActive) {
      isRecognitionActive = true;
      updateMicButton(true);
      recognition.start();
    }
  }

  function stopVoiceRecognition() {
    if (recognition && isRecognitionActive) {
      recognition.stop();
    }
  }

  function toggleVoiceRecognition() {
    if (isRecognitionActive) {
      stopVoiceRecognition();
    } else {
      startVoiceRecognition();
    }
  }

  function updateMicButton(active) {
    const micBtn = document.getElementById('chat-mic-btn');
    if (micBtn) {
      if (active) {
        micBtn.classList.add('listening');
      } else {
        micBtn.classList.remove('listening');
      }
    }
  }

  // Toggle voice output (speech synthesis)
  function toggleVoiceOutput() {
    isVoiceOutputEnabled = !isVoiceOutputEnabled;
    const outBtn = document.getElementById('chat-voice-output-btn');
    if (outBtn) {
      outBtn.textContent = isVoiceOutputEnabled ? '🔊' : '🔈';
    }
  }

  // Simple intent parser for page control commands
  function parseVoiceCommand(command) {
    const lower = command.toLowerCase();
    const scrollMatch = lower.match(/^scroll to (.+)$/);
    if (scrollMatch) {
      const target = scrollMatch[1].trim();
      let el = document.getElementById(target);
      if (!el) el = document.querySelector('.' + target);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return true;
      }
    }
    const showMatch = lower.match(/^show (.+)$/);
    if (showMatch) {
      const selector = showMatch[1].trim();
      const el = document.getElementById(selector) || document.querySelector('.' + selector);
      if (el) {
        el.style.display = '';
        return true;
      }
    }
    const hideMatch = lower.match(/^hide (.+)$/);
    if (hideMatch) {
      const selector = hideMatch[1].trim();
      const el = document.getElementById(selector) || document.querySelector('.' + selector);
      if (el) {
        el.style.display = 'none';
        return true;
      }
    }
    return false;
  }

  // Audio synthesis helper (Matrix terminal beep)
  function playCyberBeep(freq = 880, type = 'sine', duration = 0.05) {
    if (isAudioMuted) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // AudioContext unavailable
    }
  }

  // =========================================================================
  // 3. MARKDOWN TO CLEAN HTML CONVERTER
  // =========================================================================

  function renderMarkdown(md) {
    if (!md) return '';
    let html = md
      .replace(/\u0026/g, "\u0026amp;")
      .replace(/\u003c/g, "\u0026lt;")
      .replace(/\u003e/g, "\u0026gt;");
    html = html.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, function (match, lang, code) {
      return '<pre style="background:rgba(0,0,0,0.6);border:1px solid rgba(0,255,65,0.3);padding:8px 12px;border-radius:6px;overflow-x:auto;margin:6px 0;font-size:0.82rem;color:#39ff14;">' +
        '<code>' + code.trim() + '</code></pre>';
    });
    html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.45);border:1px solid rgba(0,255,65,0.25);padding:1px 5px;border-radius:3px;color:#39ff14;font-size:0.85em;">$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--accent-green-bright, #39ff14);">$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong style="color:var(--accent-green-bright, #39ff14);">$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
    html = html.replace(/^### (.*$)/gim, '<h4 style="margin:6px 0;color:var(--accent-green-bright, #39ff14);font-size:0.92rem;">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 style="margin:8px 0;color:var(--accent-green-bright, #39ff14);font-size:0.98rem;">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h3 style="margin:8px 0;color:var(--accent-green-bright, #39ff14);font-size:1rem;">$1</h3>');
    const lines = html.split('\n');
    let inList = false;
    let listType = '';
    const output = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        if (inList) {
          output.push(listType === 'ul' ? '</ul>' : '</ol>');
          inList = false;
        }
        continue;
      }
      if (/^[*-]\s+(.*)$/.test(line)) {
        if (!inList || listType !== 'ul') {
          if (inList) output.push(listType === 'ul' ? '</ul>' : '</ol>');
          output.push('<ul style="margin:4px 0 6px 18px;padding:0;">');
          inList = true; listType = 'ul';
        }
        output.push('<li style="margin-bottom:3px;">' + line.replace(/^[*-]\s+/, '') + '</li>');
        continue;
      }
      if (/^\d+\.\s+(.*)$/.test(line)) {
        if (!inList || listType !== 'ol') {
          if (inList) output.push(listType === 'ul' ? '</ul>' : '</ol>');
          output.push('<ol style="margin:4px 0 6px 18px;padding:0;">');
          inList = true; listType = 'ol';
        }
        output.push('<li style="margin-bottom:3px;">' + line.replace(/^\d+\.\s+/, '') + '</li>');
        continue;
      }
      if (inList) { output.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      if (line.startsWith('<pre') || line.startsWith('<h3') || line.startsWith('<h4')) {
        output.push(line);
      } else {
        output.push('<p style="margin:0 0 6px 0;">' + line + '</p>');
      }
    }
    if (inList) output.push(listType === 'ul' ? '</ul>' : '</ol>');
    return output.join('');
  }

  // =========================================================================
  // 4. LIVE GENERATIVE AI (ANSWERS ANY RANDOM QUESTION)
  // =========================================================================

  // Free high-speed AI inference (Pollinations) - No key required, CORS enabled
  // Enhanced error handling and rate‑limit management
  async function callFreeAI(prompt) {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-8),
      { role: "user", content: prompt }
    ];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const resp = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages, model: 'openai' }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!resp.ok) {
      let errorInfo = null;
      try {
        const json = await resp.json();
        errorInfo = json.error?.message || json.message || JSON.stringify(json);
      } catch (_) {
        errorInfo = await resp.text();
      }
      throw new Error(`AI service error (${resp.status}): ${errorInfo}`);
    }
    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await resp.json();
      if (json.error || json.message) {
        const msg = json.error?.message || json.message;
        throw new Error(`AI service returned error payload: ${msg}`);
      }
      return JSON.stringify(json).trim();
    }
    const text = await resp.text();
    return text.trim();
  }

  // Optional custom Google Gemini API Key
  async function callGeminiAPI(apiKey, prompt) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\nUser Question: ${prompt}` }] }],
      generationConfig: { maxOutputTokens: 650, temperature: 0.7 }
    };
    const resp = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error (${resp.status})`);
    }
    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  }

  // =========================================================================
  // 5. LOCAL BACKUP HEURISTICS (IF OFFLINE)
  // =========================================================================

  function generateOfflineBackup(rawQuery) {
    const q = rawQuery.toLowerCase().trim();
    if (q.includes('who is john') || q.includes('about john') || q.includes('who are you') || q.includes('introduce')) {
      return `<strong>John Manganelli</strong> is a <strong>Senior</strong> majoring in <strong>Information Technology</strong>, enrolled in <em>IT Computer Security</em> under <strong>${SITE_DATA.instructor}</strong>.<br><br>He has a passion for network engineering, Linux, defensive scripting, and homelab servers.`;
    }
    if (q.includes('fact') || q.includes('homelab') || q.includes('server')) {
      return `<strong>John's Homelab Fact:</strong><br>${SITE_DATA.homelabFact}`;
    }
    if (q.includes('skill') || q.includes('tool') || q.includes('wireshark') || q.includes('nmap') || q.includes('linux')) {
      return `<strong>John's Technical Skills:</strong>
<ul>
  <li><strong>Systems:</strong> Linux (Ubuntu, Kali Linux), Bash terminal.</li>
  <li><strong>Defensive Tools:</strong> Wireshark (packet analysis), Nmap (port scanning).</li>
  <li><strong>Scripting:</strong> Python for automated log parsing & defense, HTML/CSS.</li>
  <li><strong>Virtualization:</strong> Proxmox and VirtualBox isolated test environments.</li>
</ul>`;
    }
    if (q.includes('career') || q.includes('job') || q.includes('soc')) {
      return `<strong>Career Goals:</strong><br>John is preparing for roles as a <strong>Security Operations Center (SOC) Analyst</strong> or <strong>Incident Response Specialist</strong>.`;
    }
    if (q.includes('hobb') || q.includes('guitar') || q.includes('game')) {
      return `John's hobbies include playing <strong>guitar</strong> 🎸 and competitive <strong>fighting games</strong> 🎮!`;
    }
    if (q.includes('proposal') || q.includes('phishshield')) {
      return `<strong>Project Proposal: &ldquo;${SITE_DATA.proposal.name}&rdquo;</strong><br>${SITE_DATA.proposal.concept}<br><br>Addresses phishing and credential theft by providing interactive email and URL sandboxes.`;
    }
    if (q.includes('cia') || q.includes('triad')) {
      return `<strong>The CIA Triad:</strong>
<ul>
  <li><strong>Confidentiality:</strong> Preventing unauthorized access (encryption, access controls).</li>
  <li><strong>Integrity:</strong> Ensuring information cannot be tampered with (hashing, digital signatures).</li>
  <li><strong>Availability:</strong> Ensuring authorized users have reliable access (redundancy, DDoS defenses).</li>
</ul>`;
    }
    if (q.includes('joke')) {
      return `Why do security engineers love coffee?<br><em>Because it prevents buffer underflows!</em> ☕`;
    }
    return `I am CyberBot! You can ask me any question about cybersecurity, coding, general topics, or John's portfolio.`;
  }

  // =========================================================================
  // 6. DOM UI CREATION & EVENT LISTENERS
  // =========================================================================

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/\u0026/g, "\u0026amp;")
      .replace(/\u003c/g, "\u0026lt;")
      .replace(/\u003e/g, "\u0026gt;")
      .replace(/"/g, "\u0026quot;")
      .replace(/'/g, "\u0026#039;");
  }

  function getTimeString() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function appendUserMessage(text) {
    const list = document.getElementById('chat-messages');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'chat-msg msg-user';
    row.innerHTML = `
      <div class="msg-avatar" aria-hidden="true">&#x1F464;</div>
      <div class="msg-bubble">
        <p>${escapeHtml(text)}</p>
        <span class="msg-time">${getTimeString()}</span>
      </div>
    `;
    list.appendChild(row);
    list.scrollTop = list.scrollHeight;
    playCyberBeep(660, 'sine', 0.04);
  }

  function appendBotMessage(htmlContent) {
    const list = document.getElementById('chat-messages');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'chat-msg msg-bot';
    row.innerHTML = `
      <div class="msg-avatar" aria-hidden="true">&#x1F6E1;&#xFE0F;</div>
      <div class="msg-bubble">
        <div>${htmlContent}</div>
        <span class="msg-time">${getTimeString()}</span>
      </div>
    `;
    list.appendChild(row);
    list.scrollTop = list.scrollHeight;
    playCyberBeep(880, 'sine', 0.04);
  }

  function showTyping(show = true) {
    const indicator = document.getElementById('chat-typing');
    if (!indicator) return;
    if (show) {
      indicator.classList.add('active');
    } else {
      indicator.classList.remove('active');
    }
    const list = document.getElementById('chat-messages');
    if (list) list.scrollTop = list.scrollHeight;
  }

  // Request throttling state
  let isRequestInFlight = false;
  const pendingPrompts = [];

  async function handleSend() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    if (isRequestInFlight) {
      pendingPrompts.push(text);
      return;
    }
    input.value = '';
    appendUserMessage(text);
    showTyping(true);
    isRequestInFlight = true;
    let aiResponse = null;
    const apiKey = localStorage.getItem(STORAGE_KEY_API_KEY) || sessionStorage.getItem(STORAGE_KEY_API_KEY);
    if (apiKey) {
      try { aiResponse = await callGeminiAPI(apiKey, text); }
      catch (err) { console.warn('Custom Gemini API call failed, falling back to default AI engine:', err); }
    }
    if (!aiResponse) {
      try { aiResponse = await callFreeAI(text); }
      catch (err) { console.warn('Universal AI call failed (offline or network error):', err); }
    }
    showTyping(false);
    if (aiResponse) {
      conversationHistory.push({ role: 'user', content: text });
      conversationHistory.push({ role: 'assistant', content: aiResponse });
      if (conversationHistory.length > 12) conversationHistory.splice(0, 2);
      // If voice output is enabled, speak the response
      if (isVoiceOutputEnabled) {
        const utter = new SpeechSynthesisUtterance(aiResponse);
        speechSynthesis.speak(utter);
      }
      // Check for simple voice commands in the response (optional)
      parseVoiceCommand(aiResponse);
      appendBotMessage(renderMarkdown(aiResponse));
    } else {
      const localReply = generateOfflineBackup(text);
      appendBotMessage(localReply);
    }
    isRequestInFlight = false;
    if (pendingPrompts.length > 0) {
      const nextText = pendingPrompts.shift();
      const fakeInput = document.getElementById('chat-input');
      if (fakeInput) fakeInput.value = nextText;
      handleSend();
    }
  }

  function toggleChat(forceState) {
    const dialog = document.getElementById('chatbot-dialog');
    const launcher = document.getElementById('chatbot-launcher');
    if (!dialog || !launcher) return;
    chatOpen = typeof forceState === 'boolean' ? forceState : !chatOpen;
    dialog.setAttribute('aria-hidden', (!chatOpen).toString());
    launcher.setAttribute('aria-expanded', chatOpen.toString());
    if (chatOpen) {
      playCyberBeep(700, 'triangle', 0.08);
      setTimeout(() => { const input = document.getElementById('chat-input'); if (input) input.focus(); }, 150);
    } else {
      launcher.focus();
    }
  }

  function toggleExpand() {
    const dialog = document.getElementById('chatbot-dialog');
    const expandBtn = document.getElementById('chat-expand-btn');
    if (!dialog || !expandBtn) return;
    isExpanded = !isExpanded;
    dialog.classList.toggle('is-expanded', isExpanded);
    expandBtn.innerHTML = isExpanded ? '&#x2921;' : '&#x26F6;';
    expandBtn.setAttribute('title', isExpanded ? 'Restore window size' : 'Expand window size');
  }

  function toggleSettingsModal() {
    const modal = document.getElementById('chat-settings-modal');
    if (!modal) return;
    modal.classList.toggle('is-hidden');
  }

  function clearHistory() {
    const list = document.getElementById('chat-messages');
    if (!list) return;
    list.innerHTML = '';
    conversationHistory.length = 0;
    appendBotMessage(`Terminal cleared. Ready for your questions! Type anything you'd like to ask.`);
  }

  // =========================================================================
  // 7. INITIALIZATION
  // =========================================================================

  function initChatbot() {
    const launcher = document.getElementById('chatbot-launcher');
    if (launcher) launcher.addEventListener('click', () => toggleChat());
    const navButtons = document.querySelectorAll('.nav-chat-trigger');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => { e.preventDefault(); toggleChat(true); });
    });
    const closeBtn = document.getElementById('chat-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => toggleChat(false));
    const expandBtn = document.getElementById('chat-expand-btn');
    if (expandBtn) expandBtn.addEventListener('click', toggleExpand);
    const clearBtn = document.getElementById('chat-clear-btn');
    if (clearBtn) clearBtn.addEventListener('click', clearHistory);
    const settingsBtn = document.getElementById('chat-settings-btn');
    if (settingsBtn) settingsBtn.addEventListener('click', toggleSettingsModal);
    const audioToggleBtn = document.getElementById('chat-audio-btn');
    if (audioToggleBtn) {
      audioToggleBtn.addEventListener('click', () => {
        isAudioMuted = !isAudioMuted;
        audioToggleBtn.innerHTML = isAudioMuted ? '🔇' : '🔊';
        audioToggleBtn.setAttribute('title', isAudioMuted ? 'Unmute terminal sounds' : 'Mute terminal sounds');
        if (!isAudioMuted) playCyberBeep(990, 'sine', 0.08);
      });
    }
    const voiceToggleBtn = document.getElementById('chat-mic-btn');
    if (voiceToggleBtn) {
      voiceToggleBtn.addEventListener('click', toggleVoiceRecognition);
    }
    const voiceOutBtn = document.getElementById('chat-voice-output-btn');
    if (voiceOutBtn) {
      voiceOutBtn.addEventListener('click', toggleVoiceOutput);
    }
    const sendBtn = document.getElementById('chat-send-btn');
    if (sendBtn) sendBtn.addEventListener('click', handleSend);
    const input = document.getElementById('chat-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      });
    }
    const chips = document.querySelectorAll('.suggestion-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', function () {
        const query = this.getAttribute('data-query') || this.textContent.trim();
        if (input) { input.value = query; handleSend(); }
      });
    });
    const saveKeyBtn = document.getElementById('chat-save-key-btn');
    const apiKeyInput = document.getElementById('chat-api-key-input');
    const closeSettingsBtn = document.getElementById('chat-close-settings-btn');
    const clearKeyBtn = document.getElementById('chat-clear-key-btn');
    const storedKey = localStorage.getItem(STORAGE_KEY_API_KEY) || sessionStorage.getItem(STORAGE_KEY_API_KEY);
    if (storedKey && apiKeyInput) apiKeyInput.value = storedKey;
    if (saveKeyBtn && apiKeyInput) {
      saveKeyBtn.addEventListener('click', () => {
        const keyVal = apiKeyInput.value.trim();
        if (keyVal) { sessionStorage.setItem(STORAGE_KEY_API_KEY, keyVal); appendBotMessage(`🔑 <strong>Custom Gemini Key Configured!</strong> CyberBot is now using your custom Gemini API key.`); }
        else { sessionStorage.removeItem(STORAGE_KEY_API_KEY); localStorage.removeItem(STORAGE_KEY_API_KEY); appendBotMessage(`ℹ️ Custom API key removed. Using default live AI engine.`); }
        toggleSettingsModal();
      });
    }
    if (clearKeyBtn && apiKeyInput) {
      clearKeyBtn.addEventListener('click', () => {
        apiKeyInput.value = '';
        sessionStorage.removeItem(STORAGE_KEY_API_KEY);
        localStorage.removeItem(STORAGE_KEY_API_KEY);
        appendBotMessage(`ℹ️ Custom API key cleared. Using default live AI engine.`);
        toggleSettingsModal();
      });
    }
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', toggleSettingsModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && chatOpen) toggleChat(false);
    });
    appendBotMessage(`
<strong>System Online.</strong> Welcome to CyberBot!<br><br>
I am a conversational AI assistant. You can ask me <strong>ANY random question</strong> (science, coding, math, history, jokes, pop culture) or anything about John Manganelli's cybersecurity portfolio.<br><br>
💡 <em>Type any question below, or click any suggestion chip to get started!</em>
    `);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
  } else {
    initChatbot();
  }
})();
