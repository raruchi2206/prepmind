import { useEffect, useRef } from 'react';

export function KnowledgeSignal({ size = 200, className = '', animated = true, light = false }) {
  const stroke = light ? 'rgba(65,45,21,0.5)' : 'rgba(225,220,201,0.5)';
  const strokeFaint = light ? 'rgba(65,45,21,0.18)' : 'rgba(225,220,201,0.18)';
  const nodeFill = light ? 'rgba(65,45,21,0.7)' : 'rgba(225,220,201,0.7)';
  const center = size / 2;
  const r1 = size * 0.12;
  const r2 = size * 0.22;
  const r3 = size * 0.32;
  const r4 = size * 0.42;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`knowledge-signal-glow ${className}`}
      style={{ overflow: 'visible' }}
    >
      {/* Outer ring faint */}
      <circle cx={center} cy={center} r={r4} fill="none" stroke={strokeFaint} strokeWidth="0.5"
        style={animated ? { animation: 'pulse-ring 4s ease-in-out infinite' } : {}} />
      {/* Ring 3 */}
      <circle cx={center} cy={center} r={r3} fill="none" stroke={strokeFaint} strokeWidth="1"
        style={animated ? { animation: 'pulse-ring 3.5s ease-in-out infinite 0.5s' } : {}} />
      {/* Ring 2 */}
      <circle cx={center} cy={center} r={r2} fill="none" stroke={stroke} strokeWidth="1"
        strokeDasharray="4 3"
        style={animated ? { animation: 'spin-slow 25s linear infinite' } : {}} />
      {/* Ring 1 */}
      <circle cx={center} cy={center} r={r1} fill="none" stroke={stroke} strokeWidth="1.5"
        strokeDasharray="3 2"
        style={animated ? { animation: 'counter-spin 18s linear infinite' } : {}} />

      {/* Orbiting nodes on ring 2 */}
      {[0, 120, 240].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const nx = center + r2 * Math.cos(rad);
        const ny = center + r2 * Math.sin(rad);
        return (
          <g key={i} style={animated ? { transformOrigin: `${center}px ${center}px`, animation: `spin-slow ${20 + i * 3}s linear infinite` } : {}}>
            <circle cx={nx} cy={ny} r={2.5} fill={nodeFill}
              style={animated ? { animation: `pulse-ring ${2 + i * 0.5}s ease-in-out infinite` } : {}} />
          </g>
        );
      })}

      {/* Orbiting nodes on ring 3 */}
      {[60, 180, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const nx = center + r3 * Math.cos(rad);
        const ny = center + r3 * Math.sin(rad);
        return (
          <g key={i} style={animated ? { transformOrigin: `${center}px ${center}px`, animation: `counter-spin ${28 + i * 4}s linear infinite` } : {}}>
            <circle cx={nx} cy={ny} r={1.5} fill={nodeFill} opacity={0.6} />
          </g>
        );
      })}

      {/* Connection lines from center to ring-2 nodes */}
      {[0, 120, 240].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const nx = center + r2 * Math.cos(rad);
        const ny = center + r2 * Math.sin(rad);
        return (
          <line key={i} x1={center} y1={center} x2={nx} y2={ny}
            stroke={strokeFaint} strokeWidth="0.5" />
        );
      })}

      {/* Center mark */}
      <circle cx={center} cy={center} r={4} fill={nodeFill}
        style={animated ? { animation: 'pulse-ring 2s ease-in-out infinite' } : {}} />
      <circle cx={center} cy={center} r={2} fill={light ? '#412D15' : '#E1DCC9'} />

      {/* Outer particles */}
      {animated && [15, 75, 135, 195, 255, 315].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const d = r4 * 1.1;
        const nx = center + d * Math.cos(rad);
        const ny = center + d * Math.sin(rad);
        return (
          <circle key={i} cx={nx} cy={ny} r={1} fill={nodeFill} opacity={0.3}
            style={{ animation: `pulse-ring ${3 + i * 0.4}s ease-in-out infinite ${i * 0.3}s` }} />
        );
      })}
    </svg>
  );
}

export function KnowledgeSignalLarge({ size = 400, className = '', light = false }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <KnowledgeSignal size={size} light={light} animated />
    </div>
  );
}

export function ProcessingSignal({ stage = 0, stages = [], light = false }) {
  const stageLabel = stages[stage] || 'PROCESSING';
  return (
    <div className="flex flex-col items-center gap-8">
      <KnowledgeSignal size={120} light={light} animated />
      <div className="text-center">
        <p className="font-mono text-xs tracking-widest opacity-60 mb-2">
          {stages.map((s, i) => (
            <span key={i} className={`block transition-all duration-500 ${i === stage ? 'opacity-100' : 'opacity-20'}`}>
              {i < stage ? '✓ ' : i === stage ? '→ ' : '  '}{s}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
