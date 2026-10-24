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

export type LiveProps = {
  mode: LiveMode;
  done: boolean;
  interim: string;
  /** Who the interim words belong to. */
  speaker?: string;
  /** Live microphone analyser, so the orb moves with the actual voice. */
  analyser?: AnalyserNode | null;
  /** Which recogniser is listening in mic mode. */
  engine?: "reson8" | "browser";
  error?: string;
  utterances: Utterance[];
  suggestions: Suggestion[];
  states: Record<string, SuggestionState>;
  onMode: (m: Exclude<LiveMode, "off">) => void;
  onStop: () => void;
  onApply: (s: Suggestion) => void;
  onDismiss: (s: Suggestion) => void;
  /** The coding agent accepted proposals go to, if one is connected. */
  agentName?: string | null;
  sendState: ButtonState;
  onSend: (accepted: Suggestion[]) => void;
};

// One pigment set per speaker, matching their avatar colour: base, highlight, shadow.
const ORB: Record<string, readonly [string, string, string]> = {
  Alex: ["#64748b", "#e2e8f0", "#1e293b"],
  Sam: ["#12a594", "#c3f5ec", "#06473f"],
  You: ["#f48120", "#fde4c8", "#7a3c00"],
};

// Reson8 names voices "Speaker 1", "Speaker 2"…; each gets its own pigment.
const SPEAKER_ORBS = [ORB.You, ORB.Alex, ORB.Sam, ["#e5484d", "#ffd8d9", "#5c1416"] as const];
const orbFor = (who?: string) => ORB[who ?? "You"] ?? SPEAKER_ORBS[Number(who?.replace(/\D/g, "") || 1) % SPEAKER_ORBS.length];

// Rows fade up a few pixels with no overshoot: people read these while talking.
const CALM = {
  initial: { opacity: 0, transform: "translateY(6px)" },
  animate: { opacity: 1, transform: "translateY(0px)" },
  exit: { opacity: 0, transition: { duration: 0.12 } },
  transition: { duration: 0.22, ease: EASE_OUT },
} as const;

const modeLabel = (p: LiveProps, live: boolean) =>
  p.mode === "mic" ? (p.engine === "reson8" ? "Listening · Reson8" : "Listening · browser") : live ? "Demo conversation" : "Not listening";

