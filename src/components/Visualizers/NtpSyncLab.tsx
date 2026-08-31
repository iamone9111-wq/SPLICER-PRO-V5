import React, { useState, useEffect } from 'react';
import { calculateNtpOffset, simulateNtpExchange } from '../../utils/syncEngine';
import { NtpExchangeTimestamps } from '../../types';
import {
  Activity,
  ArrowRight,
  Clock,
  RefreshCw,
  Zap,
  ShieldAlert,
  Sliders,
  Sparkles,
  Layers,
  Wifi
} from 'lucide-react';

export const NtpSyncLab: React.FC = () => {
  const [basePing, setBasePing] = useState<number>(30);
  const [jitter, setJitter] = useState<number>(8);
  const [clockDrift, setClockDrift] = useState<number>(142); // True clock skew between devices
  const [history, setHistory] = useState<NtpExchangeTimestamps[]>([]);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [emaOffset, setEmaOffset] = useState<number>(142);

  // Trigger NTP exchange
  const runExchange = () => {
    const exchange = simulateNtpExchange(basePing, jitter, clockDrift);
    setHistory((prev) => [exchange, ...prev.slice(0, 9)]);
    setEmaOffset((prev) => (prev === 0 ? exchange.clockOffset : prev * 0.7 + exchange.clockOffset * 0.3));
  };

  useEffect(() => {
    runExchange();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSimulating) {
      interval = setInterval(() => {
        runExchange();
      }, 1800);
    }
    return () => clearInterval(interval);
  }, [isSimulating, basePing, jitter, clockDrift]);

  const latest = history[0] || {
    t0_clientSent: 1000,
    t1_serverReceived: 1157,
    t2_serverSent: 1160,
    t3_clientReceived: 1032,
    roundTripDelay: 29,
    clockOffset: 142.5
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-medium uppercase tracking-wider text-white">
              NTP 4-Timestamp Synchronization & Delay Compensation Lab
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            ExoPlayer requires millisecond-exact start times across screens. This interactive lab demonstrates how Client and Master negotiate round-trip latency and clock offset using the classic 4-timestamp exchange.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isSimulating
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-850 text-slate-400 border-slate-700'
            }`}
          >
            {isSimulating ? '2s Heartbeat Active' : 'Paused'}
          </button>
          <button
            onClick={runExchange}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Trigger Instant Ping/Pong"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4-Timestamp Interactive Visual Diagram */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-6">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          Packet Flight Timeline (Client ⇄ Master Host)
        </h3>

        {/* The 4-Timestamp Flight Diagram */}
        <div className="relative bg-black p-6 rounded-lg border border-slate-800">
          <div className="grid grid-cols-2 gap-8 relative">
            {/* Vertical timeline columns */}
            <div className="border-r border-dashed border-indigo-500/30 pr-4 space-y-12">
              <div className="flex items-center justify-between">
                <span className="font-medium text-xs text-indigo-400 font-mono">01 CLIENT DEVICE</span>
                <span className="text-[10px] font-mono text-slate-500">Local Timeline</span>
              </div>

              {/* T0 Node */}
              <div className="relative bg-slate-900 border border-indigo-500/30 p-3 rounded-lg shadow-sm">
                <div className="text-[10px] text-indigo-300 font-medium flex items-center justify-between">
                  <span>T0: Client Sends Ping</span>
                  <span className="font-mono bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded text-indigo-300">
                    {latest.t0_clientSent.toFixed(1)}ms
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Stamps local SystemClock.elapsedRealtime()</p>
              </div>

              {/* T3 Node */}
              <div className="relative bg-slate-900 border border-indigo-500/30 p-3 rounded-lg shadow-sm">
                <div className="text-[10px] text-indigo-300 font-medium flex items-center justify-between">
                  <span>T3: Client Receives Pong</span>
                  <span className="font-mono bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded text-indigo-300">
                    {latest.t3_clientReceived.toFixed(1)}ms
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Computes Offset Δ and queues ScheduledPlay</p>
              </div>
            </div>

            <div className="pl-4 space-y-12">
              <div className="flex items-center justify-between">
                <span className="font-medium text-xs text-emerald-400 font-mono">00 MASTER HOST</span>
                <span className="text-[10px] font-mono text-slate-500">Host Timeline (+{clockDrift}ms skew)</span>
              </div>

              {/* T1 Node */}
              <div className="relative bg-slate-900 border border-emerald-500/30 p-3 rounded-lg shadow-sm mt-6">
                <div className="text-[10px] text-emerald-300 font-medium flex items-center justify-between">
                  <span>T1: Host Receives Ping</span>
                  <span className="font-mono bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300">
                    {latest.t1_serverReceived.toFixed(1)}ms
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Stamps inbound receipt timestamp</p>
              </div>

              {/* T2 Node */}
              <div className="relative bg-slate-900 border border-emerald-500/30 p-3 rounded-lg shadow-sm">
                <div className="text-[10px] text-emerald-300 font-medium flex items-center justify-between">
                  <span>T2: Host Dispatches Pong</span>
                  <span className="font-mono bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300">
                    {latest.t2_serverSent.toFixed(1)}ms
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Sends back packet with T0, T1, T2</p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Mathematical Formula & Output Values */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* RTT Card */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">1. Round-Trip Delay (RTT)</span>
              <span className="font-mono text-indigo-400 font-bold text-sm">
                {latest.roundTripDelay.toFixed(2)} ms
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-900 font-mono text-[11px] text-indigo-300 border border-slate-800">
              RTT = (T3 - T0) - (T2 - T1)
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Excludes host server processing time <code className="text-slate-300">({(latest.t2_serverSent - latest.t1_serverReceived).toFixed(1)}ms)</code> to determine true symmetric flight latency.
            </p>
          </div>

          {/* Clock Offset Card */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">2. Clock Offset (Δ Offset)</span>
              <span className="font-mono text-emerald-400 font-bold text-sm">
                {emaOffset.toFixed(2)} ms
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-900 font-mono text-[11px] text-emerald-300 border border-slate-800">
              Δ = ((T1 - T0) + (T2 - T3)) / 2
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Smoothed via Exponential Moving Average (EMA). Client translates Host Target Time via: <code className="text-slate-300 font-mono">ClientExecTime = TargetHostTime - Δ</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Network Lab Sliders & Calibration Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Base Wi-Fi Latency (RTT)</span>
            <span className="font-mono text-indigo-400 font-semibold">{basePing}ms</span>
          </div>
          <input
            type="range"
            min="2"
            max="150"
            value={basePing}
            onChange={(e) => setBasePing(parseInt(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Simulated Jitter Variance</span>
            <span className="font-mono text-amber-400 font-semibold">±{jitter}ms</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            value={jitter}
            onChange={(e) => setJitter(parseInt(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Physical Hardware Clock Skew</span>
            <span className="font-mono text-indigo-400 font-semibold">+{clockDrift}ms</span>
          </div>
          <input
            type="range"
            min="-500"
            max="500"
            value={clockDrift}
            onChange={(e) => setClockDrift(parseInt(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>
      </div>
    </div>
  );
};
