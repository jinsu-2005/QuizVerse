import React, { useState, useEffect } from "react";
import { db } from "../../../firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { Section, Empty, Badge } from "../../Teacher/DashboardComponents/UI.jsx";

export function ActivityLogsSection({ profile }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "activityLogs"),
          orderBy("timestamp", "desc"),
          limit(50)
        );
        const snap = await getDocs(q);
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Logs error", e);
      }
      setLoading(false);
    };
    fetchLogs();
  }, [profile]);

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500">
      <Section title="System Activity Logs" subtitle="Audit trail of critical administrative and user events.">
        
        <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2rem] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-subtle)]/50 border-b border-[var(--border-main)]">
                  <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">Timestamp</th>
                  <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">Action</th>
                  <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">Target</th>
                  <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">Performed By</th>
                  <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-[var(--text-dim)]">Decrypting logs...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={5} className="p-8"><Empty text="No activity logs found" /></td></tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-[var(--bg-subtle)]/30 transition-colors">
                      <td className="p-5 text-sm text-[var(--text-dim)] font-mono whitespace-nowrap">
                        {log.timestamp ? new Date(log.timestamp.toMillis()).toLocaleString() : "—"}
                      </td>
                      <td className="p-5">
                        <Badge variant="indigo">{log.action}</Badge>
                      </td>
                      <td className="p-5 text-sm font-semibold text-[var(--text-main)]">
                        {log.targetUserId || log.targetId || "—"}
                      </td>
                      <td className="p-5 text-sm text-[var(--text-dim)]">
                        {log.performedBy || "System"}
                      </td>
                      <td className="p-5 text-xs text-[var(--text-dim)] max-w-xs truncate">
                        {log.details || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </Section>
    </div>
  );
}
