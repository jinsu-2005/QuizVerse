import React, { useState } from "react";
import { auth, db } from "../../firebase";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import {
  doc, setDoc, updateDoc, serverTimestamp,
  collection, query, where, getDocs,
} from "firebase/firestore";

const TEST_USERS = [
  {
    email:    "jinsu.j@quizverse.com",
    password: "admin@2005",
    data: {
      name:       "Super Admin (Jinsu)",
      role:       "super_admin",
      verified:   true,
    },
  },
];

export default function SeedUsers() {
  const [lines,  setLines]  = useState([]);
  const [busy,   setBusy]   = useState(false);

  const log = (msg, type = "info") =>
    setLines((prev) => [...prev, { msg, type }]);

  // ── Find Firestore UID by email ──────────────────────────────────
  const findUid = async (email) => {
    const snap = await getDocs(
      query(collection(db, "users"), where("email", "==", email))
    );
    return snap.empty ? null : snap.docs[0].id;
  };

  // ── Full seed (create or smart-update) ───────────────────────────
  const doSeed = async () => {
    setBusy(true);
    setLines([]);
    try {
      for (const u of TEST_USERS) {
        log(`⏳  Processing ${u.email}…`);
        await signOut(auth);

        try {
          // Try creating a new Firebase Auth account
          const res = await createUserWithEmailAndPassword(auth, u.email, u.password);
          await setDoc(doc(db, "users", res.user.uid), {
            ...u.data,
            email:     u.email,
            createdAt: serverTimestamp(),
          });
          log(`✅  Created fresh account: ${u.email}`, "success");
        } catch (authErr) {
          if (authErr.code !== "auth/email-already-in-use") throw authErr;

          // Account exists → find Firestore doc and force-update
          log(`ℹ️  Account exists, resetting: ${u.email}`);
          const uid = await findUid(u.email);
          if (uid) {
            await setDoc(doc(db, "users", uid), {
              ...u.data,
              email:     u.email,
              updatedAt: serverTimestamp(),
            }, { merge: true });
            log(`✅  Reset existing account: ${u.email}`, "success");
          } else {
            log(`⚠️  No Firestore doc found for ${u.email} — create via Firebase Console`, "warn");
          }
        }
      }
      log("🎉  All done! Ready to test.", "success");
    } catch (err) {
      log(`❌  ${err.message}`, "error");
      console.error(err);
    } finally {
      await signOut(auth).catch(() => {});
      setBusy(false);
    }
  };

  // ── Reset-only: sign in as TEACHER (has Firestore update rights over all users)
  // then reset ALL user docs from that single session. This avoids issues with
  // blocked student accounts (auth/too-many-requests).
  const doReset = async () => {
    setBusy(true);
    setLines([]);

    const teacher = TEST_USERS.find(u => u.data.role === "teacher");
    if (!teacher) { log("❌  No teacher user configured in TEST_USERS.", "error"); setBusy(false); return; }

    try {
      // 1. Sign in as teacher
      log(`⏳  Signing in as teacher (${teacher.email})…`);
      const { signInWithEmailAndPassword: _siwep } = await import("firebase/auth");
      const cred = await _siwep(auth, teacher.email, teacher.password);
      log(`✅  Signed in as teacher.`, "success");

      // 2. Reset own (teacher) doc
      await updateDoc(doc(db, "users", cred.user.uid), { verified: false, verifiedAt: null });
      log(`✅  Reset teacher: ${teacher.email}`, "success");

      // 3. Reset all other users by finding their Firestore doc
      for (const u of TEST_USERS) {
        if (u.email === teacher.email) continue; // already done above
        log(`⏳  Resetting ${u.email} via teacher permissions…`);
        const uid = await findUid(u.email);
        if (uid) {
          await updateDoc(doc(db, "users", uid), { verified: false, verifiedAt: null });
          log(`✅  Reset: ${u.email}`, "success");
        } else {
          log(`⚠️  No Firestore doc found for ${u.email}. Run Full Seed first.`, "warn");
        }
      }

      log("🔄  Reset complete — all users will see /verify on next login.", "success");
    } catch (err) {
      if (err.code === "auth/too-many-requests") {
        log(`❌  Teacher account temporarily blocked by Firebase (too many attempts). Wait a few minutes and try again.`, "error");
      } else {
        log(`❌  ${err.message}`, "error");
      }
    } finally {
      await signOut(auth).catch(() => {});
      setBusy(false);
    }
  };

  const COLOR = {
    info:    "#7fa8d0",
    success: "#22c55e",
    warn:    "#f59e0b",
    error:   "#ef4444",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#060e1c 0%,#0c1e3a 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "2rem", fontFamily: "monospace",
    }}>
      <h1 style={{ color: "#4d9ef5", fontSize: "1.6rem", fontWeight: 900,
        letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.25rem" }}>
        🧪 Seed Workspace
      </h1>
      <p style={{ color: "#7fa8d0", fontSize: "0.78rem", marginBottom: "2rem", textAlign: "center" }}>
        Creates / resets test accounts for QuizVerse
      </p>

      {/* User Cards */}
      <div style={{ display: "grid", gap: "1rem", marginBottom: "2rem", width: "100%", maxWidth: "480px" }}>
        {TEST_USERS.map((u) => (
          <div key={u.email} style={{
            background: "rgba(11,22,40,0.85)", border: "1px solid rgba(100,160,220,0.12)",
            borderRadius: "1rem", padding: "1rem 1.25rem",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
              <span style={{
                fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase",
                letterSpacing: "0.1em", color: "#4d9ef5",
                background: "rgba(45,127,234,0.15)", padding: "2px 8px", borderRadius: "999px",
              }}>{u.data.role}</span>
              <span style={{ fontSize: "0.65rem", color: "#3d6080" }}>verified: false</span>
            </div>
            <div style={{ color: "#e8f0fe", fontWeight: 700, fontSize: "0.95rem", marginBottom: "2px" }}>
              {u.data.regNo || u.data.collegeId}
            </div>
            <div style={{ color: "#3d6080", fontSize: "0.72rem" }}>{u.email}</div>
            <div style={{ color: "#3d6080", fontSize: "0.72rem" }}>pw: {u.password}</div>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={doSeed} disabled={busy} style={{
          padding: "0.75rem 1.75rem", borderRadius: "999px", border: "none",
          background: "linear-gradient(135deg,#2d7fea,#4d9ef5)",
          color: "#fff", fontWeight: 800, fontSize: "0.8rem", textTransform: "uppercase",
          letterSpacing: "0.08em", cursor: busy ? "not-allowed" : "pointer",
          opacity: busy ? 0.5 : 1, boxShadow: "0 4px 16px rgba(45,127,234,0.35)",
        }}>
          {busy ? "Working…" : "🌱 Full Seed"}
        </button>
        <button onClick={doReset} disabled={busy} style={{
          padding: "0.75rem 1.75rem", borderRadius: "999px",
          border: "1.5px solid rgba(100,160,220,0.25)",
          background: "transparent", color: "#7fa8d0",
          fontWeight: 800, fontSize: "0.8rem", textTransform: "uppercase",
          letterSpacing: "0.08em", cursor: busy ? "not-allowed" : "pointer",
          opacity: busy ? 0.5 : 1,
        }}>
          🔄 Reset verified only
        </button>
      </div>

      {/* Log output */}
      {lines.length > 0 && (
        <div style={{
          width: "100%", maxWidth: "480px", background: "rgba(0,0,0,0.4)",
          border: "1px solid rgba(100,160,220,0.1)", borderRadius: "1rem",
          padding: "1rem", display: "flex", flexDirection: "column", gap: "4px",
        }}>
          {lines.map((l, i) => (
            <div key={i} style={{ fontSize: "0.72rem", color: COLOR[l.type], fontFamily: "monospace" }}>
              {l.msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
