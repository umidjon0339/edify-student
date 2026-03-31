# 🚀 EdifyTeacher AI Limit System Documentation

This document explains the architecture, database structure, and UI/UX flow of the daily AI Generation Limit System. 

The system is designed to be **highly secure** (preventing API abuse), **serverless** (requiring no background CRON jobs), and **user-friendly** (providing clear feedback before a user wastes a click).

---

## 📊 1. Database Structure (Firebase)
The limits are stored directly inside the user's document in the Firestore `users` collection. 

When a user interacts with the AI, the system looks for/updates these 3 fields:
* `aiDailyQuestionLimit` (Number): The total allowed questions per day (Default: 50).
* `aiQuestionUsedToday` (Number): How many questions they have successfully generated today.
* `aiQuestionLastResetDate` (String): The date (in `YYYY-MM-DD` format, Tashkent Time) when their usage was last updated.

---

## 🛡️ 2. The Backend Gatekeeper (Security)
*File: `lib/ai/aiLimitsHelper.ts`*

The backend is the ultimate source of truth. It uses the **Firebase Admin SDK** to bypass client-side security rules securely. 

### The "Lazy Reset" Mechanism
Instead of running an expensive server function every night at midnight to reset thousands of users to `0`, the system uses a "Lazy Reset".
1. When a user requests to generate questions, the backend checks today's date in `Asia/Tashkent`.
2. It compares today's date with the `aiQuestionLastResetDate` in the database.
3. If the dates do NOT match, the backend instantly assumes it's a new day and resets their `used` count to `0` in memory before doing the math.

### The Math Check
The backend calculates: `currentUsed + requestedAmount`. 
* If the total is `<= currentLimit`, it allows the generation and uses `{ merge: true }` to update the database safely without overwriting other user data.
* If the total is `> currentLimit`, it blocks the request with a `402 Payment Required` status and returns a specific error message.

---

## ⚡ 3. The Frontend Hook (Real-time UI)
*File: `hooks/useAiLimits.ts`*

The frontend uses a custom React Hook to listen to the user's database document in real-time using `onSnapshot`.

* **Visual Override:** Just like the backend, the frontend checks if `dbLastReset !== today`. If it's a new day, the UI will display `0` used, even if the database hasn't been officially updated yet. This prevents the user from waking up and seeing "50/50 used" from the previous day.
* **Returned Data:** The hook provides an object containing `used`, `limit`, `remaining`, `isLimitReached`, and `usagePercentage` to be used anywhere in the app.

---

## 🎨 4. UI Components & User Experience

### The Top-Bar Tracker (`AiLimitCard.tsx`)
A sleek, responsive pill located in the top navigation bar.
* **Normal State:** Shows an amber/grey subtle tracker (e.g., `⚡ AI Limit (12/50)`).
* **Empty State:** Turns indigo/red when the limit is reached, showing a live countdown timer to exactly `00:00` Tashkent time.
* **Interaction:** Clicking it opens a beautiful Popover/Dropdown explaining the limits and offering a Telegram link to contact the admin.

### Smart Button Restrictions (`page.tsx`)
To prevent edge-case errors, the UI dynamically reacts to the `remaining` limit:
1. **The Plus Button:** If a user only has 3 credits left, the `+` button in the UI will disable once it reaches 3. They physically cannot request 5.
2. **Contextual Hint:** If they have less than 15 credits left, an amber text appears above the Generate button explaining exactly how many credits remain.
3. **The Generate Button:** Automatically disables when `isLimitReached` is true.

---

## 🗑️ 5. How to Disable or Remove the Limits
The entire system was built with easy removal in mind. If you want to make AI generation 100% free and unlimited, you do not need to rewrite your code.

Look for the block comments in your API routes and Pages:
```javascript
// 🟢 AI LIMIT BLOCK START
   ... code to delete ...
// 🔴 AI LIMIT BLOCK END