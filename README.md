# VocabVault

VocabVault is a Next.js 15 vocabulary learning app with Firebase Authentication and Cloud Firestore. Users can create private topics, add vocabulary, extract words from text, practice multiple quiz types, review weak words, and track progress.

## Tech stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- shadcn-style local UI components
- Firebase Authentication
- Cloud Firestore
- Firebase client SDK only

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Create a Firebase project at <https://console.firebase.google.com/>.

3. Enable Authentication:

- Go to Authentication.
- Open Sign-in method.
- Enable Email/Password.

4. Create a Cloud Firestore database:

- Go to Firestore Database.
- Create a database.
- Choose production mode or test mode, then replace rules with this repo's `firestore.rules`.

5. Copy Firestore rules:

- Open `firestore.rules`.
- Paste the content into Firebase Console -> Firestore Database -> Rules.
- Publish.

6. Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Fill in your Firebase web app config:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

7. Start the dev server:

```bash
npm run dev
```

Open <http://localhost:3000>.

## Demo data

After registering or logging in, open the dashboard and click **Create demo data**. It creates demo data inside the current user's Firestore path:

- 6 topics
- 60 vocabulary items
- sample quiz attempts

The built-in dictionary includes 80 English-Vietnamese entries across Health, Education, Technology, Environment, Business, Travel, Food, and Daily Life.

## Firestore structure

```text
users/{userId}
  displayName
  email
  createdAt

users/{userId}/topics/{topicId}
  name
  description
  icon
  color
  createdAt
  updatedAt

users/{userId}/topics/{topicId}/vocabulary/{wordId}
  word
  meaningVi
  partOfSpeech
  phonetic
  exampleEn
  exampleVi
  difficulty
  masteryLevel
  correctCount
  wrongCount
  lastReviewedAt
  nextReviewAt
  createdAt
  updatedAt

users/{userId}/quizAttempts/{attemptId}
  topicId
  topicName
  quizType
  totalQuestions
  correctAnswers
  score
  createdAt

users/{userId}/quizAttempts/{attemptId}/questions/{questionId}
  vocabularyId
  questionType
  prompt
  userAnswer
  correctAnswer
  isCorrect
  createdAt
```

## Key pages

- `/login` and `/register`
- `/dashboard`
- `/topics`
- `/topics/[id]`
- `/extract`
- `/practice`
- `/practice/results/[id]`
- `/weak-words`
- `/review`
- `/progress`
