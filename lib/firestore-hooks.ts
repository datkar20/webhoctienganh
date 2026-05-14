"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { QuizAttempt, Topic, VocabularyItem, VocabularyWithTopic } from "@/types";

const FIRESTORE_TIMEOUT_MS = 3500;

function firestoreTimeoutError(collectionName: string) {
  return new Error(
    `Firestore did not respond while loading ${collectionName}. Check that Cloud Firestore is created, firestore.rules are published, and this domain is allowed by Firebase.`
  );
}

export function useTopics(userId?: string | null) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setTopics([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const timeout = window.setTimeout(() => {
      setError(firestoreTimeoutError("topics"));
      setLoading(false);
    }, FIRESTORE_TIMEOUT_MS);
    const topicsQuery = query(collection(db, "users", userId, "topics"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(
      topicsQuery,
      (snapshot) => {
        window.clearTimeout(timeout);
        setTopics(snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as Topic));
        setError(null);
        setLoading(false);
      },
      (nextError) => {
        window.clearTimeout(timeout);
        setError(nextError);
        setLoading(false);
      }
    );

    return () => {
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, [userId]);

  return { topics, loading, error };
}

export function useVocabulary(userId?: string | null, topicId?: string | null) {
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId || !topicId) {
      setVocabulary([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const timeout = window.setTimeout(() => {
      setError(firestoreTimeoutError("vocabulary"));
      setLoading(false);
    }, FIRESTORE_TIMEOUT_MS);
    const vocabularyQuery = query(
      collection(db, "users", userId, "topics", topicId, "vocabulary"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      vocabularyQuery,
      (snapshot) => {
        window.clearTimeout(timeout);
        setVocabulary(snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as VocabularyItem));
        setError(null);
        setLoading(false);
      },
      (nextError) => {
        window.clearTimeout(timeout);
        setError(nextError);
        setLoading(false);
      }
    );

    return () => {
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, [topicId, userId]);

  return { vocabulary, loading, error };
}

export function useAllVocabulary(userId?: string | null, topics: Topic[] = []) {
  const [byTopic, setByTopic] = useState<Record<string, VocabularyWithTopic[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const topicKey = useMemo(() => topics.map((topic) => topic.id).join("|"), [topics]);

  useEffect(() => {
    if (!userId || topics.length === 0) {
      setByTopic({});
      setLoading(false);
      return;
    }

    const remaining = new Set(topics.map((topic) => topic.id));
    setLoading(true);
    setError(null);
    const timeout = window.setTimeout(() => {
      setError(firestoreTimeoutError("all vocabulary"));
      setLoading(false);
    }, FIRESTORE_TIMEOUT_MS);
    setByTopic((previous) => {
      const next: Record<string, VocabularyWithTopic[]> = {};
      for (const topic of topics) {
        next[topic.id] = previous[topic.id] ?? [];
      }
      return next;
    });

    const unsubscribers = topics.map((topic) => {
      const vocabularyQuery = query(
        collection(db, "users", userId, "topics", topic.id, "vocabulary"),
        orderBy("createdAt", "desc")
      );

      return onSnapshot(
        vocabularyQuery,
        (snapshot) => {
          setByTopic((previous) => ({
            ...previous,
            [topic.id]: snapshot.docs.map(
              (document) =>
                ({
                  id: document.id,
                  topicId: topic.id,
                  topicName: topic.name,
                  ...document.data()
                }) as VocabularyWithTopic
            )
          }));
          remaining.delete(topic.id);
          if (remaining.size === 0) {
            window.clearTimeout(timeout);
            setError(null);
            setLoading(false);
          }
        },
        (nextError) => {
          window.clearTimeout(timeout);
          setError(nextError);
          setLoading(false);
        }
      );
    });

    return () => {
      window.clearTimeout(timeout);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [topicKey, topics, userId]);

  return {
    vocabulary: Object.values(byTopic).flat(),
    byTopic,
    loading,
    error
  };
}

export function useQuizAttempts(userId?: string | null, count = 8) {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setAttempts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const timeout = window.setTimeout(() => {
      setError(firestoreTimeoutError("quiz attempts"));
      setLoading(false);
    }, FIRESTORE_TIMEOUT_MS);
    const attemptsQuery = query(
      collection(db, "users", userId, "quizAttempts"),
      orderBy("createdAt", "desc"),
      limit(count)
    );

    const unsubscribe = onSnapshot(
      attemptsQuery,
      (snapshot) => {
        window.clearTimeout(timeout);
        setAttempts(snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as QuizAttempt));
        setError(null);
        setLoading(false);
      },
      (nextError) => {
        window.clearTimeout(timeout);
        setError(nextError);
        setLoading(false);
      }
    );

    return () => {
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, [count, userId]);

  return { attempts, loading, error };
}
