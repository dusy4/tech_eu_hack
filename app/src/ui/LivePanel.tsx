import { Fragment } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EASE_OUT } from "@/lib/ease";
import { Message, MessageAvatar, MessageContent, MessageHeader, MessageScroller, MessageTyping } from "@/components/agents/message";
import { MessageBubble, MessageBubbleContent } from "@/components/agents/message-bubble";
import { ApprovalCard } from "@/components/agents/approval-card";
import { VoiceOrb } from "@/components/agents/voice-orb";
import { AnimatedBadge } from "@/components/motion/animated-badge";
import { Button, StatefulButton, type ButtonState } from "@/components/motion/button";
import type { Suggestion, Utterance } from "../engine/suggest";
import type { LiveMode } from "../engine/useLiveTranscript";
import { Icon } from "./Icon";

export type SuggestionState = "pending" | "approved" | "rejected" | "sent";

type Props = {
  mode: LiveMode;
  done: boolean;
  interim: string;
  /** Who the interim words belong to. */
  speaker?: string;
  /** Live microphone analyser, so the orb moves with the actual voice. */
  analyser?: AnalyserNode | null;
  error?: string;
  utterances: Utterance[];
  suggestions: Suggestion[];
  states: Record<string, SuggestionState>;
  onMode: (m: Exclude<LiveMode, "off">) => void;
  onClose: () => void;
  onApply: (s: Suggestion) => void;
  onDismiss: (s: Suggestion) => void;
  /** The coding agent accepted proposals go to, if one is connected. */
  agentName?: string | null;
  sendState: ButtonState;
  onSend: (accepted: Suggestion[]) => void;
};

/**
 * The conversation beside the graph: what people said, and under each line what it
 * suggests doing to the view. Built from beUI's message and approval-card parts.
 */
// One pigment set per speaker, matching their avatar colour: base, highlight, shadow.
const ORB: Record<string, readonly [string, string, string]> = {
  Alex: ["#8e4ec6", "#e9d7fe", "#3b1a5c"],
  Sam: ["#12a594", "#c3f5ec", "#06473f"],
  You: ["#2d72d2", "#d3e4fd", "#0d2f63"],
};

