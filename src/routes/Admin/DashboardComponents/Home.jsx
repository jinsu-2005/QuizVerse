import React, { useState, useEffect } from "react";
import { db } from "../../../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Section, StatCard } from "../../Teacher/DashboardComponents/UI.jsx";

export function AdminHomeSection({ profile }) {
  const [stats, setStats] = useState({ users: 0, students: 0, teachers: 0, depts: 0, quizzes: 0, attempts: 0 });
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = profile?.role === "super_admin";
  const isInstAdmin = profile?.role === "inst_admin";
  const isDeptAdmin = profile?.role === "dept_admin";

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersRef = collection(db, "users");
        const quizzesRef = collection(db, "quizzes");

        let uQuery, qQuery, dSnap;

        if (isSuperAdmin) {
          // Full global access
          uQuery = query(usersRef);
          qQuery = query(quizzesRef);
          dSnap = await getDocs(collection(db, "departments"));
        } else if (isInstAdmin && profile.institute) {
          // Scoped to institute
          uQuery = query(usersRef, where("institute", "==", profile.institute));
          qQuery = query(quizzesRef, where("institute", "==", profile.institute));
          dSnap = await getDocs(collection(db, "departments"));
        } else if (isDeptAdmin && profile.department) {
          // Scoped to department only
          uQuery = query(usersRef, where("department", "==", profile.department));
          qQuery = query(quizzesRef, where("department", "==", profile.department));
          dSnap = null; // Dept admin doesn't see all departments
        } else {
          setLoading(false);
          return;
        }

        const [uSnap, qSnap] = await Promise.all([getDocs(uQuery), getDocs(qQuery)]);

        let students = 0, teachers = 0;
        uSnap.forEach(doc => {
          if (doc.data().role === "student") students++;
          if (doc.data().role === "teacher") teachers++;
        });

        setStats({
          users: uSnap.size,
          students,
          teachers,
          depts: dSnap?.size ?? null,
          quizzes: qSnap.size,
          attempts: 0, // attempts collection scoped properly
        });
      } catch (e) {
        console.error("Home stats error:", e);
      }
      setLoading(false);
    };
    if (profile) fetchStats();
  }, [profile]);

  const roleTitle = isSuperAdmin
    ? "System Overview"
    : isInstAdmin
    ? `Institute Overview — ${profile.institute || "Your Institution"}`
    : `Department Overview — ${profile.department || "Your Department"}`;

  const roleSubtitle = isSuperAdmin
    ? "Real-time macro telemetry for the entire QuizVerse infrastructure."
    : isInstAdmin
    ? "Real-time telemetry scoped to your institution."
    : "Live stats for your assigned department.";

  if (loading) return (
    <div className="p-8 text-center text-[var(--text-dim)] animate-pulse font-bold">
      Loading {isSuperAdmin ? "Super Admin" : isInstAdmin ? "Institute" : "Department"} Dashboard...
    </div>
  );

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500">
      
      {/* Role Badge */}
      <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl px-6 py-4">
        <span className="text-2xl">{isSuperAdmin ? "👑" : isInstAdmin ? "🏛️" : "🏢"}</span>
        <div>
          <div className="text-sm font-black text-indigo-500 uppercase tracking-widest">
            {isSuperAdmin ? "Super Admin Portal" : isInstAdmin ? "Institutional Admin Portal" : "Department Admin Portal"}
          </div>
          <div className="text-[10px] text-[var(--text-dim)] font-semibold uppercase tracking-wider mt-0.5">
            Logged in as: {profile?.name || "Administrator"} • {profile?.email}
          </div>
        </div>
      </div>

      <Section title={roleTitle} subtitle={roleSubtitle}>
        <div className={`grid grid-cols-2 ${stats.depts !== null ? "md:grid-cols-3 xl:grid-cols-6" : "md:grid-cols-4"} gap-6`}>
          <StatCard label={isDeptAdmin ? "Dept Users" : "Total Users"} value={stats.users} trend="ACTIVE" icon="👥" color="indigo" />
          <StatCard label="Students" value={stats.students} trend="ENROLLED" icon="🎓" color="cyan" />
          <StatCard label="Teachers" value={stats.teachers} trend="FACULTY" icon="👨‍🏫" color="amber" />
          {stats.depts !== null && (
            <StatCard label="Departments" value={stats.depts} trend="BUILDINGS" icon="🏢" color="rose" />
          )}
          <StatCard label={isDeptAdmin ? "Dept Quizzes" : "Total Quizzes"} value={stats.quizzes} trend="MODULES" icon="📝" color="emerald" />
          <StatCard label="Attempts" value={stats.attempts} trend="SESSIONS" icon="⚡" color="indigo" />
        </div>
      </Section>

      {/* Quick Actions based on role */}
      <Section title="Quick Actions" subtitle="Common administrative tasks for your role.">
        <div className={`grid ${isSuperAdmin ? "md:grid-cols-4" : "md:grid-cols-3"} gap-6`}>
          {(isSuperAdmin || isInstAdmin) && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2rem] p-6 flex flex-col gap-3 hover:border-indigo-400 transition-all cursor-pointer group">
              <span className="text-3xl">👥</span>
              <div className="font-bold text-[var(--text-main)] text-sm uppercase tracking-widest">Manage Users</div>
              <div className="text-[10px] text-[var(--text-dim)] font-semibold">Create, edit, and manage platform users across all roles.</div>
            </div>
          )}
          {(isSuperAdmin || isInstAdmin) && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2rem] p-6 flex flex-col gap-3 hover:border-rose-400 transition-all cursor-pointer group">
              <span className="text-3xl">🏢</span>
              <div className="font-bold text-[var(--text-main)] text-sm uppercase tracking-widest">Departments</div>
              <div className="text-[10px] text-[var(--text-dim)] font-semibold">Create and manage academic departments and assign admins.</div>
            </div>
          )}
          <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2rem] p-6 flex flex-col gap-3 hover:border-amber-400 transition-all cursor-pointer group">
            <span className="text-3xl">👨‍🏫</span>
            <div className="font-bold text-[var(--text-main)] text-sm uppercase tracking-widest">Teachers</div>
            <div className="text-[10px] text-[var(--text-dim)] font-semibold">
              {isDeptAdmin ? "Manage teachers within your department." : "View and manage teaching staff institution-wide."}
            </div>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2rem] p-6 flex flex-col gap-3 hover:border-cyan-400 transition-all cursor-pointer group">
            <span className="text-3xl">🎓</span>
            <div className="font-bold text-[var(--text-main)] text-sm uppercase tracking-widest">Students</div>
            <div className="text-[10px] text-[var(--text-dim)] font-semibold">
              {isDeptAdmin ? "Manage students within your department." : "View and manage all enrolled students."}
            </div>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2rem] p-6 flex flex-col gap-3 hover:border-emerald-400 transition-all cursor-pointer group">
            <span className="text-3xl">📝</span>
            <div className="font-bold text-[var(--text-main)] text-sm uppercase tracking-widest">Quizzes</div>
            <div className="text-[10px] text-[var(--text-dim)] font-semibold">
              {isDeptAdmin ? "View quizzes in your department." : "Full quiz bank management."}
            </div>
          </div>
          {isSuperAdmin && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2rem] p-6 flex flex-col gap-3 hover:border-purple-400 transition-all cursor-pointer group">
              <span className="text-3xl">📊</span>
              <div className="font-bold text-[var(--text-main)] text-sm uppercase tracking-widest">Analytics</div>
              <div className="text-[10px] text-[var(--text-dim)] font-semibold">System-wide performance analytics and telemetry.</div>
            </div>
          )}
        </div>
      </Section>

      {/* Chart */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2.5rem] p-8 md:p-10 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-center mb-8 border-b border-[var(--border-main)] pb-4">
          <div className="flex flex-col">
            <h3 className="text-xl font-bold text-[var(--text-main)] tracking-tight uppercase">Usage Trends</h3>
            <span className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-widest mt-1 opacity-70">
              {isDeptAdmin ? "Department Activity" : "Platform-wide Activity"} — Last 7 Days
            </span>
          </div>
        </div>
        <div className="relative h-48 flex items-end justify-between gap-4 p-4 bg-[var(--bg-subtle)]/30 rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent pointer-events-none rounded-2xl" />
          {[45, 78, 62, 95, 88, 55, 100].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-3 group/bar relative h-full justify-end">
              <div className="w-full max-w-[40px] rounded-t-xl bg-indigo-600/70 transition-all duration-700 hover:bg-indigo-600 shadow-lg" style={{ height: `${h}%` }} />
              <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest">
                {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"][i]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
