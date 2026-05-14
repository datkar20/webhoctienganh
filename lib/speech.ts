"use client";

export function speakEnglish(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }

  const phrase = text.trim();
  if (!phrase) return false;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(phrase);
  const voices = window.speechSynthesis.getVoices();
  const englishVoice =
    voices.find((voice) => voice.lang.toLowerCase() === "en-us") ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en"));

  if (englishVoice) utterance.voice = englishVoice;
  utterance.lang = englishVoice?.lang ?? "en-US";
  utterance.rate = 0.86;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
  return true;
}
