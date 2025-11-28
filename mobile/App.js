import React, { useState } from "react";
import {
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import MessageList from "./src/components/MessageList";
import Composer from "./src/components/Composer";
import { Colors } from "./src/constants/colors";

const INITIAL_MESSAGES = [
  {
    id: "1",
    role: "assistant",
    content: "Hello! I am v0. How can I help you build your UI today?",
  },
];

export default function App() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);

  const handleSend = (text) => {
    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);

    // Simulate AI response
    setTimeout(() => {
      const botMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "I am a simulated response. In a real app, I would stream this content!",
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 1000);
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={0}
        >
          <MessageList
            messages={messages}
            contentContainerStyle={{ paddingBottom: 100 }} // Space for composer
          />
          <Composer onSend={handleSend} />
        </KeyboardAvoidingView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
});
