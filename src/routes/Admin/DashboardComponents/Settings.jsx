import React from "react";
import { Section } from "../../Teacher/DashboardComponents/UI.jsx";
import { ThemeToggle } from "../../Teacher/DashboardComponents/UI.jsx";

export function SettingsSection() {
  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500">
      <Section title="Super Admin Settings" subtitle="Global configuration, role permissions, and active theme settings.">
        
        <div className="grid lg:grid-cols-2 gap-8">
          
          <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2.5rem] p-8 md:p-10 shadow-sm flex flex-col gap-6">
            <div className="border-b border-[var(--border-main)] pb-4 mb-2">
              <h3 className="text-xl font-bold text-[var(--text-main)] tracking-tight uppercase">System Config</h3>
              <p className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-widest mt-1 opacity-70">Core Platform Behavior</p>
            </div>
            
            <div className="flex justify-between items-center group bg-[var(--bg-subtle)] p-5 rounded-2xl border border-[var(--border-main)]">
               <div className="flex flex-col">
                  <span className="font-bold text-[var(--text-main)]">Maintenance Mode</span>
                  <span className="text-[10px] uppercase text-[var(--text-dim)] tracking-widest mt-1">Locks out non-admins</span>
               </div>
               <div className="w-12 h-6 bg-[var(--border-main)] rounded-full relative cursor-not-allowed opacity-50">
                  <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow"></div>
               </div>
            </div>

            <div className="flex justify-between items-center group bg-[var(--bg-subtle)] p-5 rounded-2xl border border-[var(--border-main)]">
               <div className="flex flex-col">
                  <span className="font-bold text-[var(--text-main)]">Auto-Approve Students</span>
                  <span className="text-[10px] uppercase text-[var(--text-dim)] tracking-widest mt-1">Bypass dept validation</span>
               </div>
               <div className="w-12 h-6 bg-indigo-500 rounded-full relative cursor-not-allowed opacity-50">
                  <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow"></div>
               </div>
            </div>
            
          </div>

          <div className="flex flex-col gap-8">
            <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2.5rem] p-8 md:p-10 shadow-sm flex flex-col gap-6 h-fit">
              <div className="border-b border-[var(--border-main)] pb-4 mb-2">
                <h3 className="text-xl font-bold text-[var(--text-main)] tracking-tight uppercase">Theme Settings</h3>
                <p className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-widest mt-1 opacity-70">Global Administrator View</p>
              </div>
              <div className="flex justify-between items-center bg-[var(--bg-subtle)] p-6 rounded-2xl border border-[var(--border-main)]">
                <span className="font-bold text-[var(--text-main)] uppercase tracking-widest text-xs">Toggle Active Interface Mode</span>
                <ThemeToggle />
              </div>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2.5rem] p-8 md:p-10 shadow-sm flex flex-col gap-6">
              <div className="border-b border-[var(--border-main)] pb-4 mb-2">
                <h3 className="text-xl font-bold text-[var(--text-main)] tracking-tight uppercase">Security Defaults</h3>
                <p className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-widest mt-1 opacity-70">Data access thresholds</p>
              </div>
              <p className="text-sm font-semibold text-[var(--text-dim)] leading-relaxed bg-amber-500/10 text-amber-600 p-4 rounded-xl border border-amber-500/20">
                 Role permissions and database structures are currently strictly governed by the master <code className="font-bold px-1 bg-amber-500/20 rounded">firestore.rules</code> deployment. To augment access rules, please update the global deployment script directly.
              </p>
            </div>
          </div>

        </div>
      </Section>
    </div>
  );
}
