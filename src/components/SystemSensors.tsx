import React, { useState, useEffect } from 'react';
import { SystemSensors } from '../types';
import { Thermometer, Fan, Zap, Activity, Info, AlertTriangle } from 'lucide-react';
import { playTick, playBeep, playErrorBuzz } from '../utils/audio';

interface SystemSensorsCompProps {
  sensors: SystemSensors;
  onUpdateSensors: React.Dispatch<React.SetStateAction<SystemSensors>>;
  dataSource: 'SERVER' | 'LOCAL';
}

export default function SystemSensorsComp({
  sensors,
  onUpdateSensors,
  dataSource,
}: SystemSensorsCompProps) {
  const [loadMultiplier, setLoadMultiplier] = useState<number>(1.5); // 1.0 to 5.0
  const [alertTriggered, setAlertTriggered] = useState(false);

  // Dynamic fluctuation & workload calculation
  useEffect(() => {
    if (dataSource === 'SERVER' || dataSource === 'LOCAL') {
      // In full-stack mode, stats are driven directly by real host metrics from server
      return;
    }
    const interval = setInterval(() => {
      // Calculate realistic temperatures and parameters based on loadMultiplier and current processes
      const baseCpuTemp = 38;
      const baseGpuTemp = 35;
      const baseFanSpeed = 1200;
      const basePowerDraw = 42;

      // Fluctuations
      const randomNoise = (Math.random() - 0.5) * 2;

      // Multiplied results
      const nextCpuTemp = Math.round(baseCpuTemp + (loadMultiplier * 8.5) + (sensors.cpuLoad * 0.22) + randomNoise);
      const nextGpuTemp = Math.round(baseGpuTemp + (loadMultiplier * 7.2) + (sensors.cpuLoad * 0.12) + randomNoise * 0.5);
      
      // Fan speed auto adjusts based on temperature!
      let nextFanSpeed = baseFanSpeed;
      if (nextCpuTemp > 75) {
        nextFanSpeed = 4800 + Math.round(Math.random() * 200);
      } else if (nextCpuTemp > 60) {
        nextFanSpeed = 3200 + Math.round(Math.random() * 150);
      } else if (nextCpuTemp > 45) {
        nextFanSpeed = 2100 + Math.round(Math.random() * 100);
      } else {
        nextFanSpeed = 1400 + Math.round(Math.random() * 50);
      }

      const nextPowerDraw = Math.round(basePowerDraw + (loadMultiplier * 36) + (sensors.cpuLoad * 0.8) + (Math.random() - 0.5) * 4);

      // Network speeds
      const networkKbps = {
        up: Math.round(12 + Math.random() * 80 + (loadMultiplier * 15)),
        down: Math.round(110 + Math.random() * 700 + (loadMultiplier * 90)),
      };

      onUpdateSensors(prev => ({
        ...prev,
        cpuTemp: nextCpuTemp,
        gpuTemp: nextGpuTemp,
        fanSpeed: nextFanSpeed,
        powerDraw: nextPowerDraw,
        networkKbps,
      }));

      // High temperature audit
      if (nextCpuTemp >= 75) {
        if (!alertTriggered) {
          setAlertTriggered(true);
          playErrorBuzz();
        }
      } else {
        setAlertTriggered(false);
      }

    }, 2000);

    return () => clearInterval(interval);
  }, [loadMultiplier, sensors.cpuLoad, onUpdateSensors, alertTriggered]);

  const getTempColor = (temp: number) => {
    if (temp >= 75) return 'text-red-500 font-bold';
    if (temp >= 55) return 'text-amber-500';
    return 'text-emerald-400';
  };

  return (
    <div id="sensors-system-module" className="bg-zinc-900/30 border border-zinc-800 rounded-sm p-4 font-mono shadow-md relative flex flex-col h-full">

      {/* Title block */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <span>CORE_HARDWARE_SENSORS</span>
        </h2>
        <span className="text-[9px] text-emerald-450/90 font-bold bg-emerald-950/20 px-1.5 py-0.5 rounded-sm border border-emerald-900/40">BUS: I2C_NODE_8B</span>
      </div>

      {/* Warning flag */}
      {alertTriggered && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 p-2 rounded-sm text-[10.5px] mb-3 flex items-start gap-2 justify-between">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">⚠️ CRITICAL THERMAL EVENT:</span> CPU temperatures breached {sensors.cpuTemp}°C. Cooling daemon has set cooler fans to MAXIMUM overdrive output.
            </div>
          </div>
        </div>
      )}

      {/* Grid details */}
      <div className="grid grid-cols-2 gap-3 mb-4 flex-grow">
        
        {/* Sensor 1: CPU Temp & Thermic */}
        <div className="bg-zinc-950 p-3 rounded-sm border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-2">
            <span className="font-semibold uppercase">01. CPU THERMAL</span>
            <Thermometer className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div>
            <div className={`text-xl font-bold tracking-tight ${getTempColor(sensors.cpuTemp)}`}>
              {sensors.cpuTemp}°C
            </div>
            <div className="text-[9px] text-zinc-650 font-medium">THRESHOLD: 85°C</div>
          </div>
          <div className="w-full bg-zinc-900 h-1 mt-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ${sensors.cpuTemp > 75 ? 'bg-red-500' : sensors.cpuTemp > 55 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
              style={{ width: `${Math.min(100, (sensors.cpuTemp / 90) * 100)}%` }} 
            />
          </div>
        </div>

        {/* Sensor 2: GPU Temp */}
        <div className="bg-zinc-950 p-3 rounded-sm border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-2">
            <span className="font-semibold uppercase">02. GPU THERMAL</span>
            <Thermometer className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div>
            <div className={`text-xl font-bold tracking-tight ${getTempColor(sensors.gpuTemp)}`}>
              {sensors.gpuTemp}°C
            </div>
            <div className="text-[9px] text-zinc-650 font-medium">DIE_TEMP INTEL_ARC</div>
          </div>
          <div className="w-full bg-zinc-900 h-1 mt-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ${sensors.gpuTemp > 75 ? 'bg-red-500' : sensors.gpuTemp > 55 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
              style={{ width: `${Math.min(100, (sensors.gpuTemp / 90) * 100)}%` }} 
            />
          </div>
        </div>

        {/* Sensor 3: Fan RPM */}
        <div className="bg-zinc-950 p-3 rounded-sm border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-2">
            <span className="font-semibold uppercase">03. ACTIVE COOLER</span>
            <Fan className={`w-3.5 h-3.5 text-zinc-400`} />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-emerald-400">
              {sensors.fanSpeed} <span className="text-[10px] text-zinc-500 font-normal">RPM</span>
            </div>
            <div className="text-[9px] text-zinc-650 font-medium">DUTY_CYCLE: {Math.round((sensors.fanSpeed / 5400) * 100)}%</div>
          </div>
          <div className="w-full bg-zinc-900 h-1 mt-2 overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-700" 
              style={{ width: `${Math.min(100, (sensors.fanSpeed / 5400) * 100)}%` }} 
            />
          </div>
        </div>

        {/* Sensor 4: Power Consumption */}
        <div className="bg-zinc-950 p-3 rounded-sm border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-2">
            <span className="font-semibold uppercase">04. POWER DRAW</span>
            <Zap className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-emerald-400">
              {sensors.powerDraw} <span className="text-[10px] text-zinc-500 font-normal">W</span>
            </div>
            <div className="text-[9px] text-zinc-650 font-medium">V_SYS: 12.04 V_OUT</div>
          </div>
          <div className="w-full bg-zinc-900 h-1 mt-2 overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-700" 
              style={{ width: `${Math.min(100, (sensors.powerDraw / 320) * 100)}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Network Bandwidth Panel */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-sm p-2.5 mb-3 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-zinc-400" />
          <span>NET STATS:</span>
        </div>
        <div className="flex gap-4">
          <span>TX: <b className="text-emerald-400">{sensors.networkKbps.up} Kbps</b></span>
          <span>RX: <b className="text-emerald-400">{sensors.networkKbps.down} Kbps</b></span>
        </div>
      </div>

      {/* Sliders for Simulated PC workload Strain */}
      <div className="bg-zinc-950 p-3 rounded-sm border border-zinc-800 text-[11px] select-none text-zinc-350">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold flex items-center gap-1.5 text-[10px] text-zinc-400 uppercase tracking-widest"><Info className="w-3.5 h-3.5 text-zinc-400" /> SIMULATED HOST STRESS:</span>
          <span className="text-emerald-400 font-bold bg-emerald-950/20 px-1.5 py-0.5 rounded-sm border border-emerald-900/40">{loadMultiplier.toFixed(1)}x</span>
        </div>
        <input
          id="host-stress-slider"
          type="range"
          min="1.0"
          max="5.0"
          step="0.5"
          value={loadMultiplier}
          onChange={(e) => {
            const nextVal = parseFloat(e.target.value);
            setLoadMultiplier(nextVal);
            playTick();
          }}
          className="w-full bg-zinc-900 accent-emerald-500 cursor-pointer h-1.5 rounded-none mt-1"
        />
        <div className="text-[8.5px] text-zinc-500 flex justify-between mt-1.5 font-mono">
          <span>1.0x (IDLE STAT)</span>
          <span>3.0x (COMPILE MODES)</span>
          <span>5.0x (STRESS TESTING)</span>
        </div>
      </div>
    </div>
  );
}
