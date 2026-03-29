
export function fmtDate(ts) {
  if (!ts) return "";
  try {
    if (typeof ts === "object" && typeof ts.toDate === "function") {
      return ts.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }
    if (typeof ts === "object" && typeof ts.toMillis === "function") {
      return new Date(ts.toMillis()).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch (e) {
    return "";
  }
}

export const DEPARTMENTS = [
  { label: "Information Technology (IT)", value: "IT" },
  { label: "Computer Science and Engineering (CSE)", value: "CSE" },
  { label: "Electronics and Communication Engineering (ECE)", value: "ECE" },
  { label: "Electrical and Electronics Engineering (EEE)", value: "EEE" },
  { label: "Mechanical Engineering (MECH)", value: "MECH" },
  { label: "Civil Engineering (CIVIL)", value: "CIVIL" },
  { label: "Artificial Intelligence and Data Science (AIDS)", value: "AIDS" },
  { label: "Artificial Intelligence and Machine Learning (AIML)", value: "AIML" },
];

export const ACADEMIC_YEARS = ["2022 - 2026", "2023 - 2027", "2024 - 2028", "2025 - 2029"];
export const MIN_Q = 1, MAX_Q = 100;
export const MIN_OPT = 2, MAX_OPT = 10;
export const MIN_ATTEMPTS = 0, MAX_ATTEMPTS = 5;
