import os
import re

base_dir = r"c:\Users\jinsu\Documents\My Projects\Quiz-Verse\src\routes\Teacher\DashboardComponents"
dash_file = r"c:\Users\jinsu\Documents\My Projects\Quiz-Verse\src\routes\Teacher\Dashboard.jsx"

if not os.path.exists(base_dir):
    os.makedirs(base_dir)

with open(dash_file, 'r', encoding='utf-8') as f:
    orig = f.read()

def get_component(name, code):
    # Regex to find function Name(...) { ... }
    # This matches top-level functions
    pattern = rf"^function {name}\b[\s\S]*?^\}}"
    match = re.search(pattern, code, re.MULTILINE)
    if match:
        return match.group(0)
    # Try without the ^ for nested or if it's not start of line
    pattern2 = rf"function {name}\b[\s\S]*?\n\}}"
    match = re.search(pattern2, code)
    if match:
        return match.group(0)
    return None

components = [
    "Section", "Pill", "Badge", "Field", "NumberField", "Select", "InputSmall", "SelectSmall", "Empty", "RowSkeleton", "KPI", "SkeletonChip", "MetricCard", "PlaceholderView",
    "SidebarLayout", "HomeSection", "AnalyticsSection", "StudentRequestsSection", "TeacherProfileDrawer", "CreateQuizSection", "QuizListSection", "QuizRow"
]

extracted = {}
for c in components:
    res = get_component(c, orig)
    if res:
        extracted[c] = res
    else:
        print(f"FAILED TO EXTRACT: {c}")

# UI.jsx
with open(os.path.join(base_dir, "UI.jsx"), 'w', encoding='utf-8') as f:
    f.write('import React from "react";\n\n')
    ui_comps = ["Section", "Pill", "Badge", "Field", "NumberField", "Select", "InputSmall", "SelectSmall", "Empty", "RowSkeleton", "KPI", "SkeletonChip", "MetricCard", "PlaceholderView"]
    for c in ui_comps:
        if c in extracted:
            f.write(f"export {extracted[c]}\n\n")

# Utils.js
utils_content = """
export function fmtDate(ts) {
  if (!ts) return "";
  try {
    if (typeof ts === "object" && typeof ts.toDate === "function") return ts.toDate().toLocaleString();
    if (typeof ts === "object" && typeof ts.toMillis === "function") return new Date(ts.toMillis()).toLocaleString();
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString();
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
"""
with open(os.path.join(base_dir, "Utils.js"), 'w', encoding='utf-8') as f:
    f.write(utils_content)

# Helpers
helpers_content = """
export async function compressToDataURL(file, { maxWidth = 512, maxHeight = 512, quality = 0.8, mimeType = "image/jpeg" } = {}) {
  const img = await fileToImage(file);
  const { width, height } = scaleToFit(img.width, img.height, maxWidth, maxHeight);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL(mimeType, quality);
}
function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function scaleToFit(w, h, maxW, maxH) {
  if (w <= maxW && h <= maxH) return { width: w, height: h };
  const ratio = Math.min(maxW / w, maxH / h);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}
"""
with open(os.path.join(base_dir, "Helpers.js"), 'w', encoding='utf-8') as f:
    f.write(helpers_content)

# Shared imports
shared_imports = """import React, { useEffect, useState, useRef, useMemo } from "react";
import { db } from "../../../firebase";
import { collection, query, where, getDocs, orderBy, onSnapshot, limit, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { useAuth } from "../../../context/AuthContext";
import { fmtDate, DEPARTMENTS, ACADEMIC_YEARS } from "./Utils";
"""

def write_comp(name, filename, extra_imports=""):
    if name in extracted:
        with open(os.path.join(base_dir, filename), 'w', encoding='utf-8') as f:
            f.write(shared_imports + extra_imports + "\n\n")
            f.write(f"export {extracted[name]}\n")

write_comp("SidebarLayout", "Sidebar.jsx")
write_comp("HomeSection", "Home.jsx", 'import { Section, MetricCard, Empty } from "./UI";')
write_comp("AnalyticsSection", "Analytics.jsx", 'import { Section, Empty } from "./UI";')
write_comp("StudentRequestsSection", "Requests.jsx", 'import { Section, Empty } from "./UI";')
write_comp("CreateQuizSection", "CreateQuiz.jsx", 'import { Section, Field, Select, NumberField } from "./UI";')
write_comp("TeacherProfileDrawer", "Profile.jsx", 'import { Field, Select } from "./UI";\nimport { compressToDataURL } from "./Helpers";\nimport { auth } from "../../../firebase";\nimport { updateProfile } from "firebase/auth";')

# QuizList.jsx (multiple)
if "QuizListSection" in extracted and "QuizRow" in extracted:
    with open(os.path.join(base_dir, "QuizList.jsx"), 'w', encoding='utf-8') as f:
        f.write(shared_imports + 'import { InputSmall, SelectSmall, RowSkeleton, Empty, KPI, SkeletonChip, Section } from "./UI";\n\n')
        f.write(f"export {extracted['QuizRow']}\n\n")
        f.write(f"export {extracted['QuizListSection']}\n")

# Main Dashboard.jsx
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

pattern_td = r"export default function TeacherDashboard\(.*?\)\s*\{{(?:[^{{}}]*|\{{(?:[^{{}}]*|\{{[^{{}}]*\}})*\}})*\}}"
td_match = re.search(pattern_td, orig, re.DOTALL)
if td_match:
    td_code = td_match.group(0)
    new_dash = main_imports + "\n\n" + td_code
    with open(dash_file, 'w', encoding='utf-8') as f:
        f.write(new_dash)
    print("Dashboard.jsx updated.")
else:
    print("CRITICAL: TeacherDashboard component not found!")
