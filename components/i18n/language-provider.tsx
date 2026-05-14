"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Language = "en" | "vi";

const dictionaries = {
  en: {
    navDashboard: "Dashboard",
    navTopics: "Topics",
    navExtract: "Extract",
    navPractice: "Practice",
    navWeakWords: "Weak Words",
    navReview: "Review",
    navProgress: "Progress",
    logout: "Logout",
    language: "Language",
    practiceTitle: "Practice",
    practiceSubtitle: "Choose a topic, quiz type, and question count. Results are saved automatically.",
    quizSetup: "Quiz Setup",
    practiceAll: "Practice all words from a topic.",
    topic: "Topic",
    quizType: "Quiz type",
    questions: "Questions",
    availableWords: "Available words",
    startQuiz: "Start quiz",
    loadingTopics: "Loading topics...",
    loadingVocabulary: "Loading vocabulary...",
    noTopicsPractice: "No topics to practice",
    noTopicsPracticeDesc: "Create a topic and add vocabulary before starting a quiz.",
    retry: "Retry",
    couldNotLoadTopics: "Could not load topics",
    question: "Question",
    of: "of",
    correct: "Correct",
    notQuite: "Not quite",
    correctAnswer: "Correct answer",
    yourAnswer: "Your answer",
    submitAnswer: "Submit answer",
    nextQuestion: "Next question",
    finishQuiz: "Finish quiz",
    chooseVi: "Choose the Vietnamese meaning",
    chooseEn: "Choose the English word",
    typeVi: "Type Vietnamese meaning...",
    typeEn: "Type English word...",
    completeSentence: "Complete the sentence",
    visualMemory: "Visual memory",
    randomHint: "Random smart mix: English to Vietnamese, Vietnamese to English, and both typing directions."
  },
  vi: {
    navDashboard: "Tổng quan",
    navTopics: "Chủ đề",
    navExtract: "Trích xuất",
    navPractice: "Luyện tập",
    navWeakWords: "Từ yếu",
    navReview: "Ôn hôm nay",
    navProgress: "Tiến độ",
    logout: "Đăng xuất",
    language: "Ngôn ngữ",
    practiceTitle: "Luyện tập",
    practiceSubtitle: "Chọn chủ đề, dạng câu hỏi và số câu. Kết quả sẽ được lưu tự động.",
    quizSetup: "Thiết lập bài luyện",
    practiceAll: "Luyện toàn bộ từ trong một chủ đề.",
    topic: "Chủ đề",
    quizType: "Loại câu hỏi",
    questions: "Số câu",
    availableWords: "Số từ khả dụng",
    startQuiz: "Bắt đầu luyện",
    loadingTopics: "Đang tải chủ đề...",
    loadingVocabulary: "Đang tải từ vựng...",
    noTopicsPractice: "Chưa có chủ đề để luyện",
    noTopicsPracticeDesc: "Hãy tạo chủ đề và thêm từ vựng trước khi luyện tập.",
    retry: "Thử lại",
    couldNotLoadTopics: "Không tải được chủ đề",
    question: "Câu",
    of: "trên",
    correct: "Chính xác",
    notQuite: "Chưa đúng",
    correctAnswer: "Đáp án đúng",
    yourAnswer: "Câu trả lời của bạn",
    submitAnswer: "Chấm đáp án",
    nextQuestion: "Câu tiếp theo",
    finishQuiz: "Hoàn thành",
    chooseVi: "Chọn nghĩa tiếng Việt",
    chooseEn: "Chọn từ tiếng Anh",
    typeVi: "Nhập nghĩa tiếng Việt...",
    typeEn: "Nhập từ tiếng Anh...",
    completeSentence: "Hoàn thành câu",
    visualMemory: "Gợi nhớ bằng hình ảnh",
    randomHint: "Random thông minh: trộn Anh -> Việt, Việt -> Anh và cả hai dạng nhập đáp án."
  }
};

type DictionaryKey = keyof typeof dictionaries.en;

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: DictionaryKey) => string;
}>({
  language: "en",
  setLanguage: () => undefined,
  t: (key) => dictionaries.en[key]
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem("vocabvault-language");
    if (storedLanguage === "en" || storedLanguage === "vi") setLanguageState(storedLanguage);
  }, []);

  function setLanguage(nextLanguage: Language) {
    setLanguageState(nextLanguage);
    window.localStorage.setItem("vocabvault-language", nextLanguage);
  }

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key: DictionaryKey) => dictionaries[language][key]
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
