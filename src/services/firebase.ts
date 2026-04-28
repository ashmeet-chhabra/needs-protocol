import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type { Need, VolunteerProfile } from "../types";

function createVolunteerId(vol: VolunteerProfile): string {
  const safeName = vol.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `vol-${safeName || "volunteer"}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `vol-${safeName || "volunteer"}-${Date.now().toString(36)}`;
}

// Firebase config — these are public project identifiers, NOT secrets.
// Security is enforced via Firestore Security Rules, not by hiding these.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Only initialize if config values are actually provided
const hasFirebaseConfig = firebaseConfig.projectId && firebaseConfig.apiKey;

let db: ReturnType<typeof getFirestore> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
const provider = new GoogleAuthProvider();

if (hasFirebaseConfig) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    if (import.meta.env.DEV) console.log("🔥 Firebase connected:", firebaseConfig.projectId);
  } catch (err) {
    if (import.meta.env.DEV) console.warn("Firebase initialization failed, running in local-only mode:", err);
  }
} else {
  if (import.meta.env.DEV) console.log("ℹ️ No Firebase config found — running in local-only mode. Data will not persist.");
}

export { db, auth, provider, hasFirebaseConfig };

// --- Needs CRUD ---

export async function saveNeed(need: Need): Promise<string | null> {
  if (!db || !need.id) return null;
  try {
    // Use need.id as the Firestore document ID for consistency with queries
    await setDoc(doc(db, "needs", need.id), {
      ...need,
      createdAt: need.createdAt || new Date().toISOString(),
      _serverTimestamp: serverTimestamp(),
    });
    return need.id;
  } catch (err) {
    console.error("Failed to save need:", err);
    return null;
  }
}

export async function saveNeedsBatch(needs: Need[]): Promise<void> {
  if (!db) return;
  for (const need of needs) {
    await saveNeed(need);
  }
}

export async function updateNeedInDb(needId: string, updates: Partial<Need>): Promise<void> {
  if (!db || !needId) return;
  try {
    // Update using the document ID directly (more efficient than querying)
    const docRef = doc(db, "needs", needId);
    await updateDoc(docRef, {
      ...updates,
      ...(updates.status === "Completed" || updates.status === "Fulfilled"
        ? { resolvedAt: new Date().toISOString() }
        : {}),
    });
  } catch (err) {
    console.error("Failed to update need:", err);
  }
}

export async function deleteNeedFromDb(needId: string): Promise<void> {
  if (!db || !needId) return;
  try {
    // Delete using document ID directly
    const docRef = doc(db, "needs", needId);
    await deleteDoc(docRef);
    
    // Legacy: Check for and clean up any duplicates from previous bug
    // (only if doc ID lookup fails, indicating old data structure)
    const snapshot = await getDocs(collection(db, "needs"));
    const duplicates = snapshot.docs.filter(d => d.data().id === needId && d.id !== needId);
    if (duplicates.length > 0) {
      console.warn(`Found ${duplicates.length} duplicate docs for need ${needId}. Cleaning up.`);
      for (const docSnap of duplicates) {
        await deleteDoc(doc(db, "needs", docSnap.id));
      }
    }
  } catch (err) {
    console.error("Failed to delete need:", err);
  }
}

export function subscribeToNeeds(callback: (needs: Need[]) => void): Unsubscribe | null {
  if (!db) return null;
  const q = query(collection(db, "needs"), orderBy("_serverTimestamp", "desc"));
  return onSnapshot(q, (snapshot) => {
    const needs: Need[] = snapshot.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        createdAt: data.createdAt || (data._serverTimestamp as Timestamp)?.toDate?.()?.toISOString(),
      } as Need;
    });
    callback(needs);
  });
}

// --- Volunteers CRUD ---

export async function saveVolunteer(vol: VolunteerProfile): Promise<string | null> {
  if (!db) return null;
  try {
    const volId = vol.id || createVolunteerId(vol);
    await setDoc(doc(db, "volunteers", volId), {
      ...vol,
      id: volId,
      joinedAt: vol.joinedAt || new Date().toISOString(),
      _serverTimestamp: serverTimestamp(),
    });
    return volId;
  } catch (err) {
    console.error("Failed to save volunteer:", err);
    return null;
  }
}

export async function updateVolunteerInDb(volId: string, updates: Partial<VolunteerProfile>): Promise<void> {
  if (!db || !volId) return;
  try {
    const volRef = doc(db, "volunteers", volId);
    await updateDoc(volRef, {
      ...updates,
      _serverTimestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error("Failed to update volunteer:", err);
  }
}

export async function saveVolunteersBatch(vols: VolunteerProfile[]): Promise<void> {
  if (!db) return;
  for (const vol of vols) {
    await saveVolunteer(vol);
  }
}

export async function deleteVolunteerFromDb(volId: string): Promise<void> {
  if (!db || !volId) return;
  try {
    // Delete using document ID directly
    const volRef = doc(db, "volunteers", volId);
    await deleteDoc(volRef);
    
    // Legacy: Check for and clean up any duplicates from previous bug
    const snapshot = await getDocs(collection(db, "volunteers"));
    const duplicates = snapshot.docs.filter(d => d.data().id === volId && d.id !== volId);
    if (duplicates.length > 0) {
      console.warn(`Found ${duplicates.length} duplicate docs for volunteer ${volId}. Cleaning up.`);
      for (const docSnap of duplicates) {
        await deleteDoc(doc(db, "volunteers", docSnap.id));
      }
    }
  } catch (err) {
    console.error("Failed to delete volunteer:", err);
  }
}

export function subscribeToVolunteers(callback: (vols: VolunteerProfile[]) => void): Unsubscribe | null {
  if (!db) return null;
  const q = query(collection(db, "volunteers"), orderBy("_serverTimestamp", "desc"));
  return onSnapshot(q, (snapshot) => {
    const vols: VolunteerProfile[] = snapshot.docs.map(d => d.data() as VolunteerProfile);
    callback(vols);
  });
}

// --- Historical Data ---

export async function getAllNeeds(): Promise<Need[]> {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, "needs"));
  return snapshot.docs.map(d => d.data() as Need);
}

export async function getAllVolunteers(): Promise<VolunteerProfile[]> {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, "volunteers"));
  return snapshot.docs.map(d => d.data() as VolunteerProfile);
}
