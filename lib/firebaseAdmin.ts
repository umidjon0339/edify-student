import * as admin from 'firebase-admin';

// Check if the app is already initialized to prevent Next.js hot-reload errors
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // This replace() function is a lifesaver. It fixes the newline formatting
      // issue that crashes 90% of Next.js Admin setups.
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();