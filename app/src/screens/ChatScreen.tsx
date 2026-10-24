import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Message, MessageAvatar, MessageContent, MessageGroup, MessageHeader, MessageScroller } from "@/components/agents/message";
import { MessageBubble, MessageBubbleContent } from "@/components/agents/message-bubble";
import { AgentActivity, type AgentActivityItem } from "@/components/agents/agent-activity";
import { ToolResult, ToolResultOutput } from "@/components/agents/tool-result";
import { StreamingResponse } from "@/components/agents/streaming-response";
import { PromptInput } from "@/components/agents/prompt-input";
import { Button } from "@/components/motion/button";
import { EASE_OUT } from "@/lib/ease";
import { answer, type AnswerEvent, type SymbolInfo } from "../knowledge";
import { LIVE_REPO } from "../engine/live";
import type { ViewRequest } from "../engine/roomTypes";
import { Icon } from "../ui/Icon";

type Turn =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "assistant";
      question: string;
      activity: AgentActivityItem[];
      read?: SymbolInfo;
      text: string;
      sources: { file: string; symbol: string; line: number }[];
      view?: { view: ViewRequest; title: string };
      error?: string;
      status: "working" | "streaming" | "complete";
      started: number;
      took?: number;
    };

type Props = {
  /** Draw a view of the index as a graph. */
  onOpenView: (view: ViewRequest, question: string) => void;
  onMic: () => void;
  listening: boolean;
  /** Narrow layout, for the room's side pane. */
  compact?: boolean;
  /** A question that arrived by voice. */
  inbox?: { text: string; n: number };
};

/** `code` and **bold** from the narration, nothing more: the answer text is short and plain. */
function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("`") ? <code key={i} className="chat-code">{part.slice(1, -1)}</code> : part.startsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : <Fragment key={i}>{part}</Fragment>,
  );
}

const CALM = {
  initial: { opacity: 0, transform: "translateY(6px)" },
  animate: { opacity: 1, transform: "translateY(0px)" },
  transition: { duration: 0.22, ease: EASE_OUT },
} as const;

/**
 * Chat with the codebase, built from beUI's chat-app parts: the agent's tool calls
 * show as activity, the symbol it read as a tool result, then the streamed answer with its sources.
 */
