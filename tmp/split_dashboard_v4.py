import os

dash_file = r"c:\Users\jinsu\Documents\My Projects\Quiz-Verse\src\routes\Teacher\Dashboard.jsx"
base_dir = r"c:\Users\jinsu\Documents\My Projects\Quiz-Verse\src\routes\Teacher\DashboardComponents"
if not os.path.exists(base_dir):
    os.makedirs(base_dir)

with open(dash_file, 'r', encoding='utf-8') as f:
    orig = f.read()

def extract_function(name, code):
    # Matches export function Name(...) { ... } or function Name(...) { ... }
    # Handles destruction in params like ({ a, b })
    start_tags = [f"function {name}", f"export function {name}", f"export default function {name}"]
    start_idx = -1
    for tag in start_tags:
        start_idx = code.find(tag)
        if start_idx != -1: break
    
    if start_idx == -1: return None
    
    # We need to find the brace that starts the function body.
    # It must be AFTER the parameter list.
    # Parameter list ends at the last ')' before the body '{'
    
    # Search for '{' one by one, but skipping matching pairs if they are parameter destructuring
    # Actually, a safer way:
    # Find the first '{' that has a corresponding '}' where after that '}' there is potentially another '{'?
    # No, usually: function Name( {props} ) { body }
    # So we look for the '{' that follows a ')' or is the first '{' if no '(' exists? (Rare in modern JS)
    
    # Let's find index of '(' after start_idx
    left_paren = code.find("(", start_idx)
    if left_paren == -1:
        # No parens? e.g. function Name { body } - invalid?
        # Maybe arrow? No.
        first_brace = code.find("{", start_idx)
        body_start = first_brace
    else:
        # Find matching ')'
        count_p = 1
        idx_p = left_paren + 1
        while count_p > 0 and idx_p < len(code):
            if code[idx_p] == "(": count_p += 1
            elif code[idx_p] == ")": count_p -= 1
            idx_p += 1
        
        # Body brace '{' should be after idx_p
        body_start = code.find("{", idx_p)

    if body_start == -1: return None
    
    # Now count from body_start
    count = 1
    idx = body_start + 1
    while count > 0 and idx < len(code):
        if code[idx] == "{":
            count += 1
        elif code[idx] == "}":
            count -= 1
        idx += 1
    return code[start_idx:idx]

components = [
    "Section", "Pill", "Badge", "Field", "NumberField", "Select", "InputSmall", "SelectSmall", "Empty", "RowSkeleton", "KPI", "SkeletonChip", "MetricCard", "PlaceholderView",
    "SidebarLayout", "HomeSection", "AnalyticsSection", "StudentRequestsSection", "TeacherProfileDrawer", "CreateQuizSection", "QuizListSection", "QuizRow"
]

extracted = {}
for c in components:
    res = extract_function(c, orig)
    if res:
        extracted[c] = res
    else:
        print(f"FAILED: {c}")

td = extract_function("TeacherDashboard", orig)

# UI.jsx
with open(os.path.join(base_dir, "UI.jsx"), 'w', encoding='utf-8') as f:
    f.write('import React from "react";\n\n')
    ui_comps = ["Section", "Pill", "Badge", "Field", "NumberField", "Select", "InputSmall", "SelectSmall", "Empty", "RowSkeleton", "KPI", "SkeletonChip", "MetricCard", "PlaceholderView"]
    for c in ui_comps:
        if c in extracted:
            comp_code = extracted[c]
            if not comp_code.startswith("export"): comp_code = "export " + comp_code
            f.write(comp_code + "\n\n")

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
  { label: "IT", value: "IT" },
  { label: "CSE", value: "CSE" },
  { label: "ECE", value: "ECE" },
  { label: "EEE", value: "EEE" },
  { label: "MECH", value: "MECH" },
  { label: "CIVIL", value: "CIVIL" },
  { label: "AIDS", value: "AIDS" },
  { label: "AIML", value: "AIML" },
];
export const ACADEMIC_YEARS = ["2022 - 2026", "2023 - 2027", "2024 - 2028", "2025 - 2029"];
export const MIN_Q = 1, MAX_Q = 100;
export const MIN_OPT = 2, MAX_OPT = 10;
export const MIN_ATTEMPTS = 0, MAX_ATTEMPTS = 5;
"""
with open(os.path.join(base_dir, "Utils.js"), 'w', encoding='utf-8') as f: f.write(utils_content)

shared_imports = 'import React, { useEffect, useState, useRef, useMemo } from "react";\nimport { db, auth } from "../../../firebase";\nimport { collection, query, where, getDocs, orderBy, onSnapshot, limit, serverTimestamp, updateDoc, doc, setDoc } from "firebase/firestore";\nimport { useAuth } from "../../../context/AuthContext";\nimport { fmtDate, DEPARTMENTS, ACADEMIC_YEARS } from "./Utils";\n'

def write_comp(name, filename, extra_imports=""):
    if name in extracted:
        with open(os.path.join(base_dir, filename), 'w', encoding='utf-8') as f:
            f.write(shared_imports + extra_imports + "\n\n")
            comp_code = extracted[name]
            if not comp_code.startswith("export"): comp_code = "export " + comp_code
            f.write(comp_code + "\n")

write_comp("SidebarLayout", "Sidebar.jsx")
write_comp("HomeSection", "Home.jsx", 'import { Section, MetricCard, Empty } from "./UI";')
write_comp("AnalyticsSection", "Analytics.jsx", 'import { Section, Empty } from "./UI";')
write_comp("StudentRequestsSection", "Requests.jsx", 'import { Section, Empty } from "./UI";')
write_comp("CreateQuizSection", "CreateQuiz.jsx", 'import { Section, Field, Select, NumberField, Empty } from "./UI";\nimport { MIN_Q, MAX_Q, MIN_OPT, MAX_OPT } from "./Utils";')
write_comp("TeacherProfileDrawer", "Profile.jsx", 'import { Field, Select } from "./UI";\nimport { updateProfile } from "firebase/auth";\nasync function compressToDataURL(file, options) { return new Promise(r => { const reader = new FileReader(); reader.onload=()=>r(reader.result); reader.readAsDataURL(file); }); }')

if "QuizListSection" in extracted and "QuizRow" in extracted:
    with open(os.path.join(base_dir, "QuizList.jsx"), 'w', encoding='utf-8') as f:
        f.write(shared_imports + 'import { InputSmall, SelectSmall, RowSkeleton, Empty, KPI, SkeletonChip, Section } from "./UI";\n\n')
        f.write("export " + extracted['QuizRow'] + "\n\n")
        f.write("export " + extracted['QuizListSection'] + "\n")

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

if td:
    with open(dash_file, 'w', encoding='utf-8') as f:
        f.write(main_imports + "\n\n" + td)
    print("DONE SPLIT SUCCESS.")
else:
    print("FAILED TO FIND TeacherDashboard")
