/**
 * CyberBot // Sentinel-AI - Cybersecurity Portfolio Assistant
 * Complete standalone AI Chatbot with local cybersecurity knowledge base,
 * interactive phishing quiz engine, URL safety analyzer, and optional live Gemini API support.
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. KNOWLEDGE BASE & INTENT ENGINE
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

  // Pre-configured phishing quiz dataset
  const QUIZ_QUESTIONS = [
    {
      question: "You receive an email: 'URGENT: Your Financial Aid was suspended. Click here to verify your identity within 2 hours: http://university-finaid-portal.xyz/login'. What is the biggest red flag?",
      options: [
        "The email comes from financial aid",
        "Artificial urgency & suspicious non-university domain (.xyz)",
        "The subject line uses capital letters",
        "It asks you to verify identity"
      ],
      correctIndex: 1,
      explanation: "Scammers use artificial urgency ('within 2 hours') and deceptive domain names (lookalike .xyz domain rather than the official .edu domain) to panic victims into submitting credentials."
    },
    {
      question: "Which of the following URLs is a deceptive homoglyph / spoofed domain?",
      options: [
        "https://www.paypal.com/signin",
        "https://login.microsoftonline.com",
        "https://www.paypaI.com/account-update (with capital 'i' replacing 'l')",
        "https://support.google.com/accounts"
      ],
      correctIndex: 2,
      explanation: "Domain homoglyphs substitute characters with visually similar letters (e.g. uppercase 'I' for lowercase 'l' or Cyrillic characters) to deceive users."
    },
    {
      question: "Why is Multi-Factor Authentication (MFA) using an Authenticator App significantly safer than SMS-based MFA?",
      options: [
        "Authenticator apps work without cellular signal and are immune to SIM-swapping",
        "SMS texts use more phone battery",
        "Authenticator apps do not need passwords",
        "SMS messages are always blocked by firewalls"
      ],
      correctIndex: 0,
      explanation: "SMS messages travel over unencrypted cellular networks and are vulnerable to SIM-swapping and SS7 interception. Time-based One-Time Password (TOTP) authenticator apps generate offline cryptographic tokens that attackers cannot reroute."
    }
  ];

  // =========================================================================
  // 2. CHATBOT STATE
  // =========================================================================

  let chatOpen = false;
  let isExpanded = false;
  let isAudioMuted = true;
  let activeQuiz = null;
  let quizStep = 0;
  let quizScore = 0;

  // Local storage keys
  const STORAGE_KEY_API_KEY = "jm_cyberbot_gemini_key";

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
      // AudioContext unavailable or restricted
    }
  }

  // =========================================================================
  // 3. INTENT DETECTION & RESPONSE GENERATION
  // =========================================================================

  function generateLocalResponse(rawQuery) {
    const q = rawQuery.toLowerCase().trim();

    // 1. Phishing Quiz command
    if (q.includes('/quiz') || q.includes('quiz me') || q.includes('phishing quiz') || q.includes('start quiz') || q.includes('test me')) {
      startQuiz();
      return null;
    }

    // 2. URL Checker / Inspector
    if (q.startsWith('/check') || q.includes('http://') || q.includes('https://') || q.includes('.xyz') || q.includes('.ru') || q.includes('.tk') || q.includes('is this url safe')) {
      return analyzeURL(rawQuery);
    }

    // 3. Identity & Background
    if (q.includes('who is john') || q.includes('tell me about john') || q.includes('about john') || q.includes('who are you') || q.includes('introduce')) {
      return `<strong>John Manganelli</strong> is a <strong>Senior</strong> majoring in <strong>Information Technology</strong>. He is currently enrolled in <em>IT Computer Security</em> taught by <strong>${SITE_DATA.instructor}</strong>.<br><br>He is passionate about programming, homelab infrastructure, network engineering, and cybersecurity defenses.`;
    }

    // 4. Interesting Fact / Homelab
    if (q.includes('fact') || q.includes('interesting') || q.includes('homelab') || q.includes('server') || q.includes('hardware')) {
      return `<strong>Interesting Fact About John:</strong><br>${SITE_DATA.homelabFact}<br><br>This setup allows him to experiment safely with firewalls, network routing, and threat isolation!`;
    }

    // 5. Skills & Tools
    if (q.includes('skill') || q.includes('tool') || q.includes('technolog') || q.includes('wireshark') || q.includes('nmap') || q.includes('kali') || q.includes('linux') || q.includes('python')) {
      return `<strong>John's Core Technical Skills:</strong>
      <ul>
        <li><strong>Operating Systems:</strong> Linux (Ubuntu, Kali Linux), command line (<code>bash</code>, <code>ssh</code>, <code>git</code>).</li>
        <li><strong>Defensive Tools:</strong> Wireshark (packet inspection & TLS analysis), Nmap (port scanning & service discovery).</li>
        <li><strong>Scripting & Code:</strong> Python (defensive log parsing & automation), Bash, modern HTML/CSS.</li>
        <li><strong>Infrastructure:</strong> VirtualBox & Proxmox hypervisors for testing isolated subnets.</li>
      </ul>
      He is currently focusing on improving his <strong>automated defensive Python scripting</strong> and <strong>web vulnerability analysis</strong>!`;
    }

    // 6. Career Goals
    if (q.includes('career') || q.includes('job') || q.includes('future') || q.includes('soc') || q.includes('incident response') || q.includes('goals')) {
      return `<strong>Career Aspirations:</strong><br>John is preparing for roles such as a <strong>Security Operations Center (SOC) Analyst</strong> or an <strong>Incident Response Specialist</strong>.<br><br>His goal is to monitor network perimeters, detect unauthorized intrusions, investigate threat alerts, and contain attacks before organizations suffer data breaches.`;
    }

    // 7. Hobbies
    if (q.includes('hobb') || q.includes('music') || q.includes('guitar') || q.includes('game') || q.includes('gaming') || q.includes('free time')) {
      return `When John isn't configuring firewalls or studying security, his favorite hobbies include:
      <ul>
        <li><strong>Music:</strong> Playing guitar 🎸</li>
        <li><strong>Gaming:</strong> Competitive fighting games 🎮</li>
      </ul>`;
    }

    // 8. Privacy Requirement
    if (q.includes('privacy') || q.includes('withheld') || q.includes('pii') || q.includes('address') || q.includes('phone') || q.includes('ssn') || q.includes('password')) {
      return `<strong>Mandatory Privacy Implementation:</strong><br>${SITE_DATA.privacyPolicy}<br><br>
      Strictly withheld elements:
      <ul>
        <li>Home address & phone number</li>
        <li>Student ID & Social Security number</li>
        <li>Passwords & financial / banking details</li>
      </ul>
      Practicing good cyber hygiene starts with limiting public personal data exposure!`;
    }

    // 9. Specific Deliverables (D1 - D7)
    if (q.includes('deliverable 1') || q.includes('d1') || q.includes('concept')) {
      return `<strong>${SITE_DATA.proposal.deliverables.d1}</strong>`;
    }
    if (q.includes('deliverable 2') || q.includes('d2') || q.includes('target users') || q.includes('audience')) {
      return `<strong>${SITE_DATA.proposal.deliverables.d2}</strong>`;
    }
    if (q.includes('deliverable 3') || q.includes('d3') || q.includes('functional')) {
      return `<strong>${SITE_DATA.proposal.deliverables.d3}</strong>`;
    }
    if (q.includes('deliverable 4') || q.includes('d4') || q.includes('security requirement')) {
      return `<strong>${SITE_DATA.proposal.deliverables.d4}</strong>`;
    }
    if (q.includes('deliverable 5') || q.includes('d5') || q.includes('threat') || q.includes('mitigation')) {
      return `<strong>${SITE_DATA.proposal.deliverables.d5}</strong>`;
    }
    if (q.includes('deliverable 6') || q.includes('d6') || q.includes('research question')) {
      return `<strong>${SITE_DATA.proposal.deliverables.d6}</strong>`;
    }
    if (q.includes('deliverable 7') || q.includes('d7') || q.includes('objective')) {
      return `<strong>${SITE_DATA.proposal.deliverables.d7}</strong>`;
    }

    // 10. General Project Proposal / PhishShield Academy
    if (q.includes('proposal') || q.includes('phishshield') || q.includes('project') || q.includes('deliverable') || q.includes('assignment 1')) {
      return `<strong>Project Proposal: &ldquo;${SITE_DATA.proposal.name}&rdquo;</strong>
      <p>${SITE_DATA.proposal.concept}</p>
      <strong>Key Deliverables:</strong>
      <ul>
        <li><strong>Problem:</strong> ${SITE_DATA.proposal.problem}</li>
        <li><strong>Target Audience:</strong> ${SITE_DATA.proposal.targetUsers}</li>
        <li><strong>Key Features:</strong> Interactive email sandbox, lookalike URL decoder, scenario quizzes, and MFA defense simulations.</li>
        <li><strong>Security Architecture:</strong> Zero credential storage, strict XSS sanitization, and TLS 1.3 client isolation.</li>
      </ul>
      You can ask me about specific deliverables (e.g., <em>"What is Deliverable 6?"</em> or <em>"What are the threats in Deliverable 5?"</em>)!`;
    }

    // 11. Cybersecurity Concepts: CIA Triad
    if (q.includes('cia') || q.includes('triad') || q.includes('confidentiality')) {
      return `<strong>The CIA Triad: Core Pillars of Cybersecurity</strong>
      <ul>
        <li><strong>Confidentiality:</strong> Safeguarding sensitive information from unauthorized eyes (via encryption, access controls, MFA).</li>
        <li><strong>Integrity:</strong> Guaranteeing data cannot be tampered with or corrupted (via hashing, digital signatures, audit logs).</li>
        <li><strong>Availability:</strong> Ensuring authorized users have reliable, uninterrupted access to systems (via redundancy, backups, DDoS defenses).</li>
      </ul>`;
    }

    // 12. MFA & Passwords
    if (q.includes('mfa') || q.includes('multi-factor') || q.includes('two-factor') || q.includes('2fa') || q.includes('password')) {
      return `<strong>Multi-Factor Authentication (MFA) Best Practices:</strong>
      <br>John practices daily MFA enforcement using a dedicated <strong>Authenticator App</strong> (Time-based One-Time Passwords / TOTP) rather than SMS, protecting against SIM-swapping.
      <br><br>He also utilizes a password manager with <strong>16+ character unique passphrases</strong> for every service to neutralize credential stuffing attacks.`;
    }

    // 13. Phishing Detection Tips
    if (q.includes('phish') || q.includes('spear-phishing') || q.includes('email red flag') || q.includes('how to spot')) {
      return `<strong>Top Phishing Red Flags to Watch For:</strong>
      <ol>
        <li><strong>Artificial Urgency:</strong> Demands like "Act within 24 hours or account deleted!".</li>
        <li><strong>Lookalike Domain:</strong> Domains like <code>security-paypal.net</code> or <code>university.edu.xyz</code> instead of official sites.</li>
        <li><strong>Generic Greetings:</strong> "Dear Valued Customer" rather than your real name.</li>
        <li><strong>Hidden Hyperlinks:</strong> Link text saying one URL while pointing to another. (Always hover before clicking!).</li>
        <li><strong>Unsolicited Attachments:</strong> Invoices or ZIP files containing macros or ransomware.</li>
      </ol>
      Tip: Type <code>/quiz</code> to test your phishing detection skills!`;
    }

    // 14. Course & Professor
    if (q.includes('professor') || q.includes('guo') || q.includes('xiwang') || q.includes('course') || q.includes('class')) {
      return `This website and proposal were created for <strong>IT Computer Security</strong> taught by <strong>Prof. Xiwang Guo</strong>. The course explores core principles of cyber defense, vulnerability analysis, and network security.`;
    }

    // 15. Help / Greeting
    if (q.includes('hello') || q.includes('hi') || q.includes('hey') || q.includes('help') || q === 'start') {
      return `Hello! I am <strong>CyberBot</strong>, John's cybersecurity and portfolio assistant.<br><br>Here are some things you can ask me:
      <ul>
        <li><em>"Tell me about John"</em></li>
        <li><em>"What are John's technical skills?"</em></li>
        <li><em>"What is PhishShield Academy?"</em></li>
        <li><em>"Explain the CIA Triad"</em></li>
        <li><em>"Why is personal data withheld?"</em></li>
        <li>Type <code>/quiz</code> for an interactive phishing test</li>
        <li>Paste a URL or type <code>/check &lt;url&gt;</code> to analyze it</li>
      </ul>`;
    }

    // Fallback response with helpful guide
    return `I am programmed to assist with John Manganelli's <strong>IT Computer Security portfolio</strong> and his <strong>PhishShield Academy</strong> proposal.<br><br>
    Try asking:
    <ul>
      <li>🎓 <em>"Tell me about John's background and homelab"</em></li>
      <li>💻 <em>"What tools and skills does John use?"</em></li>
      <li>🛡️ <em>"What is PhishShield Academy?"</em></li>
      <li>🔐 <em>"What is the CIA Triad?"</em></li>
      <li>🎯 Type <code>/quiz</code> to play an interactive phishing simulation!</li>
    </ul>
    <em>Tip: You can also configure a live Google Gemini API key via the ⚙️ Settings button for open-ended queries!</em>`;
  }

  // URL Phishing Analyzer
  function analyzeURL(rawText) {
    // Extract URL pattern
    const urlMatch = rawText.match(/(https?:\/\/[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s]*)/i);
    const target = urlMatch ? urlMatch[0] : rawText.replace('/check', '').trim();

    if (!target) {
      return "Please provide a URL to analyze, for example: <code>/check http://secure-login-bank.xyz/portal</code>";
    }

    const issues = [];
    const lower = target.toLowerCase();

    if (lower.startsWith('http://')) {
      issues.push("⚠️ <strong>Unencrypted HTTP:</strong> Uses insecure HTTP instead of HTTPS.");
    }
    if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(lower)) {
      issues.push("🚨 <strong>Raw IP Address:</strong> Legit institutions rarely direct users to raw numeric IP hosts.");
    }
    if (lower.includes('.xyz') || lower.includes('.top') || lower.includes('.work') || lower.includes('.cc') || lower.includes('.tk')) {
      issues.push("⚠️ <strong>High-Risk TLD:</strong> Top-Level Domains like .xyz or .top are frequently used in disposable phishing campaigns.");
    }
    if (lower.includes('login') || lower.includes('verify') || lower.includes('account') || lower.includes('update') || lower.includes('secure')) {
      if (!lower.includes('.edu') && !lower.includes('.gov')) {
        issues.push("🔍 <strong>Deceptive Keywords:</strong> Contains credential-harvesting triggers (login/verify/update).");
      }
    }
    if (lower.includes('@')) {
      issues.push("🚨 <strong>Embedded Credential / Redirect:</strong> Contains '@' character used to obscure the true destination hostname.");
    }
    if (lower.split('.').length > 4) {
      issues.push("⚠️ <strong>Excessive Subdomains:</strong> Phishers often stack subdomains (e.g., <code>paypal.com.verify.attacker.com</code>).");
    }

    if (issues.length === 0) {
      return `<strong>URL Safety Inspection:</strong> <code>${escapeHtml(target)}</code><br><br>
      ✅ <strong>No immediate obvious heuristics detected.</strong> However, always verify TLS certificates and confirm with trusted bookmarks before entering credentials!`;
    } else {
      return `<strong>Phishing Threat Analysis for:</strong> <code>${escapeHtml(target)}</code><br><br>
      Found <strong>${issues.length} Red Flag(s)</strong>:
      <ul>${issues.map(i => `<li>${i}</li>`).join('')}</ul>
      <strong>Recommendation:</strong> 🛑 <em>Do NOT enter credentials or download attachments from this URL.</em>`;
    }
  }

  // =========================================================================
  // 4. INTERACTIVE QUIZ ENGINE
  // =========================================================================

  function startQuiz() {
    activeQuiz = QUIZ_QUESTIONS;
    quizStep = 0;
    quizScore = 0;
    appendBotMessage(`🎯 <strong>Phishing Detection Challenge Initiated!</strong><br>Answer 3 practical questions to evaluate your ability to spot social engineering attacks.`);
    renderCurrentQuizStep();
  }

  function renderCurrentQuizStep() {
    if (!activeQuiz || quizStep >= activeQuiz.length) {
      // Quiz Finished
      const finalMsg = `🏆 <strong>Quiz Complete!</strong><br>Your Detection Score: <strong>${quizScore} / ${activeQuiz.length}</strong> (${Math.round((quizScore / activeQuiz.length) * 100)}%).<br><br>` +
        (quizScore === activeQuiz.length
          ? "🌟 <em>Outstanding! You have sharp threat detection intuition!</em>"
          : "💡 <em>Good effort! Practical simulations like <strong>PhishShield Academy</strong> help build this intuition quickly.</em>") +
        `<br><br>Type <code>/quiz</code> to test yourself again.`;
      activeQuiz = null;
      appendBotMessage(finalMsg);
      return;
    }

    const item = activeQuiz[quizStep];
    const qNum = quizStep + 1;

    let html = `<strong>Question ${qNum} of ${activeQuiz.length}:</strong><br>${item.question}`;
    html += `<div class="chat-quiz-box"><div class="quiz-options-list">`;
    item.options.forEach((opt, idx) => {
      html += `<button class="quiz-option-btn" data-opt-idx="${idx}">${escapeHtml(opt)}</button>`;
    });
    html += `</div></div>`;

    appendBotMessage(html);

    // Bind option buttons in the latest message
    const msgList = document.getElementById('chat-messages');
    const lastMsg = msgList.lastElementChild;
    const buttons = lastMsg.querySelectorAll('.quiz-option-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', function () {
        const selectedIdx = parseInt(this.getAttribute('data-opt-idx'), 10);
        handleQuizAnswer(selectedIdx, buttons);
      });
    });
  }

  function handleQuizAnswer(selectedIdx, buttons) {
    if (!activeQuiz) return;
    const item = activeQuiz[quizStep];

    buttons.forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === item.correctIndex) {
        btn.classList.add('correct');
      } else if (idx === selectedIdx) {
        btn.classList.add('incorrect');
      }
    });

    const isCorrect = selectedIdx === item.correctIndex;
    if (isCorrect) {
      quizScore++;
      playCyberBeep(1200, 'sine', 0.1);
      appendBotMessage(`✅ <strong>Correct!</strong> ${item.explanation}`);
    } else {
      playCyberBeep(300, 'sawtooth', 0.15);
      appendBotMessage(`❌ <strong>Incorrect.</strong> ${item.explanation}`);
    }

    quizStep++;
    setTimeout(() => {
      renderCurrentQuizStep();
    }, 1200);
  }

  // =========================================================================
  // 5. OPTIONAL GEMINI LIVE AI API INTEGRATION
  // =========================================================================

  async function callGeminiAPI(apiKey, prompt) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const systemInstruction = `You are CyberBot, an AI assistant for John Manganelli's IT Computer Security website.
Key information:
- John Manganelli is a Senior in Information Technology taking IT Computer Security with Prof. Xiwang Guo.
- Core skills: Linux (Ubuntu/Kali), Wireshark, Nmap, Python defensive scripting, VirtualBox, Proxmox, homelab firewall testbed.
- Hobbies: Guitar and fighting games. Career goal: SOC Analyst / Incident Response.
- Website proposal: "PhishShield Academy", an interactive web sandbox for dissecting phishing emails & URLs to improve student detection rates.
- Privacy: Sensitives like addresses, phone numbers, passwords, student ID, and SSN are intentionally withheld to prevent social engineering.
Keep responses concise, informative, and formatted with clean HTML tags (<b>, <code>, <ul>, <li>). Maintain a professional cybersecurity tone.`;

    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemInstruction}\n\nUser Question: ${prompt}` }]
        }
      ],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7
      }
    };

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error (${resp.status})`);
    }

    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  }

  // =========================================================================
  // 6. DOM UI CREATION & EVENT LISTENERS
  // =========================================================================

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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

  async function handleSend() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    appendUserMessage(text);
    showTyping(true);

    const apiKey = localStorage.getItem(STORAGE_KEY_API_KEY) || sessionStorage.getItem(STORAGE_KEY_API_KEY);

    if (apiKey) {
      try {
        const liveResponse = await callGeminiAPI(apiKey, text);
        showTyping(false);
        if (liveResponse) {
          appendBotMessage(liveResponse);
          return;
        }
      } catch (err) {
        console.warn("Gemini API call failed, using local brain fallback:", err);
        // Fall back seamlessly to local engine
      }
    }

    // Local heuristic engine
    setTimeout(() => {
      showTyping(false);
      const reply = generateLocalResponse(text);
      if (reply) {
        appendBotMessage(reply);
      }
    }, 450);
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
      setTimeout(() => {
        const input = document.getElementById('chat-input');
        if (input) input.focus();
      }, 150);
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
    appendBotMessage(`Terminal cleared. Ready for your security or portfolio questions!<br><br>Tip: Type <code>/quiz</code> for an interactive challenge.`);
  }

  // =========================================================================
  // 7. INITIALIZATION
  // =========================================================================

  function initChatbot() {
    // 1. Launcher button click
    const launcher = document.getElementById('chatbot-launcher');
    if (launcher) {
      launcher.addEventListener('click', () => toggleChat());
    }

    // 2. Navigation bar "AI Assistant" button(s)
    const navButtons = document.querySelectorAll('.nav-chat-trigger');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleChat(true);
      });
    });

    // 3. Header Action Buttons
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
        audioToggleBtn.innerHTML = isAudioMuted ? '&#x1F507;' : '&#x1F50A;';
        audioToggleBtn.setAttribute('title', isAudioMuted ? 'Unmute terminal sounds' : 'Mute terminal sounds');
        if (!isAudioMuted) playCyberBeep(990, 'sine', 0.08);
      });
    }

    // 4. Input handling
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

    // 5. Suggestion Chips
    const chips = document.querySelectorAll('.suggestion-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', function () {
        const query = this.getAttribute('data-query') || this.textContent.trim();
        if (input) {
          input.value = query;
          handleSend();
        }
      });
    });

    // 6. Settings modal actions (Save / Clear Gemini API key)
    const saveKeyBtn = document.getElementById('chat-save-key-btn');
    const apiKeyInput = document.getElementById('chat-api-key-input');
    const closeSettingsBtn = document.getElementById('chat-close-settings-btn');
    const clearKeyBtn = document.getElementById('chat-clear-key-btn');

    const storedKey = localStorage.getItem(STORAGE_KEY_API_KEY) || sessionStorage.getItem(STORAGE_KEY_API_KEY);
    if (storedKey && apiKeyInput) {
      apiKeyInput.value = storedKey;
    }

    if (saveKeyBtn && apiKeyInput) {
      saveKeyBtn.addEventListener('click', () => {
        const keyVal = apiKeyInput.value.trim();
        if (keyVal) {
          sessionStorage.setItem(STORAGE_KEY_API_KEY, keyVal);
          appendBotMessage(`🔑 <strong>API Key Configured!</strong> CyberBot will now use live Gemini AI models when answering complex queries.`);
        } else {
          sessionStorage.removeItem(STORAGE_KEY_API_KEY);
          localStorage.removeItem(STORAGE_KEY_API_KEY);
          appendBotMessage(`ℹ️ Live API key removed. Reverted to built-in cybersecurity knowledge engine.`);
        }
        toggleSettingsModal();
      });
    }

    if (clearKeyBtn && apiKeyInput) {
      clearKeyBtn.addEventListener('click', () => {
        apiKeyInput.value = '';
        sessionStorage.removeItem(STORAGE_KEY_API_KEY);
        localStorage.removeItem(STORAGE_KEY_API_KEY);
        appendBotMessage(`ℹ️ API key cleared. Using built-in local knowledge engine.`);
        toggleSettingsModal();
      });
    }

    if (closeSettingsBtn) {
      closeSettingsBtn.addEventListener('click', toggleSettingsModal);
    }

    // 7. Global keyboard shortcuts: Esc to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && chatOpen) {
        toggleChat(false);
      }
    });

    // Initial greeting in message stream
    appendBotMessage(
      `<strong>System Online.</strong> Welcome to John Manganelli's Cybersecurity Assistant!<br><br>` +
      `Ask me anything about John's technical skills, homelab, privacy implementation, or the <strong>PhishShield Academy</strong> proposal.<br><br>` +
      `💡 <em>Try clicking the prompt chips below or type <code>/quiz</code> to test your phishing detection skills!</em>`
    );
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
  } else {
    initChatbot();
  }
})();
