import { useCallback, useRef, useState } from 'react';
import { askAgent, swipeFollowUp, type AgentReply } from '../services/agent';
import type { ChatMessage, ProductView, SwipeResult } from '../types';

let nextId = 0;
const uid = () => `m${Date.now().toString(36)}${(nextId++).toString(36)}`;

const fromReply = (reply: AgentReply): ChatMessage => ({ id: uid(), role: 'assistant', ...reply });

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState<string | null>(null);
  const session = useRef(0);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const current = session.current;
    setMessages((m) => [...m, { id: uid(), role: 'user', text: trimmed }]);
    setThinking('');
    const reply = await askAgent(trimmed, setThinking);
    // Drop replies that land after the user started a new chat.
    if (session.current !== current) return;
    setThinking(null);
    setMessages((m) => [...m, fromReply(reply)]);
  }, []);

  const completeSwipe = useCallback((messageId: string, result: SwipeResult) => {
    setMessages((m) => {
      const source = m.find((msg) => msg.id === messageId);
      const updated = m.map((msg) => (msg.id === messageId ? { ...msg, swipeResult: result } : msg));
      return [...updated, fromReply(swipeFollowUp(result, source?.topicId))];
    });
  }, []);

  const setView = useCallback((messageId: string, view: ProductView) => {
    setMessages((m) => m.map((msg) => (msg.id === messageId ? { ...msg, view } : msg)));
  }, []);

  const reset = useCallback(() => {
    session.current += 1;
    setThinking(null);
    setMessages([]);
  }, []);

  return { messages, thinking, send, completeSwipe, setView, reset };
}
