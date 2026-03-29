import React from "react";

/**
 * Universal Theme-Aware Design System
 * Uses CSS Variables for seamless Dark/Light transitioning.
 */

export function ThemeToggle() {
  return (
    <label className="theme-toggle" htmlFor="theme-toggle" aria-label="Toggle theme">
      <input className="sr-only" type="checkbox" id="theme-toggle" />
      {/* Sun Icon — visible in dark mode (default), switches to light */}
      <svg className="icon-sun" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464l-.707-.707a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414zm2.12 10.607a1 1 0 010-1.414l.706-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" clipRule="evenodd" />
      </svg>
      {/* Moon Icon — visible in light mode */}
      <svg className="icon-moon" fill="currentColor" viewBox="0 0 20 20">
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
      </svg>
    </label>
  );
}


export function Section({ title, children, subtitle }) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col gap-1 border-b border-[var(--border-main)] pb-4">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--text-main)]">
          {title}
        </h2>
        {subtitle && <p className="text-[var(--text-dim)] text-sm">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function UserAvatar({ src, name, size = "md", verified = false }) {
  const sizeClasses = {
    sm: "h-10 w-10 text-xs",
    md: "h-16 w-16 text-lg",
    lg: "h-24 w-24 text-2xl",
    xl: "h-32 w-32 text-4xl",
  };
  
  return (
    <div className="relative inline-block">
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-[var(--border-main)] bg-[var(--bg-subtle)] flex items-center justify-center shadow-sm`}>
        {src ? (
          <img src={src} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="font-bold text-[var(--text-dim)]">{(name || "?")[0]}</span>
        )}
      </div>
      {verified && (
        <div className="absolute bottom-0 right-0 bg-emerald-500 text-white rounded-full p-1 border-2 border-[var(--bg-card)] shadow-sm">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
}

export function StatCard({ label, value, trend, icon, color = "indigo" }) {
  const dynamicBorder = {
    indigo: "border-indigo-500/10",
    emerald: "border-emerald-500/10",
    rose: "border-rose-500/10",
    amber: "border-amber-500/10",
  };

  return (
    <div className={`p-6 rounded-2xl border ${dynamicBorder[color]} bg-[var(--bg-card)] shadow-sm group hover:shadow-md transition-all`}>
       <div className="flex justify-between items-center mb-4">
          <div className="text-2xl p-2 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-main)]">{icon}</div>
          {trend && (
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
              {trend}
            </span>
          )}
       </div>
       <div className="flex flex-col">
          <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest mb-1">{label}</span>
          <span className="text-3xl font-bold text-[var(--text-main)] tracking-tight">{value}</span>
       </div>
    </div>
  );
}

export function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold text-[var(--text-dim)] uppercase tracking-wider ml-1">{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] px-4 text-sm font-medium text-[var(--text-main)] outline-none transition-all placeholder:text-[var(--text-dim)] focus:border-indigo-500 focus:bg-[var(--bg-card)]"
      />
    </div>
  );
}

export function NumberField({ label, value, onChange, min, max, onBlur }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold text-[var(--text-dim)] uppercase tracking-wider ml-1">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur && onBlur(e.target.value)}
        className="w-full h-12 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] px-4 text-sm font-medium text-[var(--text-main)] outline-none transition-all focus:border-indigo-500 focus:bg-[var(--bg-card)]"
      />
    </div>
  );
}

export function Select({ label, value, onChange, options, renderOption }) {
  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, text: renderOption ? renderOption(o) : o } : o
  );
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold text-[var(--text-dim)] uppercase tracking-wider ml-1">{label}</label>
      <div className="relative">
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none w-full h-12 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] px-4 text-sm font-medium text-[var(--text-main)] outline-none transition-all focus:border-indigo-500 focus:bg-[var(--bg-card)] cursor-pointer"
        >
          <option value="">Select {label}...</option>
          {normalized.map((o) => (
            <option key={o.value} value={o.value}>{o.text}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)] text-xs">▼</div>
      </div>
    </div>
  );
}

export function Pill({ label, value }) {
  return (
    <div className="rounded-full border border-[var(--border-main)] bg-[var(--bg-subtle)] px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)] inline-flex items-center gap-2">
      <span className="opacity-60">{label}:</span>
      <span className="text-indigo-500">{value}</span>
    </div>
  );
}

export function Badge({ children, variant = "indigo" }) {
  const variants = {
    indigo: "bg-indigo-500/10 text-indigo-500 border-indigo-500/10",
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/10",
    amber: "bg-amber-500/10 text-amber-500 border-amber-500/10",
    rose: "bg-rose-500/10 text-rose-500 border-rose-500/10",
  };
  return (
    <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${variants[variant]}`}>
      {children}
    </span>
  );
}

