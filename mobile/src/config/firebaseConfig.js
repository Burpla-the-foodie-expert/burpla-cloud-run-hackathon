import { initializeApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyD6EQEAMEdTXuON1niksnHhwaKqXkbb97w",
  authDomain: "wifipass-d739e.firebaseapp.com",
  databaseURL: "https://wifipass-d739e.firebaseio.com",
  projectId: "wifipass-d739e",
  storageBucket: "wifipass-d739e.firebasestorage.app",
  messagingSenderId: "926814707541",
  appId: "1:926814707541:web:7eb47cd0d88a82871519dc",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

export { auth };
