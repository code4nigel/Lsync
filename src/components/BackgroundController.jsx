import React, { useEffect, useRef } from 'react';

export default function BackgroundController({ theme }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const ctx = canvas.getContext('2d');

    // Matrix Rain config
    const columns = Math.floor(width / 20) + 1;
    const yPositions = Array(columns).fill(0);
    const matrixChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZLsync♪";

    // Floating Orbs config
    const orbs = [];
    const orbColors = [
      'rgba(17, 100, 102, 0.25)',  // Teal
      'rgba(217, 176, 140, 0.18)', // Sand
      'rgba(255, 203, 154, 0.15)', // Peach
      'rgba(209, 232, 226, 0.2)'    // Mint
    ];

    for (let i = 0; i < 6; i++) {
      orbs.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 150 + Math.random() * 200,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        color: orbColors[i % orbColors.length]
      });
    }

    // Liquid Glass Wave config
    const waves = [
      {
        y: height * 0.65,
        amplitude: 55,
        frequency: 0.003,
        speed: 0.0012,
        phase: 0,
        color1: 'rgba(17, 100, 102, 0.28)',   // Teal
        color2: 'rgba(44, 53, 49, 0.1)'
      },
      {
        y: height * 0.72,
        amplitude: 45,
        frequency: 0.004,
        speed: 0.0008,
        phase: Math.PI / 3,
        color1: 'rgba(209, 232, 226, 0.22)', // Sage Mint
        color2: 'rgba(17, 100, 102, 0.05)'
      },
      {
        y: height * 0.78,
        amplitude: 65,
        frequency: 0.002,
        speed: 0.0005,
        phase: Math.PI * 1.5,
        color1: 'rgba(255, 203, 154, 0.14)', // Peach
        color2: 'rgba(217, 176, 140, 0.1)'   // Sand
      }
    ];

    // Bubbles rising in the liquid wave
    const bubbles = [];
    for (let i = 0; i < 15; i++) {
      bubbles.push({
        x: Math.random() * width,
        y: height + Math.random() * 300,
        r: 2 + Math.random() * 8,
        speed: 0.3 + Math.random() * 0.8,
        wobbleSpeed: 0.002 + Math.random() * 0.004,
        wobbleAmplitude: 5 + Math.random() * 10,
        seed: Math.random() * 100
      });
    }

    let timeCount = 0;

    const draw = () => {
      timeCount += 1;

      if (theme === 'matrix') {
        ctx.fillStyle = 'rgba(44, 53, 49, 0.08)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#D1E8E2';
        ctx.font = '14px monospace';

        yPositions.forEach((y, index) => {
          const char = matrixChars[Math.floor(Math.random() * matrixChars.length)];
          const x = index * 20;
          ctx.fillText(char, x, y);

          if (y > 100 + Math.random() * 10000) {
            yPositions[index] = 0;
          } else {
            yPositions[index] = y + 20;
          }
        });
      } else if (theme === 'orbs') {
        ctx.fillStyle = '#2C3531';
        ctx.fillRect(0, 0, width, height);

        orbs.forEach(orb => {
          if (orb.x - orb.r < 0 || orb.x + orb.r > width) orb.vx *= -1;
          if (orb.y - orb.r < 0 || orb.y + orb.r > height) orb.vy *= -1;

          orb.x += orb.vx;
          orb.y += orb.vy;

          const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
          gradient.addColorStop(0, orb.color);
          gradient.addColorStop(1, 'rgba(44, 53, 49, 0)');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
          ctx.fill();
        });
      } else {
        // 'wave' — Premium Client-side Animated Liquid Glass Waves
        ctx.fillStyle = '#2C3531';
        ctx.fillRect(0, 0, width, height);

        // Update and draw Waves
        waves.forEach((w, waveIdx) => {
          w.phase += w.speed;
          
          // Re-calculate basic y height on resize check
          const targetY = height * (0.55 + waveIdx * 0.1);

          ctx.beginPath();
          ctx.moveTo(0, height);

          // Plot wave points using compound sine to create natural organic motion
          for (let x = 0; x <= width; x += 15) {
            const angle = x * w.frequency + w.phase;
            const compound = Math.sin(angle) * Math.cos(angle * 0.4 + w.phase * 0.2);
            const y = targetY + compound * w.amplitude;
            ctx.lineTo(x, y);
          }

          ctx.lineTo(width, height);
          ctx.closePath();

          // Create translucent gradient fill
          const grad = ctx.createLinearGradient(0, targetY - w.amplitude, 0, height);
          grad.addColorStop(0, w.color1);
          grad.addColorStop(0.7, w.color2);
          grad.addColorStop(1, 'rgba(44, 53, 49, 0.85)');

          ctx.fillStyle = grad;
          ctx.fill();

          // Add a subtle glowing top line highlight to simulate glass edge reflection
          ctx.strokeStyle = w.color1.replace('0.28', '0.6').replace('0.22', '0.6').replace('0.14', '0.5');
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });

        // Update and draw glass bubbles rising through the waves
        bubbles.forEach(b => {
          b.y -= b.speed;
          
          // Reset bubble when it leaves the top of the wave section
          if (b.y < height * 0.4) {
            b.y = height + 50;
            b.x = Math.random() * width;
          }

          // Add horizontal organic drift wobble
          const wobble = Math.sin(timeCount * b.wobbleSpeed + b.seed) * b.wobbleAmplitude;
          const drawX = b.x + wobble;

          // Glass highlight reflection
          const grad = ctx.createRadialGradient(
            drawX - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.1,
            drawX, b.y, b.r
          );
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
          grad.addColorStop(0.3, 'rgba(209, 232, 226, 0.12)');
          grad.addColorStop(0.85, 'rgba(17, 100, 102, 0.05)');
          grad.addColorStop(1, 'rgba(255, 255, 255, 0.25)'); // Highlight rim

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(drawX, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -2,
        pointerEvents: 'none'
      }}
    />
  );
}