/** Left pane: who is talking and what they said. The input to everything else on screen. */
export function ConversationPanel(p: LiveProps) {
  const live = p.mode !== "off" && !(p.mode === "demo" && p.done);
  const speaking = p.mode === "mic" ? p.speaker ?? "You" : p.speaker;
  const showSpeaking = live && (p.mode === "mic" || !!p.interim);
  return (
    <div className="pane">
      <header className="pane-head">
        <VoiceOrb className="live-orb" active={live} analyser={p.analyser} activity={p.interim ? 0.7 : live ? 0.25 : 0} aria-label="Conversation activity" />
        <div className="live-title">
          <b>Conversation</b>
          <AnimatedBadge size="sm" status={live ? "info" : "neutral"} pulse={live}>
            {modeLabel(p, live)}
          </AnimatedBadge>
        </div>
      </header>

      <MessageScroller className="pane-scroll" contentClassName="live-feed" viewportClassName="overflow-x-hidden" followOutput label="Conversation">
        {p.utterances.length === 0 && !p.interim && (
          <p className="live-empty">Talk about the code. Every sentence that names a real symbol becomes a proposal, grounded in the graph.</p>
        )}
        {p.utterances.map((u) => {
          const n = p.suggestions.filter((s) => s.from === u.id && p.states[s.id] !== "rejected").length;
          return (
            <Message key={u.id} from={u.speaker === "You" ? "user" : "assistant"} {...CALM} data-speaker={u.speaker}>
              <MessageAvatar>{u.speaker.slice(0, 1)}</MessageAvatar>
              <MessageContent>
                <MessageHeader>
                  {u.speaker}
                  {n > 0 && <span className="live-tag">{n} proposal{n > 1 ? "s" : ""}</span>}
                </MessageHeader>
                <MessageBubble variant={u.speaker === "Sam" ? "tint" : "soft"}>
                  <MessageBubbleContent>{u.text}</MessageBubbleContent>
                </MessageBubble>
              </MessageContent>
            </Message>
          );
        })}
        {/* The voice row: an orb that moves with the speaker's voice, and their words filling a bubble as they're recognised. */}
        <AnimatePresence>
          {showSpeaking && (
            <Message key="speaking" from={speaking === "You" ? "user" : "assistant"} {...CALM} data-speaker={speaking} className="live-speaking">
              <MessageAvatar className="live-voice">
                <VoiceOrb analyser={p.analyser} activity={p.interim ? 0.75 : 0.15} colors={orbFor(speaking)} aria-label={`${speaking ?? "Someone"} is speaking`} />
              </MessageAvatar>
              <MessageContent>
                <MessageHeader>{p.interim ? `${speaking} is speaking` : "Listening to the room"}</MessageHeader>
                <MessageBubble variant="outline">
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
      <footer className="pane-foot">
        <Button size="sm" variant={p.mode === "mic" ? "primary" : "secondary"} onClick={() => (p.mode === "mic" ? p.onStop() : p.onMode("mic"))}>
          <Icon name={p.mode === "mic" ? "stop" : "mic"} size={14} /> {p.mode === "mic" ? "Stop listening" : "Listen to the room"}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => p.onMode("demo")}>
          <Icon name="replay" size={14} /> {p.mode === "demo" && !p.done ? "Restart demo" : "Play demo"}
        </Button>
      </footer>
    </div>
  );
}

/** Right pane, first tab: what the conversation proposes, and the batch that goes to the agent. */
export function ProposalsPanel(p: LiveProps) {
  const accepted = p.suggestions.filter((s) => p.states[s.id] === "approved");
  const sent = p.suggestions.filter((s) => p.states[s.id] === "sent").length;
  const shown = p.suggestions.filter((s) => p.states[s.id] !== "rejected");
  const said = (s: Suggestion) => p.utterances.find((u) => u.id === s.from);
  return (
    <div className="pane">
      <MessageScroller className="pane-scroll" contentClassName="prop-feed" viewportClassName="overflow-x-hidden" followOutput label="Proposals">
        {shown.length === 0 && <p className="live-empty">Nothing proposed yet. When the conversation names a symbol on the graph, it lands here for an accept or a dismiss — nothing moves without a yes.</p>}
        <AnimatePresence initial={false}>
          {shown.map((s) => {
            const u = said(s);
            const st = p.states[s.id];
            return (
              <motion.div key={s.id} {...CALM}>
                {u && (
                  <p className="prop-quote">
                    <b>{u.speaker}</b> “{u.text}”
                  </p>
                )}
                <ApprovalCard
                  className="live-card"
                  title={s.title}
                  description={s.why}
                  status={st === "approved" || st === "sent" ? "approved" : "pending"}
                  approveLabel={s.kind === "ask" ? "Ask it" : "Accept"}
                  result={st === "sent" ? `Sent to ${p.agentName ?? "the agent"}` : s.kind === "ask" ? "Accepted · building the answer" : "Accepted · highlighted on the graph"}
                  onApprove={() => p.onApply(s)}
                  onDismiss={() => p.onDismiss(s)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </MessageScroller>

      {/* Accepted proposals wait here until someone hands them to the agent in one batch. */}
      <section className="live-tray" aria-label="Accepted proposals">
        <div className="live-tray-head">
          <b>Ready for the agent</b>
          <AnimatedBadge size="sm" status={accepted.length ? "success" : "neutral"} showIcon={false}>
            {accepted.length}
          </AnimatedBadge>
          {sent > 0 && <span className="live-tray-sent">{sent} sent</span>}
        </div>
        {accepted.length > 0 && (
          <ul className="live-tray-list">
            {accepted.map((s) => (
              <li key={s.id}>
                <Icon name={s.kind === "ask" ? "ripple" : "target"} size={13} /> {s.title}
              </li>
            ))}
          </ul>
        )}
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
          {accepted.length ? `Send ${accepted.length} to ${p.agentName ?? "the agent"}` : "Accept proposals to send them"}
        </StatefulButton>
      </section>
    </div>
  );
}
