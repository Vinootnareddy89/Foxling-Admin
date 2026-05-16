import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, getDoc, setDoc, deleteDoc, doc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey:            "AIzaSyAODZqosuQTHF5UkqDh5iaiqBzgLNNlsCY",
  authDomain:        "foxling-44ccf.firebaseapp.com",
  projectId:         "foxling-44ccf",
  storageBucket:     "foxling-44ccf.firebasestorage.app",
  messagingSenderId: "300227680073",
  appId:             "1:300227680073:web:9b37042b582e795dd8ac98",
  measurementId:     "G-DFLM21Y3RF",
};

const app = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);

export const loginWithGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
export const logoutAdmin     = () => signOut(auth);
export const onAuth          = (cb) => onAuthStateChanged(auth, cb);

// ── CONTENT CRUD ──────────────────────────────────────────
export const getContent = async () => {
  const s = await getDocs(collection(db, "content"));
  return s.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getContentById = async (id) => {
  const snap = await getDoc(doc(db, "content", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const createContent = async (data) => {
  const id = data.id || `content-${Date.now()}`;
  await setDoc(doc(db, "content", id), {
    ...data, id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
};

export const updateContent = async (id, data) => {
  await setDoc(doc(db, "content", id), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

export const deleteContent = async (id) => deleteDoc(doc(db, "content", id));

export const getUsers = async () => {
  const s = await getDocs(collection(db, "users"));
  return s.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Real-time content listener
export const subscribeContent = (callback) => {
  return onSnapshot(
    collection(db, "content"),
    (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(data);
    },
    (err) => console.warn("Content listener error:", err)
  );
};

// ── QUESTION BANK ─────────────────────────────────────────
const CHUNK_SIZE = 400; // safe below 1MB Firestore doc limit

export const saveQuestionBank = async (questions) => {
  // 1. Get old meta to know how many old chunks to delete
  let oldChunks = 0;
  try {
    const oldMeta = await getDoc(doc(db, "question_bank", "meta"));
    if (oldMeta.exists()) oldChunks = oldMeta.data().totalChunks || 0;
  } catch(e) {}

  // 2. Build new chunks
  const chunks = [];
  for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
    chunks.push(questions.slice(i, i + CHUNK_SIZE));
  }
  const newChunkCount = chunks.length;

  // 3. Write new chunks
  await Promise.all(chunks.map((chunk, i) =>
    setDoc(doc(db, "question_bank", `chunk_${i}`), {
      questions: chunk,
      updatedAt: serverTimestamp(),
      chunkIndex: i,
    })
  ));

  // 4. Delete any old chunks that no longer exist
  const deleteOps = [];
  for (let i = newChunkCount; i < oldChunks; i++) {
    deleteOps.push(deleteDoc(doc(db, "question_bank", `chunk_${i}`)));
  }
  if (deleteOps.length > 0) await Promise.all(deleteOps);

  // 5. Save metadata last (source of truth)
  await setDoc(doc(db, "question_bank", "meta"), {
    totalQuestions: questions.length,
    totalChunks:    newChunkCount,
    updatedAt:      serverTimestamp(),
  });
};

export const getQuestionBankMeta = async () => {
  const snap = await getDoc(doc(db, "question_bank", "meta"));
  return snap.exists() ? snap.data() : null;
};

// Fetch ALL questions from bank (for add mode)
export const getAllBankQuestions = async () => {
  const meta = await getQuestionBankMeta();
  if (!meta || meta.totalChunks === 0) return [];
  const allQ = [];
  for (let i = 0; i < meta.totalChunks; i++) {
    const snap = await getDoc(doc(db, "question_bank", `chunk_${i}`));
    if (snap.exists()) allQ.push(...(snap.data().questions || []));
  }
  return allQ;
};

export const getRandomQuestions = async ({ count=10, subject, grade, type } = {}) => {
  const allQ = await getAllBankQuestions();
  let filtered = allQ.filter(q => {
    if (subject && q.subject !== subject) return false;
    if (grade   && Number(q.grade) !== Number(grade)) return false;
    if (type    && q.type !== type) return false;
    return true;
  });
  const shuffled = filtered.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((q, i) => ({
    ...q,
    id: `qb_${Date.now()}_${i}`,
  }));
};