export function Empty({ text, icon = "🔍" }) {
  return (
    <div className="rounded-[2.5rem] border-2 border-dashed border-[var(--border-main)] bg-[var(--bg-subtle)] p-12 text-center">
      <div className="text-6xl mb-6 opacity-40">{icon}</div>
      <div className="text-[var(--text-dim)] text-sm font-bold uppercase tracking-widest max-w-xs mx-auto">{text}</div>
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-card)] p-6 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="h-12 w-12 bg-[var(--bg-subtle)] rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/4 bg-[var(--bg-subtle)] rounded" />
          <div className="h-3 w-1/2 bg-[var(--bg-subtle)] rounded opacity-50" />
        </div>
      </div>
    </div>
  );
}

export function PlaceholderView({ title }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
      <Section 
        title={title || "Infrastructure Module"} 
        subtitle="This high-level administrative interface is currently being provisioned for your workspace."
      >
        <div className="bg-[var(--bg-card)] border-2 border-dashed border-[var(--border-main)] rounded-[3rem] p-12 md:p-20 flex flex-col items-center text-center gap-8 transition-all hover:border-indigo-400">
          <div className="w-24 h-24 bg-indigo-500/10 rounded-[2rem] flex items-center justify-center text-5xl animate-bounce">
            ⚙️
          </div>
          <div className="max-w-md space-y-4">
            <h3 className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight">Provisioning in Progress</h3>
            <p className="text-[var(--text-dim)] font-medium leading-relaxed italic">
              "The {title} matrix is being synchronized with the global database. 
              Full governance capabilities will be activated shortly."
            </p>
          </div>
          <div className="flex gap-4">
             <div className="h-1.5 w-12 bg-indigo-600 rounded-full animate-pulse" />
             <div className="h-1.5 w-8 bg-indigo-400 rounded-full animate-pulse delay-75" />
             <div className="h-1.5 w-12 bg-indigo-600 rounded-full animate-pulse delay-150" />
          </div>
        </div>
      </Section>
    </div>
  );
}

export function MetricCard({ label, value, icon, color }) {
    return <StatCard label={label} value={value} icon={icon} color={color?.split('-')[1] || "indigo"} />;
}

export function KPI({ label, value }) {
    return (
        <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-6 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)] mb-1">{label}</div>
            <div className="text-2xl font-black text-[var(--text-main)]">{value}</div>
        </div>
    );
}

export function InputSmall({ value, onChange, placeholder }) {
    return (
        <div className="relative w-full">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)]">🔍</span>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full h-11 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] pl-10 pr-4 text-sm font-medium text-[var(--text-main)] outline-none focus:border-indigo-500 focus:bg-[var(--bg-card)]"
            />
        </div>
    );
}

export function SelectSmall({ value, onChange, options }) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="appearance-none h-11 min-w-[200px] rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] px-5 pr-10 text-sm font-bold text-[var(--text-main)] outline-none focus:border-indigo-500 cursor-pointer"
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.text}</option>
                ))}
            </select>
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)] text-xs">▼</div>
        </div>
    );
}
