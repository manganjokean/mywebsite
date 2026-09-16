/**
 * Matrix Digital Rain Animation
 * Cascading digital numbers and characters on an HTML5 canvas background.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('matrix-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Characters used for the digital rain (digits, binary, hex, and matrix katakana)
  const numbers = '0123456789';
  const binary = '01';
  const hex = '0123456789ABCDEF';
  const katakana = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ';
  const allChars = numbers + numbers + binary + hex + katakana;

  const fontSize = 16;
  let columns = 0;
  let drops = [];

  // Adjust canvas size to window
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = Math.floor(canvas.width / fontSize);

    // Preserve existing drops or initialize new ones
    const newDrops = [];
    for (let i = 0; i < columns; i++) {
      newDrops[i] = drops[i] !== undefined ? drops[i] : Math.floor(Math.random() * -50);
    }
    drops = newDrops;
  }

  resizeCanvas();

  let resizeTimeout;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resizeCanvas, 150);
  });

  // Animation timing: throttle to ~33ms (~30 FPS) for retro terminal feel & low CPU usage
  const fps = 30;
  const frameInterval = 1000 / fps;
  let lastTime = 0;
  let animationFrameId = null;

  function draw(currentTime) {
    animationFrameId = requestAnimationFrame(draw);

    if (currentTime - lastTime < frameInterval) {
      return;
    }
    lastTime = currentTime;

    // Translucent black overlay gives the iconic fading trail
    ctx.fillStyle = 'rgba(3, 7, 3, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
      const char = allChars.charAt(Math.floor(Math.random() * allChars.length));
      const x = i * fontSize;
      const y = drops[i] * fontSize;

      // Draw the bright leading character (first glyph)
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00ff41';
      ctx.shadowBlur = 8;
      ctx.fillText(char, x, y);

      // Draw the trailing character in Matrix green
      if (drops[i] > 1) {
        const trailChar = allChars.charAt(Math.floor(Math.random() * allChars.length));
        ctx.fillStyle = '#00ff41';
        ctx.shadowBlur = 0;
        ctx.fillText(trailChar, x, y - fontSize);
      }

      // Reset drop to top with randomized delay when it goes off screen
      if (y > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }

      drops[i]++;
    }
  }

  // Respect user preference for reduced motion
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!mediaQuery.matches) {
    animationFrameId = requestAnimationFrame(draw);
  }

  // Pause when the tab is inactive to conserve battery and CPU
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    } else {
      if (!animationFrameId && !mediaQuery.matches) {
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(draw);
      }
    }
  });
})();
