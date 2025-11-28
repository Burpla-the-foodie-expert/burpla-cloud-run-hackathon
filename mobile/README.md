# v0 Chat App Clone

This is a React Native Expo app inspired by the v0 iOS app architecture.

## Features

- **Chat Interface**: Clean, dark-themed UI similar to v0.
- **Animations**: Message fade-in and slide-up using `react-native-reanimated`.
- **Blur Effect**: Glassmorphism on the composer using `expo-blur`.
- **Keyboard Handling**: Smooth keyboard interactions.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the app:
   ```bash
   npx expo start
   ```

## Architecture

- **Components**: Functional components in `src/components`.
- **Styling**: Standard `StyleSheet` with a centralized color palette in `src/constants/colors.js`.
- **State**: Local state in `App.js` (can be replaced with Context or Redux).

## Dependencies

- `expo`
- `react-native-reanimated`
- `expo-blur`
- `lucide-react-native`
- `react-native-safe-area-context`
