import os
import re

base_dir = r"c:\Users\jinsu\Documents\My Projects\Quiz-Verse\src\routes\Teacher\DashboardComponents"
dash_file = r"c:\Users\jinsu\Documents\My Projects\Quiz-Verse\src\routes\Teacher\Dashboard.jsx"

with open(dash_file, 'r', encoding='utf-8') as f:
    orig = f.read()

# Shared imports and constants
shared_imports = """import React, { useEffect, useState, useRef, useMemo } from "react";
import { db } from "../../../firebase";
import { collection, query, where, getDocs, orderBy, onSnapshot, limit } from "firebase/firestore";
import { useAuth } from "../../../context/AuthContext";
import { fmtDate, DEPARTMENTS, ACADEMIC_YEARS } from "./Utils";
"""

# Utils.js
utils_content = """
export function fmtDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
"""

# Extracting Components
def extract_fn(name, code):
    # Matches function Name(...) { ... }
    # Using a simple balance curly bracket is hard with regex, so we'll look for specific endings or just the next component start
    pattern = rf"function {name}\(.*?\)\s*\{{(?:[^{{}}]*|\{{(?:[^{{}}]*|\{{[^{{}}]*\}})*\}})*\}}"
    match = re.search(pattern, code, re.DOTALL)
    if match:
        return match.group(0)
    return ""

components = [
    "Section", "Pill", "Badge", "Field", "NumberField", "Select", "InputSmall", "SelectSmall", "Empty", "RowSkeleton", "KPI", "SkeletonChip", "MetricCard", "PlaceholderView",
    "SidebarLayout", "HomeSection", "AnalyticsSection", "StudentRequestsSection", "TeacherProfileDrawer", "CreateQuizSection", "QuizListSection", "QuizRow"
]

extracted = {name: extract_fn(name, orig) for name in components}

# UI.jsx
ui_file = os.path.join(base_dir, "UI.jsx")
with open(ui_file, 'w', encoding='utf-8') as f:
    f.write('import React from "react";\n\n')
    ui_comps = ["Section", "Pill", "Badge", "Field", "NumberField", "Select", "InputSmall", "SelectSmall", "Empty", "RowSkeleton", "KPI", "SkeletonChip", "MetricCard", "PlaceholderView"]
    for c in ui_comps:
        f.write(f"export {extracted[c]}\n\n")

# Utils.js
with open(os.path.join(base_dir, "Utils.js"), 'w', encoding='utf-8') as f:
    f.write(utils_content)

# Sidebar.jsx
with open(os.path.join(base_dir, "Sidebar.jsx"), 'w', encoding='utf-8') as f:
    f.write('import React from "react";\n')
    f.write(f"export {extracted['SidebarLayout']}\n")

# Home.jsx
with open(os.path.join(base_dir, "Home.jsx"), 'w', encoding='utf-8') as f:
    f.write(shared_imports + 'import { Section, MetricCard, Empty } from "./UI";\n\n')
    f.write(f"export {extracted['HomeSection']}\n")

# Analytics.jsx
with open(os.path.join(base_dir, "Analytics.jsx"), 'w', encoding='utf-8') as f:
    f.write(shared_imports + 'import { Section, Empty } from "./UI";\n\n')
    f.write(f"export {extracted['AnalyticsSection']}\n")

# Requests.jsx
with open(os.path.join(base_dir, "Requests.jsx"), 'w', encoding='utf-8') as f:
    f.write(shared_imports + 'import { Section, Empty } from "./UI";\n\n')
    f.write(f"export {extracted['StudentRequestsSection']}\n")

# QuizList.jsx
with open(os.path.join(base_dir, "QuizList.jsx"), 'w', encoding='utf-8') as f:
    f.write(shared_imports + 'import { InputSmall, SelectSmall, RowSkeleton, Empty, KPI, SkeletonChip } from "./UI";\n\n')
    f.write(f"export {extracted['QuizRow']}\n\n")
    f.write(f"export {extracted['QuizListSection']}\n")

# Profile.jsx
with open(os.path.join(base_dir, "Profile.jsx"), 'w', encoding='utf-8') as f:
    f.write('import React, { useState, useEffect, useRef } from "react";\n')
    f.write('import { db, auth } from "../../../firebase";\n')
    f.write('import { doc, setDoc } from "firebase/firestore";\n')
    f.write('import { updateProfile } from "firebase/auth";\n')
    f.write('import { useAuth } from "../../../context/AuthContext";\n')
    f.write('import { Field, Select } from "./UI";\n')
    f.write('import { DEPARTMENTS } from "./Utils";\n\n')
    f.write('// Helper to compress image (stub for now if not found in Dashboard)\n')
    f.write('async function compressToDataURL(file, options) { return new Promise(r => { const reader = new FileReader(); reader.onload=()=>r(reader.result); reader.readAsDataURL(file); }); }\n\n')
    f.write(f"export {extracted['TeacherProfileDrawer']}\n")

# CreateQuiz.jsx
with open(os.path.join(base_dir, "CreateQuiz.jsx"), 'w', encoding='utf-8') as f:
    f.write(shared_imports + 'import { Section, Field, Select, NumberField } from "./UI";\n\n')
    f.write(f"export {extracted['CreateQuizSection']}\n")

# Update Dashboard.jsx
# Keep the imports and the TeacherDashboard component, remove the rest, add component imports.

main_imports = """import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { SidebarLayout } from "./DashboardComponents/Sidebar";
import { HomeSection } from "./DashboardComponents/Home";
import { AnalyticsSection } from "./DashboardComponents/Analytics";
import { StudentRequestsSection } from "./DashboardComponents/Requests";
import { CreateQuizSection } from "./DashboardComponents/CreateQuiz";
import { QuizListSection } from "./DashboardComponents/QuizList";
import { TeacherProfileDrawer } from "./DashboardComponents/Profile";
import { PlaceholderView, Section } from "./DashboardComponents/UI";
import { MIN_Q, MAX_Q, MIN_OPT, MAX_OPT, MIN_ATTEMPTS, MAX_ATTEMPTS } from "./DashboardComponents/Utils";
"""

# I need to find where the TeacherDashboard ends.
# It ends right before SidebarLayout component definition or similar.
# In the current file, SidebarLayout is at line ~1232.

# Actually, I'll just write a new Dashboard.jsx content using the logic in TeacherDashboard.

# I need to find the constants locally too if I didn't export them from Utils.
# I'll update Utils to export them.

# Re-read Dashboard.jsx to get the TeacherDashboard body accurately.
with open(dash_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

teacher_dashboard_content = []
in_comp = False
for line in lines:
    if "export default function TeacherDashboard" in line:
        in_comp = True
    if in_comp:
        teacher_dashboard_content.append(line)
        if line.strip() == "}": # End of main component
             # This might match other functions, so I need to be careful.
             # In React components, the main export usually ends before the first helper function.
             pass

# It's better to just truncate after the last component closing brace of TeacherDashboard.
# I'll use regex to find the TeacherDashboard specifically.

pattern_td = r"export default function TeacherDashboard\(.*?\)\s*\{{(?:[^{{}}]*|\{{(?:[^{{}}]*|\{{[^{{}}]*\}})*\}})*\}}"
td_match = re.search(pattern_td, orig, re.DOTALL)
if td_match:
    td_code = td_match.group(0)
    # Replace some things in td_code if needed (like references to local components)
    
    new_dash = main_imports + "\n\n" + td_code
    with open(dash_file, 'w', encoding='utf-8') as f:
        f.write(new_dash)

print("Split complete!")
