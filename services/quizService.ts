import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  doc, 
  getDoc, 
  DocumentSnapshot,
  QueryConstraint // 🟢 Import this
} from 'firebase/firestore';

export interface PathIds {
  subjectId: string | number;
  topicId: number;
  chapterId: number;
  subtopicId: number;
}

export interface Question {
  id: string;
  question?: { uz: string; ru: string; en: string } | string;
  options?: any;
  answer?: string;
  difficulty?: string;
  text?: string;
}

export async function fetchQuestions(
  ids: PathIds, 
  difficulty: 'Easy' | 'Medium' | 'Hard',
  lastDoc: DocumentSnapshot | string | null = null
) {
  let diffVal = 1;
  if (difficulty === 'Medium') diffVal = 2;
  if (difficulty === 'Hard') diffVal = 3;

  const topicStr = ids.topicId.toString(); 
  const chapterStr = ids.chapterId.toString().padStart(2, '0');
  const subtopicStr = ids.subtopicId.toString().padStart(2, '0');

  try {
    const questionsRef = collection(db, 'questions1');
    
    // 🟢 Build your query constraints in an array
    const queryConstraints: QueryConstraint[] = [
      where('topicId', '==', topicStr),
      where('chapterId', '==', chapterStr),
      where('subtopicId', '==', subtopicStr),
      where('difficultyId', '==', diffVal),
      orderBy('uploadedAt', 'desc')
    ];

    // Handle Cursor (Pagination)
    if (lastDoc) {
      if (typeof lastDoc === 'string') {
        const docRef = doc(db, 'questions1', lastDoc);
        const cursorSnapshot = await getDoc(docRef);
        if (cursorSnapshot.exists()) {
          queryConstraints.push(startAfter(cursorSnapshot));
        }
      } else {
        queryConstraints.push(startAfter(lastDoc));
      }
    }

    // 🟢 Apply the limit LAST
    queryConstraints.push(limit(10));

    // Execute Fetch applying all constraints at once
    const finalQuery = query(questionsRef, ...queryConstraints);
    const snapshot = await getDocs(finalQuery);

    const questionsList = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as Question[];

    return {
      questions: questionsList,
      lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
    };

  } catch (error) {
    console.error("🔥 Firebase Query Error:", error);
    return { questions: [], lastDoc: null };
  }
}