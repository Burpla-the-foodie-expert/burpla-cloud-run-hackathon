import React, { useRef, useEffect } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ChatMessage from "./ChatMessage";
import { Colors } from "../constants/colors";

const MessageList = ({ messages, contentContainerStyle }) => {
  const flatListRef = useRef(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (messages.length > 0) {
      // Scroll to end when new messages arrive
      // Using a small timeout to ensure layout is complete
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <ChatMessage message={item} index={index} />
      )}
      contentContainerStyle={[
        styles.container,
        contentContainerStyle,
        { paddingTop: insets.top + 10 },
      ]}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
});

export default MessageList;