export default function LivePanel(p: Props) {
  const live = p.mode !== "off" && !(p.mode === "demo" && p.done);
  const speaking = p.mode === "mic" ? p.speaker ?? "You" : p.speaker;
  const showSpeaking = live && (p.mode === "mic" || !!p.interim);
  const accepted = p.suggestions.filter((s) => p.states[s.id] === "approved");
  const sent = p.suggestions.filter((s) => p.states[s.id] === "sent").length;
  return (
    <div className="live-panel">
      <header className="live-head">
        <VoiceOrb className="live-orb" active={live} analyser={p.analyser} activity={p.interim ? 0.7 : live ? 0.25 : 0} aria-label="Conversation activity" />
        <div className="live-title">
          <b>Live suggestions</b>
          <AnimatedBadge size="sm" status={live ? "info" : "neutral"} pulse={live}>
            {p.mode === "mic" ? "Listening" : live ? "Demo conversation" : "Paused"}
          </AnimatedBadge>
        </div>
        <Button size="icon" variant="ghost" aria-label="Close live suggestions" onClick={p.onClose}>
          <Icon name="close" size={16} />
        </Button>
      </header>

      <MessageScroller className="live-scroll" contentClassName="live-feed" viewportClassName="overflow-x-hidden" followOutput label="Conversation">
        {p.utterances.length === 0 && !p.interim && (
          <p className="live-empty">
            As people talk about this code, each sentence is matched to the graph. Suggestions show up here and the nodes they mean start to glow.
          </p>
        )}
        {p.utterances.map((u) => (
          <Fragment key={u.id}>
            <Message from={u.speaker === "You" ? "user" : "assistant"} animateIn data-speaker={u.speaker}>
              <MessageAvatar>{u.speaker.slice(0, 1)}</MessageAvatar>
              <MessageContent>
                <MessageHeader>{u.speaker}</MessageHeader>
                <MessageBubble variant={u.speaker === "Sam" ? "tint" : "soft"} animateIn>
                  <MessageBubbleContent>{u.text}</MessageBubbleContent>
                </MessageBubble>
              </MessageContent>
            </Message>
            {p.suggestions
              .filter((s) => s.from === u.id && p.states[s.id] !== "rejected")
              .map((s) => (
                <ApprovalCard
                  key={s.id}
                  className="live-card"
                  title={s.title}
                  description={s.why}
                  status={p.states[s.id] === "approved" || p.states[s.id] === "sent" ? "approved" : "pending"}
                  approveLabel={s.kind === "ask" ? "Ask it" : "Show me"}
                  result={p.states[s.id] === "sent" ? `Sent to ${p.agentName ?? "the agent"}` : s.kind === "ask" ? "Accepted · building the answer" : "Accepted · highlighted on the graph"}
                  onApprove={() => p.onApply(s)}
                  onDismiss={() => p.onDismiss(s)}
                />
              ))}
          </Fragment>
        ))}
        {/* The voice row: an orb that moves with the speaker's voice, and their words filling a bubble as they're recognised. */}
        <AnimatePresence>
          {showSpeaking && (
            <Message key="speaking" from={speaking === "You" ? "user" : "assistant"} animateIn data-speaker={speaking} className="live-speaking">
              <MessageAvatar className="live-voice">
                <VoiceOrb
                  analyser={p.analyser}
                  activity={p.interim ? 0.75 : 0.15}
                  colors={ORB[speaking ?? "You"] ?? ORB.You}
                  aria-label={`${speaking ?? "Someone"} is speaking`}
                />
              </MessageAvatar>
              <MessageContent>
                <MessageHeader>{p.interim ? `${speaking} is speaking` : "Listening to the room"}</MessageHeader>
                <MessageBubble variant="outline" animateIn>
                  <MessageBubbleContent>
                    {p.interim ? (
                      <>
                        {p.interim}
                        <span className="live-caret" aria-hidden="true" />
                      </>
                    ) : (
                      <MessageTyping label="Listening" />
                    )}
                  </MessageBubbleContent>
                </MessageBubble>
              </MessageContent>
            </Message>
          )}
        </AnimatePresence>
      </MessageScroller>

      {p.error && <p className="live-error">{p.error}</p>}
      {/* Accepted proposals wait here until someone hands them to the agent in one batch. */}
      <AnimatePresence initial={false}>
        {(accepted.length > 0 || p.sendState !== "idle") && (
          <motion.section
            key="tray"
            className="live-tray"
            initial={{ opacity: 0, transform: "translateY(8px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: 0, transform: "translateY(8px)", transition: { duration: 0.14 } }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            aria-label="Accepted proposals"
          >
            <div className="live-tray-head">
              <b>Accepted proposals</b>
              <AnimatedBadge size="sm" status="success" showIcon={false}>
                {accepted.length}
              </AnimatedBadge>
              {sent > 0 && <span className="live-tray-sent">{sent} sent</span>}
            </div>
            <ul className="live-tray-list">
              <AnimatePresence initial={false}>
                {accepted.map((s) => (
                  <motion.li
                    key={s.id}
                    layout
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, transition: { duration: 0.12 } }}
                    transition={{ duration: 0.2, ease: EASE_OUT }}
                  >
                    <Icon name={s.kind === "ask" ? "ripple" : "target"} size={13} /> {s.title}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <StatefulButton
              size="sm"
              className="live-send"
              state={p.sendState}
              disabled={accepted.length === 0 && p.sendState === "idle"}
              loadingText="Sending"
              successText={`Sent to ${p.agentName ?? "the agent"}`}
              errorText="Couldn't send, try again"
              icon={<Icon name="arrow" size={14} />}
              onClick={() => accepted.length && p.onSend(accepted)}
            >
              Send {accepted.length || ""} to {p.agentName ?? "the agent"}
            </StatefulButton>
          </motion.section>
        )}
      </AnimatePresence>
      <footer className="live-foot">
        <Button size="sm" variant={p.mode === "mic" ? "primary" : "secondary"} onClick={() => p.onMode("mic")}>
          <Icon name="mic" size={14} /> Listen to the room
        </Button>
        <Button size="sm" variant={p.mode === "demo" ? "primary" : "secondary"} onClick={() => p.onMode("demo")}>
          <Icon name="replay" size={14} /> {p.mode === "demo" && p.done ? "Replay demo" : "Demo"}
        </Button>
      </footer>
    </div>
  );
}