export default function ChatScreen({ onOpenView, onMic, listening, inbox, compact }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const busy = turns.some((t) => t.role === "assistant" && t.status !== "complete");
  const stopRef = useRef(false);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setDraft("");
    stopRef.current = false;
    const id = `a-${Date.now()}`;
    setTurns((ts) => [
      ...ts,
      { id: `u-${Date.now()}`, role: "user", text: question },
      { id, role: "assistant", question, activity: [], text: "", sources: [], status: "working", started: Date.now() },
    ]);
    const patch = (f: (t: Extract<Turn, { role: "assistant" }>) => Partial<Extract<Turn, { role: "assistant" }>>) =>
      setTurns((ts) => ts.map((t) => (t.id === id && t.role === "assistant" ? { ...t, ...f(t) } : t)));

    for await (const e of answer(question) as AsyncGenerator<AnswerEvent>) {
      if (stopRef.current) break;
      if (e.type === "tool") {
        const item: AgentActivityItem =
          e.tool === "search-code"
            ? { id: `${id}-s`, type: "search", query: `search-code “${e.arg}”`, results: (e.hits ?? []).map((h) => ({ id: h.id, title: h.symbol, domain: `${h.file.split("/").pop()} · ${h.score.toFixed(2)}`, icon: <Icon name="fn" size={14} /> })) }
            : e.tool === "read-symbol"
              ? { id: `${id}-r`, type: "tool", action: "read", target: e.symbol?.file ?? e.arg }
              : { id: `${id}-c`, type: "step", label: `callers-of ${e.arg}`, status: "complete", meta: `${e.callers?.length ?? 0} found` };
        patch((t) => ({ activity: [...t.activity, item], ...(e.symbol ? { read: e.symbol } : {}) }));
      } else if (e.type === "text") patch((t) => ({ status: "streaming", text: t.text + e.delta }));
      else if (e.type === "sources") patch(() => ({ sources: e.files }));
      else if (e.type === "view") patch(() => ({ view: { view: e.view, title: e.title } }));
      else if (e.type === "error") patch(() => ({ status: "streaming", error: e.message }));
    }
    patch((t) => ({ status: "complete", took: Math.round((Date.now() - t.started) / 100) / 10 }));
  };

  useEffect(() => {
    if (inbox) ask(inbox.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inbox]);

  return (
    <div className={compact ? "chat compact" : "chat"}>
      <MessageScroller className="chat-scroll" contentClassName="chat-feed" followOutput smooth label="Conversation with the codebase" busy={busy}>
        {turns.length === 0 && (
          <div className="chat-empty">
            <h1>Ask {LIVE_REPO}</h1>
            <p>Answers come from the code index. Each one shows what was searched and read, and opens as a graph when there is one.</p>
          </div>
        )}
        {turns.map((t) =>
          t.role === "user" ? (
            <Message key={t.id} from="user" {...CALM}>
              <MessageContent>
                <MessageBubble variant="tint">
                  <MessageBubbleContent>{t.text}</MessageBubbleContent>
                </MessageBubble>
              </MessageContent>
            </Message>
          ) : (
            <Message key={t.id} from="assistant" {...CALM}>
              <MessageAvatar>
                <Icon name="sparkles" size={14} />
              </MessageAvatar>
              <MessageContent className="chat-answer">
                <MessageHeader>Spelunk</MessageHeader>
                <MessageGroup spacing="default">
                  <AgentActivity
                    items={t.activity}
                    contentType="mixed"
                    status={t.status === "working" ? "working" : "complete"}
                    duration={t.took ?? 0}
                    activeLabel="Searching the index"
                    summary={`Searched, read ${t.read ? 1 : 0} symbol${t.activity.length > 2 ? ", traced callers" : ""}`}
                  />
                  {t.read && (
                    <ToolResult
                      tool="read-symbol"
                      title={t.read.symbol}
                      meta={`${t.read.file}:${t.read.start}`}
                      status={t.status === "working" ? "running" : "success"}
                      defaultOpen={false}
                      copyText={t.read.code}
                    >
                      <ToolResultOutput language="rust">{t.read.code}</ToolResultOutput>
                    </ToolResult>
                  )}
                  {t.error && <p className="chat-text chat-error" role="alert">{t.error}</p>}
                  {t.status !== "working" && !t.error && (
                    <StreamingResponse
                      status={t.status === "complete" ? "complete" : "streaming"}
                      copyText={t.text.replace(/[`*]/g, "")}
                      sources={t.sources.map((s) => ({ id: `${s.file}:${s.line}`, title: s.symbol, domain: `${s.file}:${s.line}`, icon: <Icon name="file" size={14} /> }))}
                    >
                      <p className="chat-text">{inline(t.text)}</p>
                    </StreamingResponse>
                  )}
                  {t.view && t.status === "complete" && (
                    <div>
                      <Button size="sm" variant="primary" onClick={() => onOpenView(t.view!.view, t.question)}>
                        <Icon name="flow" size={14} /> Open “{t.view.title}” as a graph
                      </Button>
                    </div>
                  )}
                </MessageGroup>
              </MessageContent>
            </Message>
          ),
        )}
      </MessageScroller>

      <div className="chat-compose">
        <PromptInput
          value={draft}
          onValueChange={setDraft}
          onSubmit={(v) => ask(v)}
          loading={busy}
          onStop={() => (stopRef.current = true)}
          minRows={2}
          placeholder={`Ask ${LIVE_REPO} anything…`}
          leadingAction={
            <Button size="icon" variant={listening ? "primary" : "ghost"} aria-label={listening ? "Stop listening" : "Ask by voice"} onClick={onMic}>
              <Icon name="mic" size={16} />
            </Button>
          }
        />
      </div>
    </div>
  );
}
