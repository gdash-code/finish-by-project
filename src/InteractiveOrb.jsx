import React, { useEffect, useRef, useState } from 'react';

export const InteractiveOrb = ({ onPatternComplete, onStateChange }) => {
  const canvasRef = useRef(null);
  const [orbState, setOrbState] = useState('idle');
  const [tapSequence, setTapSequence] = useState([]);
  const [particles, setParticles] = useState([]);
  const animationRef = useRef(null);
  const timeRef = useRef(0);

  // Pattern configuration
  const PATTERN = [
    { zone: 'top', time: 500 },
    { zone: 'right', time: 300 },
    { zone: 'bottom', time: 500 },
  ];
  const PATTERN_TIMEOUT = 3000; // 3 seconds to complete pattern
  const PATTERN_TOLERANCE = 200; // milliseconds tolerance for timing
  const ZONE_TOLERANCE = 30; // pixels tolerance for zone detection

  // Secure storage for pattern
  const storePattern = async (pattern) => {
    try {
      await window.storage.set('tap-pattern', JSON.stringify(pattern));
    } catch (error) {
      console.error('Failed to store pattern:', error);
    }
  };

  const loadStoredPattern = async () => {
    try {
      const result = await window.storage.get('tap-pattern');
      return result ? JSON.parse(result.value) : null;
    } catch (error) {
      console.error('Failed to load pattern:', error);
      return null;
    }
  };

  // Detect which zone was tapped
  const getZoneFromClick = (x, y, centerX, centerY, radius) => {
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Only register taps near the orb
    if (distance > radius + ZONE_TOLERANCE) return null;

    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    let normalizedAngle = angle < 0 ? angle + 360 : angle;

    if (normalizedAngle < 45 || normalizedAngle > 315) return 'right';
    if (normalizedAngle >= 45 && normalizedAngle < 135) return 'bottom';
    if (normalizedAngle >= 135 && normalizedAngle < 225) return 'left';
    if (normalizedAngle >= 225 && normalizedAngle < 315) return 'top';
  };

  // Validate tap against expected pattern
  const validateTap = (zone) => {
    const now = Date.now();
    const newSequence = [...tapSequence, { zone, timestamp: now }];
    
    // Check if this tap matches the expected position
    const expectedTap = PATTERN[newSequence.length - 1];
    
    if (zone !== expectedTap.zone) {
      // Wrong zone - reset
      setTapSequence([]);
      setOrbState('error');
      setTimeout(() => setOrbState('idle'), 600);
      return false;
    }

    // Check timing (if not the first tap)
    if (newSequence.length > 1) {
      const timeSinceLastTap = now - newSequence[newSequence.length - 2].timestamp;
      const expectedTiming = PATTERN[newSequence.length - 2].time;
      
      if (Math.abs(timeSinceLastTap - expectedTiming) > PATTERN_TOLERANCE) {
        // Wrong timing - reset
        setTapSequence([]);
        setOrbState('error');
        setTimeout(() => setOrbState('idle'), 600);
        return false;
      }
    }

    setTapSequence(newSequence);
    setOrbState('locked');

    // Check if pattern is complete
    if (newSequence.length === PATTERN.length) {
      setOrbState('success');
      storePattern(newSequence);
      onPatternComplete?.(newSequence);
      setTimeout(() => {
        setTapSequence([]);
        setOrbState('idle');
      }, 1200);
      return true;
    }

    return false;
  };

  // Create particle burst effect
  const createParticleBurst = (x, y) => {
    const newParticles = [];
    const particleCount = 12;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const velocity = {
        x: Math.cos(angle) * 8,
        y: Math.sin(angle) * 8,
      };
      
      newParticles.push({
        x,
        y,
        vx: velocity.x,
        vy: velocity.y,
        life: 1,
        size: 4,
      });
    }
    
    setParticles(prev => [...prev, ...newParticles]);
  };

  // Canvas drawing and animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const orbRadius = 60;

    const animate = () => {
      timeRef.current += 1;

      // Clear canvas
      ctx.fillStyle = 'rgba(248, 250, 252, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw zones (visual guide)
      const zoneRadius = orbRadius + 40;
      const zones = [
        { name: 'top', angle: -90 },
        { name: 'right', angle: 0 },
        { name: 'bottom', angle: 90 },
        { name: 'left', angle: 180 },
      ];

      zones.forEach(zone => {
        const rad = (zone.angle * Math.PI) / 180;
        const x = centerX + Math.cos(rad) * zoneRadius;
        const y = centerY + Math.sin(rad) * zoneRadius;

        // Check if zone is part of pattern
        const isInPattern = PATTERN.some(p => p.zone === zone.name);
        const zoneIndex = PATTERN.findIndex(p => p.zone === zone.name);
        const isCompleted = zoneIndex < tapSequence.length;
        const isCurrent = zoneIndex === tapSequence.length;

        // Draw zone indicator
        ctx.fillStyle = isCompleted
          ? 'rgba(34, 197, 94, 0.2)'
          : isCurrent
          ? 'rgba(59, 130, 246, 0.3)'
          : isInPattern
          ? 'rgba(100, 116, 139, 0.15)'
          : 'rgba(255, 255, 255, 0)';

        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.fill();

        // Draw zone label for pattern positions
        if (isInPattern) {
          ctx.fillStyle = isCurrent ? '#3b82f6' : isCompleted ? '#22c55e' : '#64748b';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${zoneIndex + 1}`, x, y);
        }
      });

      // Draw main orb with state-based appearance
      ctx.save();
      ctx.translate(centerX, centerY);

      // Orb glow
      const glowIntensity = orbState === 'success' ? 2 : orbState === 'error' ? 1.5 : 1;
      const glowColor =
        orbState === 'success'
          ? 'rgba(34, 197, 94, 0.4)'
          : orbState === 'error'
          ? 'rgba(239, 68, 68, 0.4)'
          : 'rgba(59, 130, 246, 0.3)';

      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 20 * glowIntensity;

      // Orb fill with animation
      const breathe = Math.sin(timeRef.current * 0.02) * 5;
      const scale = orbState === 'locked' ? 1.1 : orbState === 'success' ? 1.2 : 1;

      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, orbRadius + breathe);
      gradient.addColorStop(0, orbState === 'success' ? '#22c55e' : '#3b82f6');
      gradient.addColorStop(0.7, orbState === 'error' ? '#ef4444' : '#1e40af');
      gradient.addColorStop(1, orbState === 'locked' ? '#1e3a8a' : '#0f172a');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, (orbRadius + breathe) * scale, 0, Math.PI * 2);
      ctx.fill();

      // Orb outline
      ctx.strokeStyle = orbState === 'success' ? '#16a34a' : orbState === 'error' ? '#dc2626' : '#1e40af';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner threads (unraveling effect when success)
      if (orbState === 'success' || tapSequence.length > 0) {
        const threadCount = Math.min(3 + tapSequence.length, 8);
        for (let i = 0; i < threadCount; i++) {
          const angle = (i / threadCount) * Math.PI * 2 + timeRef.current * 0.01;
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 - i * 0.1})`;
          ctx.lineWidth = 2 - i * 0.2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          const length = orbRadius * (1 + i * 0.3);
          ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
          ctx.stroke();
        }
      }

      // Center dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Update and draw particles
      setParticles(prev => {
        const updated = prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.2, // gravity
            life: p.life - 0.02,
          }))
          .filter(p => p.life > 0);

        updated.forEach(p => {
          ctx.fillStyle = `rgba(59, 130, 246, ${p.life * 0.8})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
        });

        return updated;
      });

      // Draw instruction text
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';

      if (orbState === 'idle') {
        ctx.fillText('Tap the pattern', centerX, canvas.height - 20);
      } else if (orbState === 'locked') {
        const nextStep = tapSequence.length + 1;
        ctx.fillText(`Step ${nextStep}/${PATTERN.length}`, centerX, canvas.height - 20);
      } else if (orbState === 'success') {
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('✓ Pattern Complete!', centerX, canvas.height - 20);
      } else if (orbState === 'error') {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('✗ Try again', centerX, canvas.height - 20);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    // Handle canvas click
    const handleCanvasClick = (e) => {
      if (orbState === 'success' || orbState === 'error') return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const zone = getZoneFromClick(x, y, centerX, centerY, orbRadius);
      if (!zone) return;

      createParticleBurst(x, y);
      validateTap(zone);
    };

    canvas.addEventListener('click', handleCanvasClick);

    // Resize canvas to fit container
    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      canvas.width = container?.offsetWidth || 600;
      canvas.height = container?.offsetHeight || 400;
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    animate();

    return () => {
      canvas.removeEventListener('click', handleCanvasClick);
      window.removeEventListener('resize', updateCanvasSize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [orbState, tapSequence]);

  return (
    <div className="w-full flex flex-col items-center">
      <canvas
        ref={canvasRef}
        className="w-full bg-gradient-to-b from-slate-50 to-stone-100 rounded-lg border border-slate-200 cursor-pointer"
        style={{ minHeight: '400px' }}
      />
      <div className="mt-4 text-center text-sm text-slate-600">
        {PATTERN.map((step, idx) => (
          <div key={idx} className="text-xs py-1">
            <span className={tapSequence.length > idx ? 'text-green-600 font-semibold' : 'text-slate-400'}>
              Step {idx + 1}: Tap {step.zone} (in {step.time}ms)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InteractiveOrb;
