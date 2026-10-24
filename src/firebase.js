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
  return s.docs.map(d => ({ ...d.data(), id: d.id }));
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
      // Always use Firestore document ID (d.id) as the item id
      // This ensures delete/update always targets the right document
      const data = snap.docs.map(d => ({ ...d.data(), id: d.id }));
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
  // Try sub-banks first (new system), fall back to legacy flat bank
  let allQ = [];
  try {
    allQ = await getAllSubBankQuestions();
  } catch(e) {}
  if (allQ.length === 0) {
    allQ = await getAllBankQuestions();
  }

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

// ── SUB-BANKS ─────────────────────────────────────────────
// Each CSV upload is stored as a named sub-bank
// Collection: question_banks/{bankId}/meta + chunks

export const saveSubBank = async (bankId, bankName, questions) => {
  const CHUNK = 400;
  const chunks = [];
  for (let i = 0; i < questions.length; i += CHUNK)
    chunks.push(questions.slice(i, i + CHUNK));

  // Write chunks
  await Promise.all(chunks.map((ch, i) =>
    setDoc(doc(db, "question_banks", bankId, "chunks", `chunk_${i}`), {
      questions: ch, chunkIndex: i, updatedAt: serverTimestamp(),
    })
  ));

  // Write sub-bank meta
  await setDoc(doc(db, "question_banks", bankId), {
    id: bankId, name: bankName,
    totalQuestions: questions.length,
    totalChunks: chunks.length,
    updatedAt: serverTimestamp(),
    grade:   questions[0]?.grade   || null,
    subject: questions[0]?.subject || null,
    type:    questions[0]?.type    || null,
  });
};

export const deleteSubBank = async (bankId) => {
  // Delete all chunks then the bank doc
  const meta = await getDoc(doc(db, "question_banks", bankId));
  if (meta.exists()) {
    const { totalChunks=0 } = meta.data();
    await Promise.all(
      Array.from({length:totalChunks},(_,i)=>
        deleteDoc(doc(db,"question_banks",bankId,"chunks",`chunk_${i}`))
      )
    );
  }
  await deleteDoc(doc(db, "question_banks", bankId));
};

export const listSubBanks = async () => {
  const snap = await getDocs(collection(db, "question_banks"));
  return snap.docs.map(d => ({ id:d.id, ...d.data() }))
    .sort((a,b) => (b.updatedAt?.seconds||0) - (a.updatedAt?.seconds||0));
};

export const getSubBankQuestions = async (bankId) => {
  const meta = await getDoc(doc(db, "question_banks", bankId));
  if (!meta.exists()) return [];
  const { totalChunks=0 } = meta.data();
  const all = [];
  for (let i = 0; i < totalChunks; i++) {
    const snap = await getDoc(doc(db,"question_banks",bankId,"chunks",`chunk_${i}`));
    if (snap.exists()) all.push(...(snap.data().questions||[]));
  }
  return all;
};

export const getAllSubBankQuestions = async () => {
  const banks = await listSubBanks();
  const all = [];
  for (const bank of banks) {
    const qs = await getSubBankQuestions(bank.id);
    all.push(...qs);
  }
  return all;
};
