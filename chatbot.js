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
   - Skills: Linux (Kali, Ubuntu), Wireshark, Nmap, Python defensive scripting & log parsing, Bash, VirtualBox, Proxmox.
   - Career goal: SOC Analyst or Incident Response Specialist.
   - Hobbies: Guitar and fighting games.
   - Website Proposal: "PhishShield Academy" — interactive training sandbox for dissecting phishing emails & URLs.
   - Privacy Policy: Intentionally omits PII (address, phone, SSN, passwords) to demonstrate good security hygiene.
3. If the user asks you to quiz them or test them on cybersecurity, create a fun multiple-choice question directly in your text response and wait for their answer!

FORMATTING:
- Use clean Markdown (**bold**, *italic*, bullet points, \`inline code\`, and \`\`\`code blocks\`\`\`).
- Keep your tone sharp, helpful, and friendly.`;

  // =========================================================================
  // 2. CHATBOT STATE & MULTI-TURN HISTORY
  // =========================================================================

  let chatOpen = false;
  let isExpanded = false;
  let isAudioMuted = true;
  // Voice chat & Jarvis state
  let isVoiceOutputEnabled = false;
  let jarvisActive = false;
  let isJarvisAwake = false;
  let recognition = null;
  let sleepTimer = null;

  // Multi-turn conversation memory
  const conversationHistory = [];

  // Local storage keys
  const STORAGE_KEY_API_KEY = "jm_cyberbot_gemini_key";

  // Initialize Continuous Speech Recognition for "Hey Jarvis"
  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported in this browser.');
      return;
    }
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }

      let currentText = (finalTranscript || interimTranscript).toLowerCase();
      // Remove punctuation that might mess up the string match
      let cleanText = currentText.replace(/[.,!?]/g, '');
      const input = document.getElementById('chat-input');

      // 1. Wake word detection (accepts "hey jarvis", "ok jarvis", or just "jarvis")
      if (!isJarvisAwake && (cleanText.includes("jarvis"))) {
        isJarvisAwake = true;
        updateMicButton(true);
        playCyberBeep(1000, 'sine', 0.1);
        if (!chatOpen) toggleChat(true);

        // Check if they said a command immediately after the wake word
        let command = cleanText.split("jarvis").pop().trim();
        
        if (command.length > 2) {
          if (input) input.value = command;
          handleSend();
          isJarvisAwake = false;
          updateMicButton(false);
          return;
        } else {
          if (input) input.value = "Jarvis listening...";
        }
      }

      // 2. Capture actual command after waking up
      else if (isJarvisAwake) {
        // Show live transcript feedback so the user knows the mic is working
        if (input && currentText && !currentText.includes("jarvis")) {
          input.value = currentText;
        }

        if (finalTranscript) {
          let command = cleanText.replace(/jarvis/g, '').trim();
          if (command.length > 2) {
            if (input) input.value = command; // Ensure final text is set
            handleSend();
            isJarvisAwake = false;
            updateMicButton(false);
          }
        }

        // 3. Auto-sleep if no command given
        clearTimeout(sleepTimer);
        sleepTimer = setTimeout(() => {
          isJarvisAwake = false;
          updateMicButton(false);
          if (input && (input.value === "Jarvis listening..." || input.value === currentText)) {
            input.value = "";
          }
        }, 5000); // 5 seconds of silence = go back to sleep
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') console.warn('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
      // Auto-restart if Jarvis Mode is active (with a slight delay to prevent browser crash loops)
      if (jarvisActive) {
        setTimeout(() => {
          try { recognition.start(); } catch(e) {}
        }, 250);
      }
    };
  }

  function toggleVoiceRecognition() {
    if (!recognition) initSpeechRecognition();
    if (!recognition) return;

    jarvisActive = !jarvisActive;
    const micBtn = document.getElementById('chat-mic-btn');

    if (jarvisActive) {
      try { recognition.start(); } catch(e) {}
      if (micBtn) {
        micBtn.title = "Jarvis Mode ON (Listening for 'Hey Jarvis')";
        micBtn.style.color = "#39ff14"; // Turn icon green permanently
      }
      playCyberBeep(800, 'triangle', 0.1);
    } else {
      jarvisActive = false;
      isJarvisAwake = false;
      recognition.stop();
      updateMicButton(false);
      if (micBtn) {
        micBtn.title = "Voice Input (Microphone)";
        micBtn.style.color = ""; 
      }
      playCyberBeep(400, 'triangle', 0.1);
    }
  }

  function updateMicButton(active) {
    const micBtn = document.getElementById('chat-mic-btn');
    if (micBtn) {
      if (active) micBtn.classList.add('listening');
      else micBtn.classList.remove('listening');
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

    // First escape HTML to prevent raw script execution
    let html = md
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Code blocks: ```code```
    html = html.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, function (match, lang, code) {
      return '<pre style="background:rgba(0,0,0,0.6);border:1px solid rgba(0,255,65,0.3);padding:8px 12px;border-radius:6px;overflow-x:auto;margin:6px 0;font-size:0.82rem;color:#39ff14;"><code>' + code.trim() + '</code></pre>';
    });

    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.45);border:1px solid rgba(0,255,65,0.25);padding:1px 5px;border-radius:3px;color:#39ff14;font-size:0.85em;">$1</code>');

    // Bold: **text** or __text__
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--accent-green-bright, #39ff14);">$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong style="color:var(--accent-green-bright, #39ff14);">$1</strong>');

    // Italic: *text* or _text_
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Headers: ### Header
    html = html.replace(/^### (.*$)/gim, '<h4 style="margin:6px 0;color:var(--accent-green-bright, #39ff14);font-size:0.92rem;">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 style="margin:8px 0;color:var(--accent-green-bright, #39ff14);font-size:0.98rem;">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h3 style="margin:8px 0;color:var(--accent-green-bright, #39ff14);font-size:1rem;">$1</h3>');

    // Convert line breaks and lists
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

      // Unordered list item
      if (/^[*-]\s+(.*)$/.test(line)) {
        if (!inList || listType !== 'ul') {
          if (inList) output.push(listType === 'ul' ? '</ul>' : '</ol>');
          output.push('<ul style="margin:4px 0 6px 18px;padding:0;">');
          inList = true;
          listType = 'ul';
        }
        output.push('<li style="margin-bottom:3px;">' + line.replace(/^[*-]\s+/, '') + '</li>');
        continue;
      }

      // Ordered list item
      if (/^\d+\.\s+(.*)$/.test(line)) {
        if (!inList || listType !== 'ol') {
          if (inList) output.push(listType === 'ul' ? '</ul>' : '</ol>');
          output.push('<ol style="margin:4px 0 6px 18px;padding:0;">');
          inList = true;
          listType = 'ol';
        }
        output.push('<li style="margin-bottom:3px;">' + line.replace(/^\d+\.\s+/, '') + '</li>');
        continue;
      }

      if (inList) {
        output.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
      }

      if (line.startsWith('<pre') || line.startsWith('<h3') || line.startsWith('<h4')) {
        output.push(line);
      } else {
        output.push('<p style="margin:0 0 6px 0;">' + line + '</p>');
      }
    }

    if (inList) {
      output.push(listType === 'ul' ? '</ul>' : '</ol>');
    }

    return output.join('');
  }

  // =========================================================================
  // 4. LIVE GENERATIVE AI (ANSWERS ANY RANDOM QUESTION)
  // =========================================================================

  // =========================================================================
  // 4. AI RESPONSE ENGINE (Local Knowledge Base + External API Fallback)
  // =========================================================================

  const KNOWLEDGE_BASE = {
    cybersecurity: [
      { keywords: ['phishing', 'phish', 'email scam', 'fake email'], response: `<strong>Phishing</strong> is a social engineering attack where criminals impersonate legitimate organizations to steal credentials, financial data, or personal information.<br><br><strong>Red flags to watch for:</strong><ul><li>Urgent or threatening language ("Act now!")</li><li>Suspicious sender addresses (e.g., <code>support@arnazon.com</code>)</li><li>Mismatched URLs — hover before clicking</li><li>Requests for passwords or financial info</li><li>Poor grammar and spelling</li></ul><em>Always verify through official channels before taking action.</em>` },
      { keywords: ['password', 'passwords', 'credential'], response: `<strong>Password Security Best Practices:</strong><ul><li>Use <strong>unique passwords</strong> for every account</li><li>Minimum <strong>16 characters</strong> — use passphrases</li><li>Enable <strong>Multi-Factor Authentication (MFA)</strong> everywhere</li><li>Use a <strong>password manager</strong> (Bitwarden, KeePass)</li><li>Never reuse passwords across services</li><li>Avoid SMS-based MFA — use authenticator apps</li></ul>` },
      { keywords: ['vpn', 'virtual private network'], response: `<strong>VPN (Virtual Private Network):</strong> A VPN encrypts your internet traffic and routes it through a remote server, protecting your data on public Wi-Fi and masking your IP address.<br><br><strong>When to use:</strong><ul><li>Public Wi-Fi networks (cafes, airports)</li><li>Bypassing geographic restrictions</li><li>Privacy from ISP tracking</li></ul><em>Recommended: ProtonVPN, Mullvad, WireGuard protocol</em>` },
      { keywords: ['firewall', 'firewalls'], response: `<strong>Firewall:</strong> A network security system that monitors and controls incoming/outgoing traffic based on predetermined security rules.<br><br><strong>Types:</strong><ul><li><strong>Network-based:</strong> Hardware firewalls (routers, dedicated appliances)</li><li><strong>Host-based:</strong> Software firewalls (Windows Defender, iptables)</li><li><strong>Next-Gen (NGFW):</strong> Deep packet inspection, application awareness</li><li><strong>WAF:</strong> Web application firewalls for HTTP/HTTPS protection</li></ul>` },
      { keywords: ['malware', 'virus', 'trojan', 'ransomware'], response: `<strong>Malware Types:</strong><ul><li><strong>Virus:</strong> Attaches to legitimate programs, requires user action to spread</li><li><strong>Trojan:</strong> Disguises as legitimate software, creates backdoors</li><li><strong>Ransomware:</strong> Encrypts files, demands payment (e.g., WannaCry, NotPetya)</li><li><strong>Spyware:</strong> Secretly monitors user activity</li><li><strong>Adware:</strong> Unwanted advertising, often bundled with free software</li><li><strong>Worm:</strong> Self-replicating, spreads without user action</li></ul><strong>Protection:</strong> Keep systems updated, use antivirus, practice least privilege.` },
      { keywords: ['encryption', 'encrypt', 'aes', 'rsa', 'tls', 'ssl'], response: `<strong>Encryption</strong> converts readable data (plaintext) into unreadable code (ciphertext) using mathematical algorithms.<br><br><strong>Key types:</strong><ul><li><strong>AES-256:</strong> Symmetric encryption, industry standard for data at rest</li><li><strong>RSA:</strong> Asymmetric encryption, used for key exchange and digital signatures</li><li><strong>TLS 1.3:</strong> Encrypts data in transit (HTTPS)</li><li><strong>SHA-256:</strong> Cryptographic hash function for integrity verification</li></ul><em>"Encryption is the last line of defense."</em>` },
      { keywords: ['ddos', 'denial of service'], response: `<strong>DDoS (Distributed Denial of Service):</strong> An attack that overwhelms a target with traffic from many sources, making services unavailable.<br><br><strong>Common types:</strong><ul><li><strong>Volumetric:</strong> Floods bandwidth (UDP floods, ICMP floods)</li><li><strong>Protocol:</strong> Exploits protocol weaknesses (SYN floods)</li><li><strong>Application:</strong> Targets specific apps (HTTP floods, Slowloris)</li></ul><strong>Mitigation:</strong> Rate limiting, CDN filtering, anycast networks.` },
      { keywords: ['zero trust', 'zero-trust'], response: `<strong>Zero Trust Architecture:</strong> A security model based on "never trust, always verify."<br><br><strong>Core principles:</strong><ul><li>Verify <strong>every</strong> access request, regardless of origin</li><li><strong>Least privilege</strong> — minimum necessary access only</li><li><strong>Micro-segmentation</strong> — divide network into small zones</li><li>Continuous <strong>monitoring and validation</strong></li><li>Assume breach — design for compromise</li></ul>` },
      { keywords: ['soc', 'security operations', 'analyst'], response: `<strong>SOC (Security Operations Center):</strong> A centralized team that monitors, detects, and responds to cybersecurity threats 24/7.<br><br><strong>Analyst responsibilities:</strong><ul><li>Monitor <strong>SIEM</strong> dashboards and security alerts</li><li>Triage incidents by severity and impact</li><li>Perform <strong>threat hunting</strong> and vulnerability analysis</li><li>Create incident reports and playbooks</li><li>Coordinate incident response</li></ul><strong>Tools:</strong> Splunk, Wireshark, Nmap, OSINT frameworks, EDR platforms` },
      { keywords: ['mfa', '2fa', 'two-factor', 'multi-factor'], response: `<strong>Multi-Factor Authentication (MFA):</strong> Requires 2+ verification methods to prove identity.<br><br><strong>Factor types:</strong><ul><li><strong>Knowledge:</strong> Something you know (password, PIN)</li><li><strong>Possession:</strong> Something you have (phone, hardware token)</li><li><strong>Inherence:</strong> Something you are (fingerprint, face)</li></ul><strong>Best practice:</strong> Use authenticator apps over SMS to prevent SIM-swapping.` },
      { keywords: ['vulnerability', 'cve', 'exploit'], response: `<strong>Vulnerability Management:</strong><ul><li><strong>CVE:</strong> Common Vulnerabilities and Exposures — standardized IDs for known vulnerabilities</li><li><strong>CVSS:</strong> Common Vulnerability Scoring System — rates severity 0-10</li><li><strong>Exploit:</strong> Code that takes advantage of a vulnerability</li><li><strong>0-day:</strong> Unknown vulnerability with no patch available</li></ul><strong>Process:</strong> Discover → Assess → Prioritize → Remediate → Verify` },
      { keywords: ['network', 'subnet', 'tcp', 'ip address', 'dns'], response: `<strong>Networking Fundamentals:</strong><ul><li><strong>TCP/IP:</strong> Core protocol suite — TCP (reliable) vs UDP (fast)</li><li><strong>Subnet:</strong> Logical subdivision of an IP network (e.g., 192.168.1.0/24)</li><li><strong>DNS:</strong> Domain Name System — translates hostnames to IP addresses</li><li><strong>DHCP:</strong> Automatically assigns IP addresses to devices</li><li><strong>NAT:</strong> Network Address Translation — maps private to public IPs</li></ul>` }
    ],
    john: [
      { keywords: ['john', 'manganelli', 'who is', 'about john', 'your owner', 'creator'], response: `<strong>John Manganelli</strong> is a <strong>Senior</strong> majoring in <strong>Information Technology</strong>, enrolled in <em>IT Computer Security</em> under <strong>Prof. Xiwang Guo</strong>.<br><br>He has a passion for network engineering, Linux, defensive scripting, and homelab servers. His career goal is to become a <strong>SOC Analyst</strong> or <strong>Incident Response Specialist</strong>.` },
      { keywords: ['skill', 'skills', 'tools', 'tech', 'technologies'], response: `<strong>John's Technical Skills:</strong><ul><li><strong>Systems:</strong> Linux (Ubuntu, Kali Linux), Bash terminal</li><li><strong>Defensive Tools:</strong> Wireshark (packet analysis), Nmap (port scanning)</li><li><strong>Scripting:</strong> Python for automated log parsing &amp; defense, HTML/CSS</li><li><strong>Virtualization:</strong> Proxmox and VirtualBox isolated test environments</li><li><strong>Networking:</strong> Subnet configuration, firewall testing, isolated lab environments</li></ul>` },
      { keywords: ['career', 'job', 'goal', 'future'], response: `<strong>Career Goals:</strong><br>John is preparing for roles as a <strong>Security Operations Center (SOC) Analyst</strong> or <strong>Incident Response Specialist</strong>, defending organizations from data breaches and cyberattacks through continuous monitoring, threat detection, and rapid incident containment.` },
      { keywords: ['hobb', 'guitar', 'game', 'fun', 'free time'], response: `John's hobbies include playing <strong>guitar</strong> and competitive <strong>fighting games</strong>. These activities help him develop quick reflexes, strategic thinking, and stress management — all valuable traits for a cybersecurity professional!` },
      { keywords: ['homelab', 'lab', 'server', 'fact'], response: `<strong>John's Homelab:</strong><br>He built a dedicated <strong>multi-node physical home lab server</strong> using enterprise hardware to configure isolated virtual subnets, test custom firewalls, and simulate defensive security environments.` },
      { keywords: ['privacy', 'pii', 'personal info', 'address', 'phone'], response: `<strong>Privacy Policy:</strong> This website intentionally withholds sensitive Personally Identifiable Information (PII) including home address, phone number, passwords, student ID, SSN, and financial details to demonstrate good security hygiene.` }
    ],
    site: [
      { keywords: ['phishshield', 'proposal', 'project', 'academy'], response: `<strong>Project Proposal: PhishShield Academy</strong><br>An interactive educational web sandbox for hands-on dissection of simulated phishing emails, fake login portals, and malicious URLs.<br><br><strong>Key features:</strong><ul><li>Interactive email inspection sandbox</li><li>URL decoder for spoofed lookalike domains</li><li>Scenario-based quizzes with instant feedback</li><li>MFA defense demonstration</li></ul>` },
      { keywords: ['chatbot', 'cyberbot', 'assistant', 'ai'], response: `<strong>CyberBot (Sentinel-AI)</strong> is the built-in conversational AI assistant on this website. You can ask it questions about cybersecurity, John's portfolio, or general topics. It features voice input/output, multi-turn conversation memory, and markdown rendering.` },
      { keywords: ['digital person', 'avatar', 'photo', 'upload'], response: `<strong>AI Digital Person</strong> is an interactive feature that lets you upload a photo, generate a digital avatar, and talk to it. The digital person can answer questions, speak responses aloud, and maintain a conversation.` },
      { keywords: ['assignment', 'course', 'class', 'professor', 'guo'], response: `This website is part of the <strong>IT Computer Security</strong> course taught by <strong>Prof. Xiwang Guo</strong>. It covers authentication &amp; access control, AI chatbot integration, AI digital person creation, and cybersecurity fundamentals.` },
      { keywords: ['auth', 'login', 'admin', 'user', 'permission'], response: `<strong>Authentication &amp; Access Control</strong> demonstrates:<ul><li><strong>Authentication:</strong> Verifying <em>who you are</em> (login credentials)</li><li><strong>Authorization:</strong> Determining <em>what you can do</em> (role-based permissions)</li></ul><strong>Demo accounts:</strong><br>Admin: <code>admin / admin123</code><br>User: <code>user / user123</code>` }
    ],
    general: [
      { keywords: ['hello', 'hi', 'hey', 'greetings'], response: `Hello! I'm <strong>CyberBot</strong>, the AI assistant for John Manganelli's cybersecurity portfolio. I can help you with:<ul><li>Cybersecurity concepts (phishing, encryption, firewalls, etc.)</li><li>Information about John's skills and background</li><li>Details about this website's features</li><li>General knowledge questions</li></ul>What would you like to know?` },
      { keywords: ['help', 'what can', 'how', 'guide'], response: `<strong>I can help you with:</strong><ul><li><strong>Cybersecurity:</strong> Phishing, malware, encryption, firewalls, DDoS, VPNs, zero trust, MFA, CVEs</li><li><strong>About John:</strong> Skills, career goals, hobbies, homelab experience</li><li><strong>This Website:</strong> PhishShield proposal, chatbot, digital person, authentication</li><li><strong>Learning:</strong> Certifications, practice labs, study resources</li></ul>Just type your question!` },
      { keywords: ['thank', 'thanks', 'great', 'awesome', 'cool'], response: `You're welcome! I'm here to help. If you have any other questions about cybersecurity, John's portfolio, or anything else, feel free to ask!` },
      { keywords: ['bye', 'goodbye', 'see you', 'later'], response: `Goodbye! Thanks for chatting with CyberBot. Stay safe online and keep learning about cybersecurity!` },
      { keywords: ['joke', 'funny', 'laugh'], response: `Here's a cybersecurity joke:<br><br><em>Why did the security engineer get kicked out of the restaurant?</em><br>They kept trying to authenticate the waiter before letting them take their order! (╯°□°)╯︵ ┻━┻` },
      { keywords: ['what is cybersecurity', 'define cybersecurity', 'cybersecurity meaning'], response: `<strong>Cybersecurity</strong> is the practice of protecting computer systems, networks, and data from unauthorized access, attacks, damage, or theft.<br><br>The <strong>CIA Triad</strong>:<ul><li><strong>Confidentiality:</strong> Data only accessible to authorized parties</li><li><strong>Integrity:</strong> Data is accurate and unaltered</li><li><strong>Availability:</strong> Systems accessible when needed</li></ul>` },
      { keywords: ['cia triad', 'confidentiality', 'integrity', 'availability'], response: `<strong>The CIA Triad</strong> — the foundational model of cybersecurity:<ul><li><strong>C — Confidentiality:</strong> Preventing unauthorized access (encryption, access controls)</li><li><strong>I — Integrity:</strong> Ensuring data accuracy (hashing, digital signatures)</li><li><strong>A — Availability:</strong> Ensuring access when needed (redundancy, DDoS protection)</li></ul>` },
      { keywords: ['how to learn', 'study', 'certification', 'comptia'], response: `<strong>Getting Started in Cybersecurity:</strong><ul><li><strong>Certifications:</strong> CompTIA Security+ → Network+ → CySA+ → CISSP</li><li><strong>Practice:</strong> TryHackMe, Hack The Box, VulnHub, CTF competitions</li><li><strong>Labs:</strong> Build a home lab with virtual machines</li><li><strong>Networking:</strong> Join communities (Reddit r/netsec, BSides)</li><li><strong>Stay current:</strong> Krebs on Security, The Hacker News</li></ul>` },
      { keywords: ['kaggle', 'dataset', 'data analysis', 'machine learning'], response: `<strong>Cybersecurity + Data Science:</strong> Kaggle offers cybersecurity datasets:<ul><li><strong>Network intrusion:</strong> NSL-KDD, CICIDS2017</li><li><strong>Malware:</strong> Microsoft Malware Classification Challenge</li><li><strong>Phishing URLs:</strong> Phishing Websites Dataset</li><li><strong>Logs:</strong> LANL Cybersecurity Dataset</li></ul>These help ML models learn to detect threats!` }
    ]
  };

  function getLocalAIResponse(query) {
    const q = query.toLowerCase().trim();
    let bestMatch = null;
    let bestScore = 0;

    for (const category of Object.values(KNOWLEDGE_BASE)) {
      for (const entry of category) {
        let score = 0;
        for (const keyword of entry.keywords) {
          if (q.includes(keyword)) {
            score += keyword.length;
          }
        }
        if (score > bestScore) {
          bestScore = score;
          bestMatch = entry;
        }
      }
    }

    if (bestMatch && bestScore > 0) {
      return bestMatch.response;
    }

    return `<strong>Interesting question!</strong> I don't have a specific answer for "<em>${escapeHtml(query)}</em>" in my knowledge base, but here's what I can help with:<ul><li><strong>Cybersecurity:</strong> phishing, malware, encryption, firewalls, DDoS, VPNs, zero trust, MFA</li><li><strong>About John:</strong> skills, career, hobbies, homelab</li><li><strong>This website:</strong> PhishShield, chatbot, digital person, authentication</li><li><strong>Learning:</strong> certifications, practice labs, study resources</li></ul>Try asking about one of these topics!`;
  }

  // Try external API first, fall back to local AI engine
  async function callFreeAI(prompt) {
    // Method 1: Pollinations GET (most CORS-friendly)
    try {
      const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...conversationHistory.slice(-8),
        { role: "user", content: prompt }
      ];
      const fullPrompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const encoded = encodeURIComponent(fullPrompt);
      const resp = await fetch(`https://text.pollinations.ai/${encoded}?model=openai`);
      if (resp.ok) {
        const text = await resp.text();
        if (text && text.length > 2) return text.trim();
      }
    } catch (e) {
      console.warn('Pollinations GET failed:', e.message);
    }

    // Method 2: Local AI engine (always works)
    return getLocalAIResponse(prompt);
  }

  // Optional custom Google Gemini API Key
  async function callGeminiAPI(apiKey, prompt) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${SYSTEM_PROMPT}\n\nUser Question: ${prompt}` }]
        }
      ],
      generationConfig: {
        maxOutputTokens: 650,
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

    return `<strong>AI Service Notice:</strong> The live AI service is temporarily unreachable from your browser. This may be due to network connectivity or API rate limiting. Please try again in a few moments. You can also configure a Gemini API key in the Settings panel for a more reliable experience.`;
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

  // Request throttling state
  let isRequestInFlight = false;
  const pendingPrompts = [];

  async function handleSend() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    // Enqueue if a request is already processing
    if (isRequestInFlight) {
      pendingPrompts.push(text);
      return;
    }

    input.value = '';
    appendUserMessage(text);
    showTyping(true);
    isRequestInFlight = true;

    let aiResponse = null;

    // 1. Try custom Gemini API Key if configured
    const apiKey = localStorage.getItem(STORAGE_KEY_API_KEY) || sessionStorage.getItem(STORAGE_KEY_API_KEY);
    if (apiKey) {
      try {
        aiResponse = await callGeminiAPI(apiKey, text);
      } catch (err) {
        console.warn('Custom Gemini API call failed, falling back to default AI engine:', err);
      }
    }

    // 2. If no custom key or failed, call universal live AI
    if (!aiResponse) {
      try {
        aiResponse = await callFreeAI(text);
      } catch (err) {
        console.warn('Universal AI call failed (offline or network error):', err);
      }
    }

    showTyping(false);

    if (aiResponse) {
      // Record conversation history
      conversationHistory.push({ role: 'user', content: text });
      conversationHistory.push({ role: 'assistant', content: aiResponse });
      if (conversationHistory.length > 12) conversationHistory.splice(0, 2);

      // Render markdown response
      appendBotMessage(renderMarkdown(aiResponse));

      // Voice output: speak the response aloud if enabled
      if (isVoiceOutputEnabled && window.speechSynthesis) {
        const utter = new SpeechSynthesisUtterance(aiResponse);
        window.speechSynthesis.speak(utter);
      }

      // Check for simple page-control commands
      parseVoiceCommand(aiResponse);
    } else {
      // Offline fallback: Use local heuristics engine
      const localReply = generateOfflineBackup(text);
      appendBotMessage(localReply);
    }

    isRequestInFlight = false;
    // Process next queued prompt if any
    if (pendingPrompts.length > 0) {
      const nextText = pendingPrompts.shift();
      // Simulate sending as if user typed it
      // Directly invoke the same logic without re-reading input
      // We reuse the same flow by calling an internal helper
      // For simplicity, set the input value and recurse
      const fakeInput = document.getElementById('chat-input');
      if (fakeInput) fakeInput.value = nextText;
      // Call handleSend again (will process immediately as isRequestInFlight is false now)
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
    conversationHistory.length = 0;
    appendBotMessage(`Terminal cleared. Ready for your questions! Type anything you'd like to ask.`);
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

    // Voice chat buttons
    const micBtn = document.getElementById('chat-mic-btn');
    if (micBtn) micBtn.addEventListener('click', toggleVoiceRecognition);

    const voiceOutBtn = document.getElementById('chat-voice-output-btn');
    if (voiceOutBtn) voiceOutBtn.addEventListener('click', toggleVoiceOutput);

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
          appendBotMessage(`🔑 <strong>Custom Gemini Key Configured!</strong> CyberBot is now using your custom Gemini API key.`);
        } else {
          sessionStorage.removeItem(STORAGE_KEY_API_KEY);
          localStorage.removeItem(STORAGE_KEY_API_KEY);
          appendBotMessage(`ℹ️ Custom API key removed. Using default live AI engine.`);
        }
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
      `<strong>System Online.</strong> Welcome to CyberBot!<br><br>` +
      `I am a conversational AI assistant. You can ask me <strong>ANY random question</strong> (science, coding, math, history, jokes, pop culture) or anything about John Manganelli's cybersecurity portfolio.<br><br>` +
      `💡 <em>Type any question below, or click any suggestion chip to get started!</em>`
    );
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
  } else {
    initChatbot();
  }
})();
