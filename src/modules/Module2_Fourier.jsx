/**
 * Module 2: Fourier Analysis
 * Filename: Module2_Fourier.jsx
 * 
 * Secure finished module slot for Fourier Analysis:
 * - Time-Domain to Frequency-Domain Continuous & Discrete Transform representation
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Layers, BookOpen, SlidersHorizontal, Info, Activity, Sparkles, Code2, Play, Pause, RotateCcw } from 'lucide-react';
import { MathView } from '../components/MathView';
import { SimulationToolbar } from '../components/SimulationToolbar';

export default function Module2_Fourier({
  onNavigateHome,
  onNavigateModule,
  isInstructorMode = false,
}) {
  // Viewport states
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackState, setPlaybackState] = useState('paused');
  const [speed, setSpeed] = useState('1×');
  const [activeTab, setActiveTab] = useState('synthesizer'); // 'synthesizer' | 'schematic'

  // Fourier Interactive Synthesizer parameters
  const [waveformType, setWaveformType] = useState('square'); // 'square', 'sawtooth', 'triangle', 'pulse'
  const [numHarmonics, setNumHarmonics] = useState(7);
  const [fundamentalFreq, setFundamentalFreq] = useState(1); // Hz
  const [phaseOffset, setPhaseOffset] = useState(0); // degrees
  const [showTargetWave, setShowTargetWave] = useState(true);
  const [animTime, setAnimTime] = useState(0);

  // Animation loop
  const animFrameRef = useRef(null);
  const lastTimestampRef = useRef(0);

  useEffect(() => {
    if (playbackState === 'playing') {
      const mult = speed === '0.25×' ? 0.25 : speed === '0.5×' ? 0.5 : speed === '2×' ? 2 : speed === '4×' ? 4 : 1;
      const animate = (timestamp) => {
        if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
        const delta = (timestamp - lastTimestampRef.current) / 1000;
        lastTimestampRef.current = timestamp;
        setAnimTime((prev) => (prev + delta * mult) % 10);
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      lastTimestampRef.current = 0;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [playbackState, speed]);

  // Compute Fourier Series harmonics
  const { harmonicCoeffs, synthesizedPath, targetWavePath } = useMemo(() => {
    const totalPoints = 300;
    const width = 560;
    const height = 200;
    const centerY = height / 2;
    const scaleY = 70;

    // Determine Fourier coefficients c_k based on waveform
    // We compute up to 15 harmonics for the spectrum bar chart
    const maxK = 15;
    const coeffs = [];

    for (let k = 1; k <= maxK; k++) {
      let amp = 0;
      if (waveformType === 'square') {
        // Square wave: odd harmonics, b_k = 4 / (pi * k)
        if (k % 2 === 1) {
          amp = 4 / (Math.PI * k);
        }
      } else if (waveformType === 'sawtooth') {
        // Sawtooth: all harmonics, b_k = 2 * (-1)^(k+1) / (pi * k)
        amp = (2 / (Math.PI * k)) * (k % 2 === 1 ? 1 : -1);
      } else if (waveformType === 'triangle') {
        // Triangle wave: odd harmonics, b_k = 8 / (pi^2 * k^2) * (-1)^((k-1)/2)
        if (k % 2 === 1) {
          const sign = ((k - 1) / 2) % 2 === 0 ? 1 : -1;
          amp = (8 / (Math.PI * Math.PI * (k * k))) * sign;
        }
      } else if (waveformType === 'pulse') {
        // Narrow pulse train: sinc envelope
        amp = 2 * Math.sin((k * Math.PI) / 6) / (Math.PI * k);
      }
      coeffs.push({
        k,
        amp: Math.abs(amp),
        rawAmp: amp,
        active: k <= numHarmonics,
      });
    }

    // Build synthesized curve path
    let synthD = '';
    const radPhase = (phaseOffset * Math.PI) / 180 + animTime * 2 * Math.PI * fundamentalFreq;

    for (let i = 0; i < totalPoints; i++) {
      const x = 30 + (i / (totalPoints - 1)) * (width - 60);
      const t = (i / (totalPoints - 1)) * 2; // 2 periods
      let val = 0;

      for (let k = 1; k <= numHarmonics; k++) {
        const item = coeffs[k - 1];
        if (item && item.rawAmp !== 0) {
          val += item.rawAmp * Math.sin(2 * Math.PI * k * fundamentalFreq * t + k * radPhase);
        }
      }

      const y = centerY - val * scaleY;
      synthD += (i === 0 ? 'M ' : ' L ') + `${x.toFixed(1)} ${y.toFixed(1)}`;
    }

    // Build target ideal waveform path
    let targetD = '';
    for (let i = 0; i < totalPoints; i++) {
      const x = 30 + (i / (totalPoints - 1)) * (width - 60);
      const t = (i / (totalPoints - 1)) * 2 + (radPhase / (2 * Math.PI));
      const tFrac = t - Math.floor(t);
      let targetVal = 0;

      if (waveformType === 'square') {
        targetVal = tFrac < 0.5 ? 1 : -1;
      } else if (waveformType === 'sawtooth') {
        targetVal = 2 * (tFrac - 0.5);
      } else if (waveformType === 'triangle') {
        targetVal = tFrac < 0.25 ? 4 * tFrac : tFrac < 0.75 ? 2 - 4 * tFrac : 4 * tFrac - 4;
      } else if (waveformType === 'pulse') {
        targetVal = tFrac < 0.166 ? 1.5 : -0.3;
      }

      const y = centerY - targetVal * scaleY;
      targetD += (i === 0 ? 'M ' : ' L ') + `${x.toFixed(1)} ${y.toFixed(1)}`;
    }

    return { harmonicCoeffs: coeffs, synthesizedPath: synthD, targetWavePath: targetD };
  }, [waveformType, numHarmonics, fundamentalFreq, phaseOffset, animTime]);

  // Background Grid SVG
  const renderBackgroundGrid = (idPrefix) => {
    if (!isGridVisible) return null;
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none select-none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <pattern id={`${idPrefix}-minor`} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#E2DFD6" strokeWidth="1" />
          </pattern>
          <pattern id={`${idPrefix}-major`} width="96" height="96" patternUnits="userSpaceOnUse">
            <rect width="96" height="96" fill={`url(#${idPrefix}-minor)`} />
            <path d="M 96 0 L 0 0 0 96" fill="none" stroke="#C8C4B8" strokeWidth="1.25" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${idPrefix}-major)`} />
      </svg>
    );
  };

  // Original finished Fourier Transform Schematic (Time -> F -> Frequency)
  const renderFinishedSchematic = () => (
    <svg viewBox="0 0 500 200" preserveAspectRatio="xMidYMid meet" className="w-full h-full max-h-[70vh] select-none" aria-label="Time-domain to frequency-domain Fourier transform schematic" role="img">
      {/* Left: Time domain window */}
      <rect x="20" y="20" width="210" height="150" rx="4" fill="#FFFFFF" stroke="#D1CFCE" strokeWidth="1.25" />
      <text x="35" y="42" className="text-[10px] font-mono font-bold fill-[#1A1917]">TIME DOMAIN x(t)</text>
      <line x1="30" y1="105" x2="215" y2="105" stroke="#8A8882" strokeWidth="1.25" />
      <path d="M 35 105 Q 60 65, 80 105 T 125 105 T 170 105 T 210 105" fill="none" stroke="#585651" strokeWidth="2" />

      {/* Transform Arrow */}
      <path d="M 235 95 L 265 95" stroke="#C85A32" strokeWidth="2.5" />
      <path d="M 265 95 L 257 91 M 265 95 L 257 99" stroke="#C85A32" strokeWidth="2.5" />
      <text x="250" y="85" textAnchor="middle" className="text-[11px] font-mono font-bold fill-[#C85A32]">ℱ</text>

      {/* Right: Frequency domain window */}
      <rect x="270" y="20" width="210" height="150" rx="4" fill="#FFFFFF" stroke="#D1CFCE" strokeWidth="1.25" />
      <text x="285" y="42" className="text-[10px] font-mono font-bold fill-[#1A1917]">FREQUENCY SPECTRUM |X(f)|</text>
      <line x1="280" y1="145" x2="465" y2="145" stroke="#8A8882" strokeWidth="1.25" />

      {/* Spectral Lines */}
      <line x1="320" y1="145" x2="320" y2="70" stroke="#C85A32" strokeWidth="2.5" />
      <circle cx="320" cy="70" r="3" fill="#C85A32" />
      <line x1="375" y1="145" x2="375" y2="95" stroke="#C85A32" strokeWidth="2.5" />
      <circle cx="375" cy="95" r="3" fill="#C85A32" />
      <line x1="430" y1="145" x2="430" y2="120" stroke="#C85A32" strokeWidth="2.5" />
      <circle cx="430" cy="120" r="3" fill="#C85A32" />
      <text x="320" y="162" textAnchor="middle" className="text-[10px] font-mono font-medium fill-[#585651]">f₀</text>
      <text x="375" y="162" textAnchor="middle" className="text-[10px] font-mono font-medium fill-[#585651]">2f₀</text>
      <text x="430" y="162" textAnchor="middle" className="text-[10px] font-mono font-medium fill-[#585651]">3f₀</text>
    </svg>
  );

  return (
    <div className="w-full">
      {/* Module Title & Context Banner */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#E6E4DD]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2.5 py-0.5 rounded border border-[#C85A32]/20">
              MODULE 02
            </span>
            <span className="text-xs text-[#75736E] font-medium">Frequency Domain Transforms</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917]">
            Module 2: Fourier Analysis
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-[#585651] max-w-3xl leading-relaxed">
            Continuous-Time Fourier Transform (CTFT), Fourier Series harmonic decomposition, magnitude/phase spectra, and Gibbs phenomenon signal reconstruction.
          </p>
        </div>

        {/* View Toggle: Interactive Synthesizer vs Analytical Transform Schematic */}
        <div className="flex items-center gap-1.5 bg-[#FAF9F6] p-1 rounded-md border border-[#E6E4DD] shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('synthesizer')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'synthesizer'
                ? 'bg-white shadow-2xs text-[#C85A32] border border-[#E6E4DD]'
                : 'text-[#585651] hover:text-[#1A1917]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Harmonics Synthesizer</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('schematic')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'schematic'
                ? 'bg-white shadow-2xs text-[#C85A32] border border-[#E6E4DD]'
                : 'text-[#585651] hover:text-[#1A1917]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Transform Schematic</span>
          </button>
        </div>
      </div>

      {/* Main Simulation / Visualization Window */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Interactive Canvas & Parameter Controls */}
        <div className="lg:col-span-8 bg-white rounded-lg border border-[#E6E4DD] p-5 sm:p-6 shadow-xs flex flex-col">
          {/* Header & Status */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E6E4DD] mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C85A32]" />
              <h2 className="text-sm font-bold tracking-tight text-[#1A1917] uppercase font-mono">
                {activeTab === 'synthesizer' ? 'Fourier Series Harmonic Synthesis' : 'CTFT Frequency Spectrum Schematic'}
              </h2>
            </div>
            <span className="text-[11px] font-mono text-[#8A8882]">
              {activeTab === 'synthesizer' ? `N = ${numHarmonics} HARMONICS · ${waveformType.toUpperCase()}` : 'IDEAL SPECTRUM PAIR'}
            </span>
          </div>

          {/* Simulation Toolbar */}
          <SimulationToolbar
            playbackState={playbackState}
            onPlay={() => setPlaybackState('playing')}
            onPause={() => setPlaybackState('paused')}
            onReset={() => {
              setPlaybackState('paused');
              setAnimTime(0);
            }}
            speed={speed}
            onSpeedChange={setSpeed}
            isGridVisible={isGridVisible}
            onToggleGrid={() => setIsGridVisible(!isGridVisible)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
            isLiveSimulationReady={true}
            className="mb-4"
          />

          {/* Canvas Viewport Stage */}
          <div className="relative w-full min-h-[290px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden flex flex-col items-center justify-center p-3 sm:p-4">
            {renderBackgroundGrid('fourier-canvas-grid')}

            {activeTab === 'schematic' ? (
              <div className="relative z-10 w-full h-full flex items-center justify-center py-4">
                {renderFinishedSchematic()}
              </div>
            ) : (
              <div className="relative z-10 w-full flex flex-col gap-4">
                {/* Time-Domain Waveform Display */}
                <div className="bg-white/90 backdrop-blur-xs rounded border border-[#E6E4DD] p-3 relative">
                  <div className="flex items-center justify-between text-xs font-mono mb-1 text-[#585651]">
                    <span className="font-semibold text-[#1A1917]">Time-Domain Reconstruction x_N(t)</span>
                    <span className="text-[#C85A32]">N = {numHarmonics} Harmonics</span>
                  </div>
                  <svg viewBox="0 0 560 200" className="w-full h-44 select-none">
                    {/* Axes */}
                    <line x1="30" y1="100" x2="530" y2="100" stroke="#8A8882" strokeWidth="1.25" />
                    <line x1="30" y1="20" x2="30" y2="180" stroke="#8A8882" strokeWidth="1.25" />
                    <text x="25" y="35" textAnchor="end" className="text-[10px] font-mono fill-[#8A8882]">+1.0</text>
                    <text x="25" y="103" textAnchor="end" className="text-[10px] font-mono fill-[#8A8882]">0.0</text>
                    <text x="25" y="172" textAnchor="end" className="text-[10px] font-mono fill-[#8A8882]">-1.0</text>
                    <text x="535" y="103" className="text-[11px] font-mono font-bold fill-[#585651]">t</text>

                    {/* Target ideal wave (dashed) */}
                    {showTargetWave && (
                      <path d={targetWavePath} fill="none" stroke="#B8B6AE" strokeWidth="1.5" strokeDasharray="3 3" />
                    )}

                    {/* Synthesized Fourier partial sum wave */}
                    <path d={synthesizedPath} fill="none" stroke="#C85A32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex items-center justify-between text-[11px] text-[#75736E] font-mono px-1">
                    <span>- - - Ideal Target Waveform</span>
                    <span className="text-[#C85A32] font-semibold">— Partial Fourier Sum x_N(t)</span>
                  </div>
                </div>

                {/* Frequency-Domain Discrete Magnitude Spectrum |c_k| */}
                <div className="bg-white/90 backdrop-blur-xs rounded border border-[#E6E4DD] p-3">
                  <div className="flex items-center justify-between text-xs font-mono mb-2 text-[#585651]">
                    <span className="font-semibold text-[#1A1917]">Discrete Magnitude Spectrum |c_k|</span>
                    <span className="text-[#75736E]">Harmonic Coefficients k = 1..15</span>
                  </div>
                  <div className="h-24 flex items-end justify-between gap-1 pt-2 px-2 border-b border-[#8A8882]">
                    {harmonicCoeffs.map((c) => {
                      const barHeightPct = Math.min(100, Math.round((c.amp / 1.3) * 100));
                      return (
                        <div key={c.k} className="flex-1 flex flex-col items-center group relative">
                          <div
                            className={`w-full rounded-t transition-all ${
                              c.active
                                ? 'bg-[#C85A32] hover:bg-[#B54E28]'
                                : 'bg-[#E6E4DD] opacity-50'
                            }`}
                            style={{ height: `${Math.max(4, barHeightPct)}%` }}
                          />
                          <span className="text-[9px] font-mono text-[#75736E] mt-1">{c.k}</span>
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1A1917] text-white text-[10px] font-mono rounded px-1.5 py-0.5 pointer-events-none z-20 whitespace-nowrap">
                            k={c.k}: |c|={c.amp.toFixed(3)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Synthesizer Parameter Controls */}
          {activeTab === 'synthesizer' && (
            <div className="mt-5 p-4 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-[#75736E] font-semibold flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#C85A32]" />
                  <span>Synthesizer Controls</span>
                </span>
                <label className="flex items-center gap-2 text-xs text-[#585651] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTargetWave}
                    onChange={(e) => setShowTargetWave(e.target.checked)}
                    className="accent-[#C85A32] rounded"
                  />
                  <span>Show Target Waveform Overlay</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Waveform Selector */}
                <div>
                  <label className="block text-xs font-medium text-[#1A1917] mb-1">Target Waveform</label>
                  <select
                    value={waveformType}
                    onChange={(e) => setWaveformType(e.target.value)}
                    className="w-full text-xs bg-white border border-[#E6E4DD] rounded px-2.5 py-1.5 text-[#1A1917] focus:outline-none focus:ring-1 focus:ring-[#C85A32]"
                  >
                    <option value="square">Square Wave (Odd Harmonics)</option>
                    <option value="triangle">Triangle Wave (1/k² Decay)</option>
                    <option value="sawtooth">Sawtooth Wave (All Harmonics)</option>
                    <option value="pulse">Pulse Train (Sinc Envelope)</option>
                  </select>
                </div>

                {/* Harmonics Count Slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[#1A1917]">Harmonics Count (N)</span>
                    <span className="font-mono text-[#C85A32] font-semibold">{numHarmonics}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="21"
                    step="1"
                    value={numHarmonics}
                    onChange={(e) => setNumHarmonics(parseInt(e.target.value, 10))}
                    className="w-full accent-[#C85A32] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                    <span>N=1 (Fundamental)</span>
                    <span>N=21</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] font-mono text-[#8A8882]">Quick:</span>
                    {[1, 3, 7, 15, 21].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setNumHarmonics(n)}
                        className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                          numHarmonics === n
                            ? 'bg-[#C85A32] text-white border-[#C85A32]'
                            : 'bg-white text-[#585651] border-[#E6E4DD] hover:bg-[#F3F2EC]'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fundamental Frequency */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[#1A1917]">Fundamental f₀</span>
                    <span className="font-mono text-[#C85A32] font-semibold">{fundamentalFreq} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.5"
                    value={fundamentalFreq}
                    onChange={(e) => setFundamentalFreq(parseFloat(e.target.value))}
                    className="w-full accent-[#C85A32] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                    <span>0.5 Hz</span>
                    <span>3.0 Hz</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Configurable Laboratory Parameters Grid */}
          <div className="mt-5 pt-4 border-t border-[#E6E4DD]">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-2.5 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#585651]" />
              <span>Standard Laboratory Parameters</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: 'Harmonic Index (k)', value: `k = 1 .. ${numHarmonics}` },
                { label: 'Spectral Bandwidth (B)', value: `${(numHarmonics * fundamentalFreq).toFixed(1)} Hz` },
                { label: 'Sampling Rate (Fs)', value: '1024 Hz' },
                { label: 'FFT Window Length (N)', value: '512 Pts' },
              ].map((p, i) => (
                <div key={i} className="p-2.5 rounded bg-[#FAF9F6] border border-[#E6E4DD]">
                  <div className="text-[10px] font-mono text-[#8A8882] uppercase">{p.label}</div>
                  <div className="text-xs font-semibold text-[#1A1917] mt-0.5 font-mono truncate">{p.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Mathematical Formulation & Theory Notes */}
        <div className="lg:col-span-4 space-y-5">
          {/* Mathematical Model Card with KaTeX */}
          <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-5 shadow-xs">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#585651]" />
              <span>Analytical Formulation</span>
            </div>
            <div className="text-xs text-[#585651] mb-2 font-medium">
              Continuous-Time Fourier Transform (CTFT)
            </div>
            <div className="p-3 bg-white rounded border border-[#E6E4DD] text-sm font-semibold text-[#1A1917] overflow-x-auto">
              <MathView math="X(j\omega) = \int_{-\infty}^{\infty} x(t) e^{-j\omega t} \, dt" displayMode={true} />
            </div>

            <div className="text-xs text-[#585651] mt-3 mb-2 font-medium">
              Trigonometric Fourier Series Synthesis
            </div>
            <div className="p-3 bg-white rounded border border-[#E6E4DD] text-sm font-semibold text-[#1A1917] overflow-x-auto">
              <MathView math="x_N(t) = a_0 + \sum_{k=1}^N \left( a_k \cos(k\omega_0 t) + b_k \sin(k\omega_0 t) \right)" displayMode={true} />
            </div>
          </div>

          {/* Curricular Focus Topics */}
          <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-5 shadow-xs">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-3 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#585651]" />
              <span>Curricular Topics</span>
            </div>
            <ul className="space-y-2.5">
              {[
                'Harmonic Decomposition & Orthogonal Basis Functions',
                'Magnitude & Phase Spectral Representations',
                'Signal Reconstruction & Gibbs Phenomenon Control'
              ].map((topic, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-[#484642] leading-snug">
                  <span className="font-mono text-[#C85A32] font-semibold text-xs mt-0.5">0{idx + 1}</span>
                  <span>{topic}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ========================================================= */}
          {/* TEAM DROP-IN CODE BLOCK EXTENSION SLOT                    */}
          {/* Teammates can append or replace custom single-file modules*/}
          {/* ========================================================= */}
          <div className="rounded-lg border-2 border-dashed border-[#C85A32]/30 bg-[#FBF4F0]/50 p-4">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#C85A32] mb-1">
              <Code2 className="w-4 h-4" />
              <span>Slot: Module2_Fourier.jsx</span>
            </div>
            <p className="text-xs text-[#65635E] leading-relaxed">
              Finished Fourier Analysis code is active. Teammates can drop their single-file additions or replace this container without touching the navigation rail or theme tokens.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
