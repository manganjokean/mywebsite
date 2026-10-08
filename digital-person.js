/**
 * Assignment 4 – Part 3: AI Digital Person
 * 
 * Process: Upload Photo → Generate Digital Person → Talk → Ask Questions → Receive Answers
 * 
 * - Photo upload with drag & drop
 * - AI avatar generation (canvas-based stylization from uploaded photo)
 * - Animated digital person display with speaking animation
 * - Text-to-speech using Web Speech API
 * - AI chat using Pollinations AI (same engine as chatbot)
 */
(function () {
  'use strict';

  // =========================================================================
  // 1. STATE
  // =========================================================================

  let uploadedPhoto = null;       // Base64 data URL of uploaded photo
  let generatedAvatar = null;     // Base64 data URL of generated avatar
  let isPersonActive = false;     // Whether digital person is displayed
  let isSpeaking = false;         // Whether person is currently speaking
  let conversationHistory = [];   // Multi-turn chat history
  let voiceOutputEnabled = true;  // TTS toggle

  // System prompt for the digital person
  const DIGITAL_PERSON_PROMPT = `You are the AI Digital Person of John Manganelli, a Senior majoring in Information Technology at university, enrolled in IT Computer Security under Prof. Xiwang Guo.

ABOUT JOHN:
- Senior IT major focusing on cybersecurity
- Built a dedicated multi-node physical home lab server for testing isolated subnets, firewalls, and defense environments
- Skills: Linux (Kali, Ubuntu), Wireshark, Nmap, Python defensive scripting, Bash, VirtualBox, Proxmox
- Career goal: SOC Analyst or Incident Response Specialist
- Hobbies: Guitar and fighting games
- Website proposal: "PhishShield Academy" — interactive training sandbox for dissecting phishing emails & URLs
- Privacy policy: Intentionally omits PII to demonstrate good security hygiene

YOUR ROLE:
- You are John's AI digital twin/avatar
- Speak in first person as if you are John's digital representation
- Be friendly, knowledgeable about cybersecurity, and helpful
- Keep responses concise and conversational
- You can answer questions about cybersecurity, John's portfolio, his skills, or general topics

FORMATTING:
- Use Markdown (**bold**, *italic*, bullet points, \`inline code\`)
- Keep responses relatively short since they will be spoken aloud`;

  // =========================================================================
  // 2. DOM CREATION
  // =========================================================================

  function createDigitalPersonUI() {
    if (document.getElementById('digital-person-container')) return;

    const container = document.createElement('div');
    container.id = 'digital-person-container';
    container.innerHTML = `
      <!-- Floating Launcher -->
      <button id="dp-launcher" class="dp-launcher" aria-label="Open AI Digital Person">
        <span class="dp-launcher-icon">&#x1F464;</span>
        <span class="dp-launcher-label">AI Digital Person</span>
      </button>

      <!-- Main Panel -->
      <div id="dp-panel" class="dp-panel" aria-hidden="true">
        <!-- Header -->
        <div class="dp-header">
          <div class="dp-header-info">
            <div class="dp-avatar-small" id="dp-header-avatar">
              <span>&#x1F464;</span>
            </div>
            <div>
              <span class="dp-header-name">AI Digital Person</span>
              <span class="dp-header-status" id="dp-status-indicator">
                <span class="dp-status-dot"></span>
                <span id="dp-status-text">Inactive</span>
              </span>
            </div>
          </div>
          <button id="dp-close" class="dp-close-btn" aria-label="Close">&times;</button>
        </div>

        <!-- Step Indicator -->
        <div class="dp-steps" id="dp-steps">
          <div class="dp-step active" data-step="1">
            <span class="dp-step-num">1</span>
            <span class="dp-step-label">Upload Photo</span>
          </div>
          <div class="dp-step" data-step="2">
            <span class="dp-step-num">2</span>
            <span class="dp-step-label">Generate Avatar</span>
          </div>
          <div class="dp-step" data-step="3">
            <span class="dp-step-num">3</span>
            <span class="dp-step-label">Talk & Ask</span>
          </div>
        </div>

        <!-- Content Area -->
        <div class="dp-content">
          <!-- Step 1: Upload -->
          <div class="dp-step-content active" id="dp-step-1">
            <div class="dp-upload-zone" id="dp-upload-zone">
              <div class="dp-upload-icon">&#x1F4F7;</div>
              <p class="dp-upload-text">Drag & drop a photo here, or click to browse</p>
              <p class="dp-upload-hint">JPG, PNG or WebP • Max 5MB</p>
              <input type="file" id="dp-file-input" accept="image/*" hidden>
            </div>
            <div class="dp-upload-preview hidden" id="dp-upload-preview">
              <img id="dp-preview-img" src="" alt="Uploaded photo preview">
              <div class="dp-upload-actions">
                <button id="dp-use-photo" class="dp-btn dp-btn-primary">Use This Photo</button>
                <button id="dp-reupload" class="dp-btn dp-btn-secondary">Choose Different</button>
              </div>
            </div>
          </div>

          <!-- Step 2: Generate -->
          <div class="dp-step-content" id="dp-step-2">
            <div class="dp-generate-area" id="dp-generate-area">
              <p class="dp-generate-desc">Click the button below to generate your AI digital person avatar from the uploaded photo.</p>
              <button id="dp-generate-btn" class="dp-btn dp-btn-primary dp-generate-btn">
                <span class="dp-generate-icon">&#x2728;</span> Generate Digital Person
              </button>
            </div>
            <div class="dp-generate-progress hidden" id="dp-generate-progress">
              <div class="dp-spinner"></div>
              <p>Analyzing photo & generating avatar...</p>
              <p class="dp-progress-hint">Creating digital representation</p>
            </div>
            <div class="dp-avatar-result hidden" id="dp-avatar-result">
              <div class="dp-avatar-display">
                <img id="dp-avatar-img" src="" alt="Generated digital person avatar">
              </div>
              <div class="dp-avatar-actions">
                <button id="dp-confirm-avatar" class="dp-btn dp-btn-primary">Start Talking</button>
                <button id="dp-regenerate" class="dp-btn dp-btn-secondary">Regenerate</button>
              </div>
            </div>
          </div>

          <!-- Step 3: Chat -->
          <div class="dp-step-content" id="dp-step-3">
            <div class="dp-chat-layout">
              <!-- Avatar Display -->
              <div class="dp-person-display">
                <div class="dp-person-avatar-wrap" id="dp-person-avatar-wrap">
                  <img id="dp-person-img" src="" alt="Digital Person">
                  <div class="dp-speaking-ring" id="dp-speaking-ring"></div>
                </div>
                <div class="dp-person-name">John's Digital Twin</div>
                <div class="dp-person-mood" id="dp-person-mood">Ready to chat</div>
              </div>

              <!-- Chat Messages -->
              <div class="dp-chat-messages" id="dp-chat-messages"></div>
            </div>

            <!-- Controls -->
            <div class="dp-controls">
              <div class="dp-input-row">
                <button id="dp-voice-toggle" class="dp-icon-btn" title="Toggle voice output">
                  <span id="dp-voice-icon">&#x1F50A;</span>
                </button>
                <button id="dp-mic-btn" class="dp-icon-btn" title="Voice input">
                  <span>&#x1F3A4;</span>
                </button>
                <input type="text" id="dp-chat-input" class="dp-chat-input" placeholder="Ask the digital person...">
                <button id="dp-send-btn" class="dp-send-btn" aria-label="Send">&#x27A4;</button>
              </div>
              <div class="dp-suggestion-chips">
                <button class="dp-chip" data-query="Introduce yourself">Introduce yourself</button>
                <button class="dp-chip" data-query="What is cybersecurity?">What is cybersecurity?</button>
                <button class="dp-chip" data-query="Tell me about John's skills">Tell me about John's skills</button>
                <button class="dp-chip" data-query="What is the CIA Triad?">What is the CIA Triad?</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(container);

    // -----------------------------------------------------------------------
    // Event Listeners
    // -----------------------------------------------------------------------

    // Launcher
    const launcher = document.getElementById('dp-launcher');
    launcher.addEventListener('click', () => togglePanel());

    // Close
    document.getElementById('dp-close').addEventListener('click', () => togglePanel(false));

    // Upload zone
    const uploadZone = document.getElementById('dp-upload-zone');
    const fileInput = document.getElementById('dp-file-input');

    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) handleFileSelect(e.target.files[0]);
    });

    // Upload actions
    document.getElementById('dp-use-photo').addEventListener('click', () => {
      goToStep(2);
    });
    document.getElementById('dp-reupload').addEventListener('click', () => {
      document.getElementById('dp-upload-preview').classList.add('hidden');
      document.getElementById('dp-upload-zone').classList.remove('hidden');
      fileInput.value = '';
    });

    // Generate
    document.getElementById('dp-generate-btn').addEventListener('click', generateAvatar);
    document.getElementById('dp-regenerate').addEventListener('click', generateAvatar);
    document.getElementById('dp-confirm-avatar').addEventListener('click', () => {
      goToStep(3);
      startChat();
    });

    // Chat
    document.getElementById('dp-send-btn').addEventListener('click', handleSend);
    document.getElementById('dp-chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSend();
    });
    document.getElementById('dp-voice-toggle').addEventListener('click', toggleVoice);
    document.getElementById('dp-mic-btn').addEventListener('click', toggleMic);

    // Chips
    container.querySelectorAll('.dp-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const query = chip.dataset.query;
        const input = document.getElementById('dp-chat-input');
        if (input) input.value = query;
        handleSend();
      });
    });
  }

  // =========================================================================
  // 3. PANEL TOGGLE
  // =========================================================================

  function togglePanel(force) {
    const panel = document.getElementById('dp-panel');
    const launcher = document.getElementById('dp-launcher');
    if (!panel) return;

    const show = typeof force === 'boolean' ? force : panel.getAttribute('aria-hidden') === 'true';
    panel.setAttribute('aria-hidden', String(!show));
    panel.classList.toggle('open', show);
    launcher.classList.toggle('hidden', show);
  }

  // =========================================================================
  // 4. STEP NAVIGATION
  // =========================================================================

  function goToStep(stepNum) {
    // Update step indicators
    document.querySelectorAll('.dp-step').forEach(step => {
      const s = parseInt(step.dataset.step);
      step.classList.toggle('active', s === stepNum);
      step.classList.toggle('complete', s < stepNum);
    });

    // Update content
    document.querySelectorAll('.dp-step-content').forEach(content => {
      content.classList.remove('active');
    });
    const target = document.getElementById('dp-step-' + stepNum);
    if (target) target.classList.add('active');

    // Update status
    const statusText = document.getElementById('dp-status-text');
    if (statusText) {
      const labels = ['', 'Upload Photo', 'Generate Avatar', 'Ready to Chat'];
      statusText.textContent = labels[stepNum] || 'Inactive';
    }
  }

  // =========================================================================
  // 5. PHOTO UPLOAD
  // =========================================================================

  function handleFileSelect(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedPhoto = e.target.result;
      const previewImg = document.getElementById('dp-preview-img');
      if (previewImg) previewImg.src = uploadedPhoto;

      document.getElementById('dp-upload-zone').classList.add('hidden');
      document.getElementById('dp-upload-preview').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  // =========================================================================
  // 6. AVATAR GENERATION
  // =========================================================================

  function generateAvatar() {
    if (!uploadedPhoto) {
      alert('Please upload a photo first.');
      goToStep(1);
      return;
    }

    // Show progress
    document.getElementById('dp-generate-area').classList.add('hidden');
    document.getElementById('dp-generate-progress').classList.remove('hidden');
    document.getElementById('dp-avatar-result').classList.add('hidden');

    // Simulate generation with canvas processing
    setTimeout(() => {
      processAvatarFromPhoto();
    }, 1500);
  }

  function processAvatarFromPhoto() {
    const img = new Image();
    img.onload = () => {
      // Create canvas for avatar generation
      const canvas = document.createElement('canvas');
      const size = 256;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // Draw circular cropped image
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();

      // Cover-fit the image
      const maxDim = Math.max(img.width, img.height);
      const scale = size / maxDim;
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (size - w) / 2;
      const y = (size - h) / 2;
      ctx.drawImage(img, x, y, w, h);
      ctx.restore();

      // Add Matrix-green tint overlay
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, 'rgba(0, 255, 65, 0.15)');
      gradient.addColorStop(0.7, 'rgba(0, 255, 65, 0.05)');
      gradient.addColorStop(1, 'rgba(0, 59, 0, 0.3)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Add glowing border
      ctx.save();
      ctx.strokeStyle = '#00ff41';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00ff41';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Add scan lines effect
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = '#00ff41';
      for (let i = 0; i < size; i += 3) {
        ctx.fillRect(0, i, size, 1);
      }
      ctx.restore();

      generatedAvatar = canvas.toDataURL('image/png');

      // Display result
      document.getElementById('dp-avatar-img').src = generatedAvatar;
      document.getElementById('dp-person-img').src = generatedAvatar;

      document.getElementById('dp-generate-progress').classList.add('hidden');
      document.getElementById('dp-avatar-result').classList.remove('hidden');

      isPersonActive = true;
    };
    img.src = uploadedPhoto;
  }

  // =========================================================================
  // 7. CHAT WITH DIGITAL PERSON
  // =========================================================================

  function startChat() {
    toggleVoice(true); // Default voice ON for digital person

    const messagesContainer = document.getElementById('dp-chat-messages');
    if (!messagesContainer) return;
    messagesContainer.innerHTML = '';

    appendMessage('bot', `<strong>Hello!</strong> I am John's AI Digital Person. You can talk to me, ask me questions about cybersecurity, John's portfolio, or anything else. I'm here to help!`);

    // Update mood
    const moodEl = document.getElementById('dp-person-mood');
    if (moodEl) moodEl.textContent = 'Ready to chat';
  }

  async function handleSend() {
    const input = document.getElementById('dp-chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    appendMessage('user', escapeHtml(text));

    // Show thinking state
    setMood('Thinking...');
    showTyping(true);

    // Get AI response
    try {
      const response = await callAI(text);
      showTyping(false);

      if (response) {
        conversationHistory.push({ role: 'user', content: text });
        conversationHistory.push({ role: 'assistant', content: response });
        if (conversationHistory.length > 10) conversationHistory.splice(0, 2);

        appendMessage('bot', renderMarkdown(response));

        // Speak the response
        if (voiceOutputEnabled) {
          speak(response);
        }
      } else {
        showTyping(false);
        appendMessage('bot', 'Sorry, I had trouble connecting to the AI engine. Please try again.');
        setMood('Connection error');
      }
    } catch (err) {
      showTyping(false);
      appendMessage('bot', 'An error occurred. Please try again.');
      setMood('Error');
    }
  }

  async function callAI(prompt) {
    const messages = [
      { role: 'system', content: DIGITAL_PERSON_PROMPT },
      ...conversationHistory.slice(-6),
      { role: 'user', content: prompt }
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const resp = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, model: 'openai' }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!resp.ok) throw new Error('AI service error: ' + resp.status);

      const contentType = resp.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await resp.json();
        if (json.error || json.message) {
          throw new Error(json.error?.message || json.message);
        }
        return JSON.stringify(json).trim();
      }

      const text = await resp.text();
      return text.trim();
    } catch (err) {
      console.warn('AI call failed:', err);
      return null;
    }
  }

  // =========================================================================
  // 8. TEXT-TO-SPEECH
  // =========================================================================

  function speak(text) {
    if (!window.speechSynthesis) return;

    // Strip markdown for speech
    const plainText = text
      .replace(/```[\s\S]*?```/g, ' code block ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/^#+\s+/gm, '')
      .replace(/^[-*]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '');

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to pick a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
      || voices.find(v => v.lang.startsWith('en'))
      || voices[0];
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => {
      isSpeaking = true;
      setSpeakingVisual(true);
      setMood('Speaking...');
    };

    utterance.onend = () => {
      isSpeaking = false;
      setSpeakingVisual(false);
      setMood('Ready to chat');
    };

    utterance.onerror = () => {
      isSpeaking = false;
      setSpeakingVisual(false);
      setMood('Ready to chat');
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function toggleVoice() {
    voiceOutputEnabled = !voiceOutputEnabled;
    const icon = document.getElementById('dp-voice-icon');
    if (icon) icon.textContent = voiceOutputEnabled ? '\u{1F50A}' : '\u{1F507}';

    if (!voiceOutputEnabled && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      isSpeaking = false;
      setSpeakingVisual(false);
    }
  }

  // =========================================================================
  // 9. VOICE INPUT (Speech Recognition)
  // =========================================================================

  let recognition = null;
  let isMicActive = false;

  function toggleMic() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isMicActive) {
      if (recognition) recognition.stop();
      isMicActive = false;
      document.getElementById('dp-mic-btn').classList.remove('active');
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      const input = document.getElementById('dp-chat-input');
      if (input) {
        input.value = transcript;
        handleSend();
      }
    };

    recognition.onerror = () => {
      isMicActive = false;
      document.getElementById('dp-mic-btn').classList.remove('active');
    };

    recognition.onend = () => {
      isMicActive = false;
      document.getElementById('dp-mic-btn').classList.remove('active');
    };

    isMicActive = true;
    document.getElementById('dp-mic-btn').classList.add('active');
    recognition.start();
  }

  // =========================================================================
  // 10. UI HELPERS
  // =========================================================================

  function appendMessage(type, htmlContent) {
    const container = document.getElementById('dp-chat-messages');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'dp-msg dp-msg-' + type;
    row.innerHTML = `
      <div class="dp-msg-avatar">${type === 'user' ? '\u{1F464}' : '\u{1F916}'}</div>
      <div class="dp-msg-bubble">${htmlContent}</div>
    `;
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  }

  function showTyping(show) {
    const container = document.getElementById('dp-chat-messages');
    if (!container) return;

    let indicator = document.getElementById('dp-typing');
    if (show) {
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'dp-typing';
        indicator.className = 'dp-msg dp-msg-bot dp-typing-indicator';
        indicator.innerHTML = '<div class="dp-msg-avatar">\u{1F916}</div><div class="dp-msg-bubble"><span class="dp-typing-dot"></span><span class="dp-typing-dot"></span><span class="dp-typing-dot"></span></div>';
        container.appendChild(indicator);
      }
      indicator.style.display = 'flex';
    } else if (indicator) {
      indicator.style.display = 'none';
    }
    container.scrollTop = container.scrollHeight;
  }

  function setMood(mood) {
    const moodEl = document.getElementById('dp-person-mood');
    if (moodEl) moodEl.textContent = mood;
  }

  function setSpeakingVisual(active) {
    const ring = document.getElementById('dp-speaking-ring');
    const wrap = document.getElementById('dp-person-avatar-wrap');
    if (ring) ring.classList.toggle('speaking', active);
    if (wrap) wrap.classList.toggle('talking', active);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderMarkdown(md) {
    if (!md) return '';
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    html = html.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, function (match, lang, code) {
      return '<pre style="background:rgba(0,0,0,0.6);border:1px solid rgba(0,255,65,0.3);padding:8px 12px;border-radius:6px;overflow-x:auto;margin:6px 0;font-size:0.82rem;color:#39ff14;"><code>' + code.trim() + '</code></pre>';
    });
    html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.45);border:1px solid rgba(0,255,65,0.25);padding:1px 5px;border-radius:3px;color:#39ff14;font-size:0.85em;">$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#39ff14;">$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/^### (.*$)/gim, '<h4 style="margin:6px 0;color:#39ff14;font-size:0.92rem;">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 style="margin:8px 0;color:#39ff14;font-size:0.98rem;">$1</h3>');

    const lines = html.split('\n');
    let inList = false;
    const output = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        if (inList) { output.push('</ul>'); inList = false; }
        continue;
      }
      if (/^[*-]\s+(.*)$/.test(line)) {
        if (!inList) { output.push('<ul style="margin:4px 0 6px 18px;padding:0;">'); inList = true; }
        output.push('<li style="margin-bottom:3px;">' + line.replace(/^[*-]\s+/, '') + '</li>');
        continue;
      }
      if (inList) { output.push('</ul>'); inList = false; }
      if (line.startsWith('<pre') || line.startsWith('<h3') || line.startsWith('<h4')) {
        output.push(line);
      } else {
        output.push('<p style="margin:0 0 6px 0;">' + line + '</p>');
      }
    }
    if (inList) output.push('</ul>');
    return output.join('');
  }

  // =========================================================================
  // 11. INITIALIZATION
  // =========================================================================

  function initDigitalPerson() {
    createDigitalPersonUI();

    // Navigation button handler
    const navBtn = document.getElementById('nav-digital-person-btn');
    if (navBtn) {
      navBtn.addEventListener('click', () => {
        const panel = document.getElementById('dp-panel');
        if (panel && panel.classList.contains('open')) {
          togglePanel(false);
        } else {
          togglePanel(true);
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDigitalPerson);
  } else {
    initDigitalPerson();
  }
})();
