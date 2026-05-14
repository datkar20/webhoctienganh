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
    const topicsQuery = query(collection(db, "users", userId, "topics"), orderBy("createdAt", "asc"));
    return onSnapshot(
      topicsQuery,
      (snapshot) => {
        setTopics(snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as Topic));
        setLoading(false);
      },
      (nextError) => {
        setError(nextError);
        setLoading(false);
      }
    );
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
    const vocabularyQuery = query(
      collection(db, "users", userId, "topics", topicId, "vocabulary"),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(
      vocabularyQuery,
      (snapshot) => {
        setVocabulary(snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as VocabularyItem));
        setLoading(false);
      },
      (nextError) => {
        setError(nextError);
        setLoading(false);
      }
    );
  }, [topicId, userId]);

  return { vocabulary, loading, error };
}

export function useAllVocabulary(userId?: string | null, topics: Topic[] = []) {
  const [byTopic, setByTopic] = useState<Record<string, VocabularyWithTopic[]>>({});
  const [loading, setLoading] = useState(false);
  const topicKey = useMemo(() => topics.map((topic) => topic.id).join("|"), [topics]);

  useEffect(() => {
    if (!userId || topics.length === 0) {
      setByTopic({});
      setLoading(false);
      return;
    }

    const remaining = new Set(topics.map((topic) => topic.id));
    setLoading(true);
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

      return onSnapshot(vocabularyQuery, (snapshot) => {
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
        if (remaining.size === 0) setLoading(false);
      });
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [topicKey, topics, userId]);

  return {
    vocabulary: Object.values(byTopic).flat(),
    byTopic,
    loading
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
    const attemptsQuery = query(
      collection(db, "users", userId, "quizAttempts"),
      orderBy("createdAt", "desc"),
      limit(count)
    );

    return onSnapshot(
      attemptsQuery,
      (snapshot) => {
        setAttempts(snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as QuizAttempt));
        setLoading(false);
      },
      (nextError) => {
        setError(nextError);
        setLoading(false);
      }
    );
  }, [count, userId]);

  return { attempts, loading, error };
}
