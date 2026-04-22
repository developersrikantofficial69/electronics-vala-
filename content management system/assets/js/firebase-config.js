// ============================================
// Firebase Configuration
// ELECTRONICS VALA — YouTube Team Platform
// ============================================
// ✅ LIVE — Project: contentflow-cms-ee526
// ============================================

const firebaseConfig = {
  apiKey:            "AIzaSyBfr3Bloumi8eIhriRr_O3Kzex3Ohvc2HU",
  authDomain:        "contentflow-cms-ee526.firebaseapp.com",
  projectId:         "contentflow-cms-ee526",
  storageBucket:     "contentflow-cms-ee526.firebasestorage.app",
  messagingSenderId: "658550433485",
  appId:             "1:658550433485:web:0d8147ecbafe5325112b84",
  measurementId:     "G-ZGMENKL39S"
};

// Initialize Firebase (compat SDK — works in plain HTML/JS)
firebase.initializeApp(firebaseConfig);

// Exports (used via global firebase.* in all other scripts)
const db      = firebase.firestore();
const auth    = firebase.auth();

// Persistence — keeps user logged in on refresh
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// Firestore settings
db.settings({ merge: true });

// ============================================
// CONSTANTS
// ============================================
const ADMIN_EMAIL = "electronicsvalawebsite@gmail.com";

const TASK_STATUS = {
  PENDING:     "pending",
  IN_PROGRESS: "in_progress",
  SUBMITTED:   "submitted",
  UNDER_REVIEW:"under_review",
  COMPLETED:   "completed"
};

const TASK_PRIORITY = {
  LOW:    "low",
  MEDIUM: "medium",
  HIGH:   "high"
};

const CONTENT_STATUS = {
  UPCOMING:    "upcoming",
  IN_PROGRESS: "in_progress",
  COMPLETED:   "completed"
};

const NOTIF_TYPE = {
  TASK_ASSIGNED:  "task_assigned",
  TASK_APPROVED:  "task_approved",
  TASK_REJECTED:  "task_rejected",
  DEADLINE_NEAR:  "deadline_near",
  COMMENT_ADDED:  "comment_added",
  FEEDBACK:       "feedback"
};

// Collections
const COLLECTIONS = {
  USERS:   "users",
  TASKS:   "tasks",
  CONTENT: "content",
  REPORTS: "reports"
};
