/**
 * SAT practice bank rules (docs/SAT_QUIZ.md §Practice bank). Run: npm run test:rules
 *
 * `sat_pool/{batchId}_{part}` — chunks of SAT items a teacher uploads; every
 * student's SAT page lists the subject's chunks to generate a practice test.
 *
 * Pinned down:
 *  1. Read is plain `isAuth()` and the student's `subject ==` list query works.
 *  2. Only a `role: 'teacher'` user may create, only as themselves, only for a
 *     SAT subject — a student must not be able to plant questions in the bank.
 *  3. Never updated; deleted only by the uploader.
 */
import { before, after, beforeEach, describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc, setDoc, updateDoc, deleteDoc, getDocs, collection, query, where,
} from "firebase/firestore";

let testEnv;

const CHUNK = {
  subject: "sat-matematika",
  batchId: "pool_1",
  title: "bank.json",
  teacherId: "teacher1",
  teacherName: "Teacher One",
  part: 0,
  parts: 1,
  count: 1,
  items: [{ id: "pool_1-0001", qType: "mcq", domain: "algebra", answer: "B" }],
  createdAt: 1,
};

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-edify-rules",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

after(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/teacher1"), { uid: "teacher1", role: "teacher" });
    await setDoc(doc(db, "users/teacher2"), { uid: "teacher2", role: "teacher" });
    await setDoc(doc(db, "users/student1"), { uid: "student1", role: "student" });
    await setDoc(doc(db, "sat_pool/pool_1_0"), CHUNK);
  });
});

const as = (uid) => testEnv.authenticatedContext(uid).firestore();

describe("sat_pool — read", () => {
  it("a student can list the subject's chunks", async () => {
    await assertSucceeds(getDocs(query(collection(as("student1"), "sat_pool"), where("subject", "==", "sat-matematika"))));
  });
  it("signed-out users cannot read", async () => {
    await assertFails(getDocs(collection(testEnv.unauthenticatedContext().firestore(), "sat_pool")));
  });
});

describe("sat_pool — create", () => {
  it("a teacher creates a chunk as themselves", async () => {
    await assertSucceeds(setDoc(doc(as("teacher1"), "sat_pool/pool_2_0"), { ...CHUNK, batchId: "pool_2" }));
  });
  it("a student cannot plant questions in the bank", async () => {
    await assertFails(setDoc(doc(as("student1"), "sat_pool/pool_3_0"), { ...CHUNK, teacherId: "student1" }));
  });
  it("a teacher cannot write as another teacher", async () => {
    await assertFails(setDoc(doc(as("teacher2"), "sat_pool/pool_4_0"), { ...CHUNK, teacherId: "teacher1" }));
  });
  it("only SAT subjects", async () => {
    await assertFails(setDoc(doc(as("teacher1"), "sat_pool/pool_5_0"), { ...CHUNK, subject: "biologiya" }));
  });
  it("items must be a list", async () => {
    await assertFails(setDoc(doc(as("teacher1"), "sat_pool/pool_6_0"), { ...CHUNK, items: "nope" }));
  });
});

describe("sat_pool — update / delete", () => {
  it("nobody updates a chunk, not even the uploader", async () => {
    await assertFails(updateDoc(doc(as("teacher1"), "sat_pool/pool_1_0"), { title: "x" }));
  });
  it("the uploader deletes their chunk", async () => {
    await assertSucceeds(deleteDoc(doc(as("teacher1"), "sat_pool/pool_1_0")));
  });
  it("another teacher cannot delete it", async () => {
    await assertFails(deleteDoc(doc(as("teacher2"), "sat_pool/pool_1_0")));
  });
  it("a student cannot delete it", async () => {
    await assertFails(deleteDoc(doc(as("student1"), "sat_pool/pool_1_0")));
  });
});
