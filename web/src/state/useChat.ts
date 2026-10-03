import { useCallback, useMemo, useRef, useState } from 'react';
import { askAgent, simulateThinking, swipeFollowUp, type AgentReply } from '../services/agent';
import {
  askGuests,
  discoveryReply,
  isPartyIntent,
  parseGuests,
  targetedReply,
  wrapUpReply,
} from '../services/partyPlanner';
import type { ChatMessage, ProductView, SwipeLogEntry, SwipeResult } from '../types';

let nextId = 0;
const uid = () => `m${Date.now().toString(36)}${(nextId++).toString(36)}`;

const fromReply = (reply: AgentReply): ChatMessage => ({ id: uid(), role: 'assistant', ...reply });

interface PartySession {
  stage: 'guests' | 'discovery' | 'targeted' | 'wrapup';
  guests: number;
  discoveryLog: SwipeLogEntry[];
}

const PARTY_STAGES = ['Planning your party', 'Picking a spread of products'];
const READING_STAGES = ['Reading your swipes', 'Finding specific picks'];
const WRAP_STAGES = ['Tallying your basket'];

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState<string | null>(null);
  // Guest count of the active party, used for the checkout goal.
  const [partyGuests, setPartyGuests] = useState<number | null>(null);
  const party = useRef<PartySession | null>(null);
  const session = useRef(0);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  /** Shows thinking stages, then appends the reply unless the chat was reset meanwhile. */
  const reply = useCallback(async (produce: () => AgentReply | Promise<AgentReply>, stages?: string[]) => {
    const current = session.current;
    setThinking('');
    if (stages) await simulateThinking(setThinking, stages);
    const message = await produce();
    if (session.current !== current) return;
    setThinking(null);
    setMessages((m) => [...m, fromReply(message)]);
  }, []);

  const startDiscovery = (guests: number) => {
    party.current = { stage: 'discovery', guests, discoveryLog: [] };
    setPartyGuests(guests);
    return discoveryReply(guests);
  };

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setMessages((m) => [...m, { id: uid(), role: 'user', text: trimmed }]);

      const awaitingGuests = party.current?.stage === 'guests' ? parseGuests(trimmed, true) : undefined;
      if (awaitingGuests) return reply(() => startDiscovery(awaitingGuests), PARTY_STAGES);

      if (isPartyIntent(trimmed)) {
        const guests = parseGuests(trimmed);
        if (guests) return reply(() => startDiscovery(guests), PARTY_STAGES);
        party.current = { stage: 'guests', guests: 0, discoveryLog: [] };
        return reply(askGuests, ['Planning your party']);
      }

      return reply(() => askAgent(trimmed, setThinking));
    },
    [reply],
  );

  const completeSwipe = useCallback(
    (messageId: string, result: SwipeResult) => {
      const source = messagesRef.current.find((msg) => msg.id === messageId);
      setMessages((m) => m.map((msg) => (msg.id === messageId ? { ...msg, swipeResult: result } : msg)));

      const p = party.current;
      const kind = source?.deck?.kind ?? 'standard';
      if (kind === 'discovery' && p) {
        p.stage = 'targeted';
        p.discoveryLog = result.log;
        void reply(() => targetedReply(p.guests, result.log), READING_STAGES);
      } else if (kind === 'targeted' && p) {
        p.stage = 'wrapup';
        void reply(() => wrapUpReply(p.guests, p.discoveryLog, result), WRAP_STAGES);
      } else if (result.log.length) {
        setMessages((m) => [...m, fromReply(swipeFollowUp(result, source?.topicId))]);
      }
    },
    [reply],
  );

  const setView = useCallback((messageId: string, view: ProductView) => {
    setMessages((m) => m.map((msg) => (msg.id === messageId ? { ...msg, view } : msg)));
  }, []);

  const reset = useCallback(() => {
    session.current += 1;
    party.current = null;
    setPartyGuests(null);
    setThinking(null);
    setMessages([]);
  }, []);

  // Every finished swipe deck in the conversation, oldest first.
  const swipeHistory = useMemo(() => messages.flatMap((m) => m.swipeResult?.log ?? []), [messages]);

  return { messages, thinking, partyGuests, swipeHistory, send, completeSwipe, setView, reset };
}
