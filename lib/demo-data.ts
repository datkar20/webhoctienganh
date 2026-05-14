import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { BUILT_IN_DICTIONARY } from "@/data/built-in-dictionary";
import { db } from "@/lib/firebase";
import type { TopicIcon } from "@/types";

const DEMO_TOPICS: {
  name: string;
  description: string;
  icon: TopicIcon;
  color: string;
}[] = [
  {
    name: "Health",
    description: "Common health, wellness, and medical vocabulary.",
    icon: "HeartPulse",
    color: "#14b8a6"
  },
  {
    name: "Education",
    description: "School, learning, and academic vocabulary.",
    icon: "GraduationCap",
    color: "#2563eb"
  },
  {
    name: "Technology",
    description: "Digital products, software, and technical words.",
    icon: "Cpu",
    color: "#7c3aed"
  },
  {
    name: "Environment",
    description: "Climate, nature, and sustainability vocabulary.",
    icon: "Leaf",
    color: "#16a34a"
  },
  {
    name: "Business",
    description: "Workplace, finance, and business English.",
    icon: "BriefcaseBusiness",
    color: "#ea580c"
  },
  {
    name: "Travel",
    description: "Airport, hotel, and trip planning vocabulary.",
    icon: "Plane",
    color: "#0891b2"
  }
];

export async function createDemoData(userId: string, email?: string | null) {
  await setDoc(
    doc(db, "users", userId),
    {
      displayName: email?.split("@")[0] ?? "VocabVault learner",
      email: email ?? "",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    },
    { merge: true }
  );

  const topicIds = new Map<string, string>();
  const batch = writeBatch(db);

  for (const topic of DEMO_TOPICS) {
    const topicCollection = collection(db, "users", userId, "topics");
    const existingTopic = await getDocs(query(topicCollection, where("name", "==", topic.name), limit(1)));
    let topicRef = existingTopic.docs[0]?.ref;

    if (!topicRef) {
      topicRef = doc(topicCollection);
      batch.set(topicRef, {
        name: topic.name,
        description: topic.description,
        icon: topic.icon,
        color: topic.color,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    topicIds.set(topic.name, topicRef.id);
  }

  await batch.commit();

  const vocabularyBatch = writeBatch(db);

  for (const topic of DEMO_TOPICS) {
    const topicId = topicIds.get(topic.name);
    if (!topicId) continue;

    const vocabularyCollection = collection(db, "users", userId, "topics", topicId, "vocabulary");
    const existingVocabulary = await getDocs(vocabularyCollection);
    const existingWords = new Set(
      existingVocabulary.docs.map((document) => String(document.data().word ?? "").toLowerCase())
    );
    const entries = BUILT_IN_DICTIONARY.filter((entry) => entry.topic === topic.name).slice(0, 10);

    for (const entry of entries) {
      if (existingWords.has(entry.word.toLowerCase())) continue;

      vocabularyBatch.set(doc(vocabularyCollection), {
        word: entry.word,
        meaningVi: entry.meaningVi,
        partOfSpeech: entry.partOfSpeech,
        phonetic: entry.phonetic,
        exampleEn: entry.exampleEn,
        exampleVi: entry.exampleVi,
        difficulty: entry.difficulty,
        masteryLevel: "new",
        correctCount: Math.floor(Math.random() * 3),
        wrongCount: Math.floor(Math.random() * 2),
        lastReviewedAt: null,
        nextReviewAt: new Date(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  }

  await vocabularyBatch.commit();

  const healthTopicId = topicIds.get("Health") ?? "";
  const technologyTopicId = topicIds.get("Technology") ?? "";
  await addDoc(collection(db, "users", userId, "quizAttempts"), {
    topicId: healthTopicId,
    topicName: "Health",
    quizType: "en-to-vi-choice",
    totalQuestions: 10,
    correctAnswers: 8,
    score: 80,
    createdAt: serverTimestamp()
  });

  await addDoc(collection(db, "users", userId, "quizAttempts"), {
    topicId: technologyTopicId,
    topicName: "Technology",
    quizType: "mixed",
    totalQuestions: 10,
    correctAnswers: 7,
    score: 70,
    createdAt: serverTimestamp()
  });

  return {
    topics: DEMO_TOPICS.length,
    words: 60
  };
}
