// lib/social.ts
import { writeBatch, doc, increment, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Toggles a follow/unfollow relationship between two users using a secure atomic batch.
 * * @param currentUid - The ID of the user clicking the button
 * @param targetUid - The ID of the user being followed/unfollowed
 * @param isCurrentlyFollowing - Boolean indicating the CURRENT state before the click
 */
export const toggleFollowUser = async (
  currentUid: string, 
  targetUid: string, 
  isCurrentlyFollowing: boolean
) => {
  // Prevent users from following themselves (Security check)
  if (currentUid === targetUid) {
    throw new Error("You cannot follow yourself.");
  }

  const batch = writeBatch(db);

  // 1. Define all Document References
  const currentUserRef = doc(db, 'users', currentUid);
  const targetUserRef = doc(db, 'users', targetUid);
  
  // Using the Subcollection Schema we agreed on:
  const followingEdgeRef = doc(db, 'users', currentUid, 'following', targetUid);
  const followerEdgeRef = doc(db, 'users', targetUid, 'followers', currentUid);

  if (isCurrentlyFollowing) {
    // ==========================================
    // 🔴 ACTION: UNFOLLOW
    // ==========================================
    
    // 1. Remove the edges
    batch.delete(followingEdgeRef);
    batch.delete(followerEdgeRef);
    
    // 2. Decrement the counters on the root profiles
    batch.update(currentUserRef, { followingCount: increment(-1) });
    batch.update(targetUserRef, { followersCount: increment(-1) });

  } else {
    // ==========================================
    // 🟢 ACTION: FOLLOW
    // ==========================================
    const timestamp = serverTimestamp();

    // 1. Create the edges (We only store the timestamp to prevent stale data)
    batch.set(followingEdgeRef, { followedAt: timestamp });
    batch.set(followerEdgeRef, { followedAt: timestamp });
    
    // 2. Increment the counters on the root profiles
    batch.update(currentUserRef, { followingCount: increment(1) });
    batch.update(targetUserRef, { followersCount: increment(1) });

    // 3. Create a Notification for the target user!
    const newNotifRef = doc(collection(db, 'notifications'));
    batch.set(newNotifRef, {
      userId: targetUid,          // Send to the person being followed
      type: 'request',            // Maps to your purple UserPlus icon
      title: 'New Follower!',
      message: 'Someone just started following you.',
      read: false,
      createdAt: timestamp,
      link: `/profile/${currentUid}` // Link back to the follower's profile
    });
  }

  // Execute all operations atomically. If one fails, they all fail.
  await batch.commit();
};