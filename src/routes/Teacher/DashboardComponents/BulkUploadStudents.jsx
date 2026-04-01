import React, { useState } from "react";
import { db, firebaseConfig } from "../../../firebase";
import { collection, doc, setDoc, serverTimestamp, addDoc } from "firebase/firestore";

export function BulkUploadStudents({ profile, onComplete, onClose }) {
  const [csvContent, setCsvContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => setCsvContent(evt.target.result);
    reader.readAsText(file);
  };

  const processCsv = async () => {
    if (!csvContent) return;
    setLoading(true);
    setLogs(["Parsing CSV Data..."]);
    
    // Simple CSV parser
    const rows = csvContent.split("\n").map(r => r.trim()).filter(r => r);
    if(rows.length < 2) {
       setLogs(prev => [...prev, "Error: CSV must contain a header row and at least one user."]);
       setLoading(false);
       return;
    }

    const headers = rows[0].split(",").map(h => h.trim().toLowerCase());
    const required = ["name", "email", "department", "regno", "academicyear", "yearofstudy"];
    
    const missing = required.filter(r => !headers.includes(r));
    if (missing.length > 0) {
       setLogs(prev => [...prev, `Error: Missing required headers: ${missing.join(", ")}`]);
       setLoading(false);
       return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 1; i < rows.length; i++) {
         const cols = rows[i].split(",").map(c => c.trim());
         const data = {};
         headers.forEach((h, idx) => { data[h] = cols[idx] || ""; });

         if (!data.email || !data.name) continue;

         setLogs(prev => [`Processing ${data.name} (${data.email})...`, ...prev]);

         try {
            // Assign default password "Student@123" via stateless REST API
            const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: data.email,
                password: "Student@123",
                returnSecureToken: true
              })
            });

            const resData = await response.json();
            if (!response.ok) {
              throw new Error(resData.error.message || "Failed Auth Creation");
            }
            
            const newUid = resData.localId;
            
            const payload = {
              email: data.email,
              name: data.name,
              role: "student",
              department: data.department.toUpperCase(),
              institute: "Ponjesly College of Engineering",
              verified: false,
              regNo: data.regno,
              academicYear: data.academicyear,
              yearOfStudy: data.yearofstudy,
              createdAt: serverTimestamp(),
            };

            await setDoc(doc(db, "users", newUid), payload);
            successCount++;

            // Wait 500ms to avoid auth/too-many-requests
            await new Promise(resolve => setTimeout(resolve, 500)); 
         } catch (err) {
            setLogs(prev => [`Failed for ${data.email}: ${err.message}`, ...prev]);
            errorCount++;
         }
      }

      setLogs(prev => [`Batch complete! Created: ${successCount}, Failed: ${errorCount}.`, ...prev]);
      
      // Log aggregate activity
      await addDoc(collection(db, "activityLogs"), {
        action: "bulk_upload_students",
        performedBy: profile.uid || "admin",
        details: `Bulk uploaded ${successCount} students via CSV.`,
        timestamp: serverTimestamp()
      });

    } catch (e) {
      setLogs(prev => [`Fatal initialization error: ${e.message}`, ...prev]);
    } finally {
      setLoading(false);
      setTimeout(() => { if(onComplete) onComplete(); }, 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-main)] shadow-2xl overflow-hidden w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-[var(--border-main)] flex justify-between items-center bg-[var(--bg-subtle)]/30">
          <div className="flex flex-col gap-1">
             <h2 className="text-2xl font-bold tracking-tight text-[var(--text-main)] uppercase">Bulk Student Uplink</h2>
             <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest">CSV Data Ingestion Engine</span>
          </div>
          <button onClick={onClose} disabled={loading} className="text-[var(--text-dim)] hover:text-rose-500 outline-none text-2xl w-8 h-8 flex items-center justify-center transition-colors disabled:opacity-50">&times;</button>
        </div>
        
        <div className="p-8 flex flex-col gap-6 overflow-y-auto">
          
          <div className="p-4 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-2xl flex flex-col gap-2">
             <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-widest text-indigo-500">Required CSV format:</span>
             <code className="text-[10px] bg-black/20 p-2 rounded-lg text-[var(--text-dim)] font-mono whitespace-pre-wrap">
               name, email, department, regno, academicyear, yearofstudy{'\n'}
               John Doe, john@mail.com, CSE, 961821000, 2023-2027, 2nd Year
             </code>
             <span className="text-[10px] font-bold mt-2 text-rose-500 opacity-80 uppercase">Warning: Ensure the CSV uses exact header casing/spelling. All users will auto-assign 'Student@123' as temporary auth token.</span>
          </div>

          <div className="flex flex-col gap-4">
             <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-[var(--text-dim)] border-dashed rounded-2xl cursor-pointer hover:bg-[var(--bg-subtle)] hover:border-indigo-500 transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                   <svg className="w-8 h-8 mb-4 text-[var(--text-dim)]" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                       <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                   </svg>
                   <p className="mb-2 text-sm text-[var(--text-main)] font-bold"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                   <p className="text-xs text-[var(--text-dim)] uppercase tracking-widest font-bold">CSV Array Documents</p>
                </div>
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={loading} />
             </label>
             {csvContent && (
                <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest text-center bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                   File Injected • Payload Ready
                </div>
             )}
          </div>

          <button 
             onClick={processCsv} 
             disabled={loading || !csvContent}
             className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
             {loading ? "EXECUTING BATCH DEPLOYMENT..." : "START SYSTEM UPLOAD"}
          </button>

          {logs.length > 0 && (
             <div className="bg-black/40 border border-[var(--border-main)] rounded-2xl p-4 flex flex-col gap-1 max-h-40 overflow-y-auto">
                <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest mb-2 border-b border-[var(--border-main)] pb-2">Terminal Logs</span>
                {logs.map((L, idx) => (
                   <span key={idx} className={`text-[10px] font-mono leading-tight ${L.includes("Failed") || L.includes("Error") ? 'text-rose-400' : L.includes("complete") ? 'text-emerald-400' : 'text-[var(--text-dim)]'}`}>
                      {L}
                   </span>
                ))}
             </div>
          )}

        </div>
      </div>
    </div>
  );
}
