import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { Colors } from "../constants/colors";
import { User, Bot } from "lucide-react-native";

const ChatMessage = ({ message, index }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    const delay = index * 100; // Stagger effect
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 500 }));
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  const isUser = message.role === "user";

  return (
    <Animated.View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.botContainer,
        animatedStyle,
      ]}
    >
      {!isUser && (
        <View style={styles.avatar}>
          <Bot size={16} color={Colors.text} />
        </View>
      )}
      <View
        style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}
      >
        <Text style={styles.text}>{message.content}</Text>
      </View>
      {isUser && (
        <View style={styles.avatar}>
          <User size={16} color={Colors.textSecondary} />
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginVertical: 8,
    paddingHorizontal: 16,
    alignItems: "flex-start",
  },
  userContainer: {
    justifyContent: "flex-end",
  },
  botContainer: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceHighlight,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
  },
  bubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: Colors.surface,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: "transparent",
  },
  text: {
    color: Colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
});

export default ChatMessage;
