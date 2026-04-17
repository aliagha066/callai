"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import type { ChatMessage } from "@/data/sampleMessages";
import { sampleMessages } from "@/data/sampleMessages";
import { ChatInput } from "@/components/ChatInput";
import { MessageBubble } from "@/components/MessageBubble";
import { AuthControls } from "@/components/AuthControls";
import { useAuthUI } from "@/components/AuthUIProvider";
import { SettingsPanel } from "@/components/SettingsPanel";
import { SettingsProvider, useSettings } from "@/components/SettingsProvider";
import { VoiceInputPanel } from "@/components/VoiceInputPanel";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  brandName?: string;
};

type PreferredLanguage = "Auto" | "English" | "Azerbaijani" | "Turkish";
type CompanionMode = "Friend" | "Coach" | "Calm listener";
type ResponseStyle = "Short" | "Balanced" | "Deep";

type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_CHATS_KEY = "callai.chat.sessions.v1";
const STORAGE_ACTIVE_KEY = "callai.chat.activeId.v1";
const TYPING_ID = "typing";
const LOGIN_BANNER_SEEN_BY_CHAT_KEY = "callai.ui.loginBannerSeenByChat.v1";
const SUPA_ACTIVE_KEY_PREFIX = "callai.sb.activeId.v1.";
const AI_NAME_CACHE_KEY = "callai.settings.ai_name.v1";
const GUEST_SETTINGS_KEY = "callai.settings.guest.v1";

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatYmd(timestamp: string) {
  // Stable format for SSR/CSR hydration (no locale differences).
  // If timestamp is ISO, slicing is consistent; otherwise Date() fallback still yields ISO.
  if (typeof timestamp === "string" && timestamp.length >= 10) {
    const maybeIso = timestamp.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(maybeIso)) return maybeIso;
  }
  try {
    return new Date(timestamp).toISOString().slice(0, 10);
  } catch {
    return "—";
  }
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const v = value as { id?: unknown; role?: unknown; content?: unknown };
  return (
    typeof v.id === "string" &&
    (v.role === "user" || v.role === "assistant") &&
    typeof v.content === "string"
  );
}

function isChatSession(value: unknown): value is ChatSession {
  if (!value || typeof value !== "object") return false;
  const v = value as {
    id?: unknown;
    title?: unknown;
    messages?: unknown;
    pinned?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  };

  if (
    typeof v.id !== "string" ||
    typeof v.title !== "string" ||
    typeof v.createdAt !== "string" ||
    typeof v.updatedAt !== "string" ||
    !Array.isArray(v.messages)
  ) {
    return false;
  }

  if (typeof v.pinned !== "undefined" && typeof v.pinned !== "boolean") {
    return false;
  }

  return v.messages.every(isChatMessage);
}

function getWelcomeState(): ChatMessage[] {
  const welcome = sampleMessages.find((m) => m.role === "assistant");
  return welcome ? [welcome] : [];
}

function getWelcomeMessage(): ChatMessage | null {
  const welcome = sampleMessages.find((m) => m.role === "assistant");
  return welcome ?? null;
}

function loadStoredState(): { chats: ChatSession[]; activeChatId: string } | null {
  try {
    const rawChats = window.localStorage.getItem(STORAGE_CHATS_KEY);
    if (!rawChats) return null;
    const parsedChats = JSON.parse(rawChats) as unknown;
    if (!Array.isArray(parsedChats)) return null;
    const chats = parsedChats
      .filter(isChatSession)
      .map((c) => ({
        ...c,
        pinned: typeof c.pinned === "boolean" ? c.pinned : false,
        messages: c.messages.filter((m) => m.id !== TYPING_ID),
      }));
    if (!chats.length) return null;

    const activeChatId =
      window.localStorage.getItem(STORAGE_ACTIVE_KEY) || chats[0].id;
    const exists = chats.some((c) => c.id === activeChatId);

    return { chats, activeChatId: exists ? activeChatId : chats[0].id };
  } catch {
    return null;
  }
}

function saveStoredState(chats: ChatSession[], activeChatId: string) {
  try {
    const safeChats = chats.map((c) => ({
      ...c,
      messages: c.messages.filter((m) => m.id !== TYPING_ID),
    }));
    window.localStorage.setItem(STORAGE_CHATS_KEY, JSON.stringify(safeChats));
    window.localStorage.setItem(STORAGE_ACTIVE_KEY, activeChatId);
  } catch {
    // ignore storage failures (private mode/quota/etc.)
  }
}

function ChatWindowInner({ brandName = "CallAI" }: Props) {
  const { user, openLogin } = useAuthUI();
  const { open: openSettingsPanel } = useSettings();
  const isAuthed = !!user;
  const authedUserId = user?.id ?? null;
  const [aiName, setAiName] = useState<string>("Sofia");
  const [displayName, setDisplayName] = useState<string>("");
  const [preferredLanguage, setPreferredLanguage] =
    useState<PreferredLanguage>("Auto");
  const [companionMode, setCompanionMode] = useState<CompanionMode>("Friend");
  const [responseStyle, setResponseStyle] =
    useState<ResponseStyle>("Balanced");
  const initialChat: ChatSession = useMemo(() => {
    const now = new Date().toISOString();
    return {
      id: createId(),
      title: "New Chat",
      messages: getWelcomeState(),
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };
  }, []);

  const [chats, setChats] = useState<ChatSession[]>([initialChat]);
  const [activeChatId, setActiveChatId] = useState<string>(initialChat.id);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const [chatSearch, setChatSearch] = useState<string>("");
  const [didRestore, setDidRestore] = useState(false);
  const [loginBannerSeenByChat, setLoginBannerSeenByChat] = useState<
    Record<string, 1>
  >({});
  const [interactedByChat, setInteractedByChat] = useState<Record<string, 1>>({});
  const [loginBannerVisibleByChat, setLoginBannerVisibleByChat] = useState<
    Record<string, 1>
  >({});
  const [mobileChatDrawerOpen, setMobileChatDrawerOpen] = useState(false);
  const [mobileChatRowMenuId, setMobileChatRowMenuId] = useState<string | null>(
    null,
  );
  const mobileChatRowMenuIdRef = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const [comingSoonKind, setComingSoonKind] = useState<"video" | null>(null);
   const [voiceInputOpen, setVoiceInputOpen] = useState(false);
  const [autoPlayVoice, setAutoPlayVoice] = useState(false);
  const [ttsSpeakingMessageId, setTtsSpeakingMessageId] = useState<string | null>(
    null,
  );
  const [voiceOutputUserActivated, setVoiceOutputUserActivated] = useState(false);

  useEffect(() => {
    mobileChatRowMenuIdRef.current = mobileChatRowMenuId;
  }, [mobileChatRowMenuId]);

  const headerActions = useMemo(
    () =>
      [
        { label: "Voice", hint: "Dictate into the message box", action: "voice" as const },
        { label: "Video", hint: "Video (preview)", action: "video" as const },
        {
          label: "Modes",
          hint: "Open settings — companion mode & style",
          action: "modes" as const,
        },
      ] as const,
    [],
  );

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) || chats[0],
    [chats, activeChatId],
  );

  const messages = useMemo(() => activeChat?.messages ?? [], [activeChat]);

  const lastAssistantMessageId = useMemo(() => {
    let last: string | null = null;
    for (const m of messages) {
      if (m.role === "assistant" && m.id !== TYPING_ID) last = m.id;
    }
    return last;
  }, [messages]);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore
    }
    setTtsSpeakingMessageId(null);
  }, [activeChatId]);

  const handleTtsStart = useCallback((id: string) => {
    setTtsSpeakingMessageId(id);
  }, []);

  const handleTtsEnd = useCallback((id: string) => {
    setTtsSpeakingMessageId((prev) => (prev === id ? null : prev));
  }, []);

  const filteredChats = useMemo(() => {
    const q = chatSearch.trim().toLowerCase();
    const base = q
      ? chats.filter((c) => (c.title || "New Chat").toLowerCase().includes(q))
      : chats;

    const pinned = base.filter((c) => c.pinned);
    const normal = base.filter((c) => !c.pinned);
    return [...pinned, ...normal];
  }, [chats, chatSearch]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (!mobileChatDrawerOpen) {
      setMobileChatRowMenuId(null);
      return;
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (mobileChatRowMenuIdRef.current) {
        setMobileChatRowMenuId(null);
        return;
      }
      setMobileChatDrawerOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileChatDrawerOpen]);

  useEffect(() => {
    if (!mobileChatRowMenuId) return;
    function onPointerDown(e: PointerEvent) {
      const el = e.target;
      if (!(el instanceof Element)) return;
      if (el.closest("[data-mobile-chat-menu-root]")) return;
      setMobileChatRowMenuId(null);
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [mobileChatRowMenuId]);

  useEffect(() => {
    if (isAuthed) return;
    const stored = loadStoredState();
    if (stored?.chats?.length) {
      setChats(stored.chats);
      setActiveChatId(stored.activeChatId);
    } else {
      // No stored chats: create a single starter chat once.
      setChats([initialChat]);
      setActiveChatId(initialChat.id);
    }
    setDidRestore(true);
  }, [initialChat, isAuthed]);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(LOGIN_BANNER_SEEN_BY_CHAT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object") return;
      setLoginBannerSeenByChat(parsed as Record<string, 1>);
    } catch {
      setLoginBannerSeenByChat({});
    }
  }, []);

  useEffect(() => {
    // Typing indicator name: guest from localStorage, authed from Supabase.
    let cancelled = false;

    function readGuestSettings() {
      try {
        const cached = window.localStorage.getItem(AI_NAME_CACHE_KEY);
        const cachedAiName = cached && cached.trim() ? cached.trim().slice(0, 40) : null;

        const guestRaw = window.localStorage.getItem(GUEST_SETTINGS_KEY);
        if (!guestRaw) {
          return {
            aiName: cachedAiName,
            displayName: null,
            preferredLanguage: null,
            companionMode: null,
            responseStyle: null,
          };
        }

        const parsed = JSON.parse(guestRaw) as unknown;
        if (!parsed || typeof parsed !== "object") {
          return {
            aiName: cachedAiName,
            displayName: null,
            preferredLanguage: null,
            companionMode: null,
            responseStyle: null,
          };
        }

        const obj = parsed as Record<string, unknown>;

        const aiRaw = obj.ai_name ?? obj.aiName;
        const aiFromSettings =
          typeof aiRaw === "string" && aiRaw.trim() ? aiRaw.trim().slice(0, 40) : null;

        const dnRaw = obj.display_name ?? obj.displayName;
        const displayName =
          typeof dnRaw === "string" && dnRaw.trim() ? dnRaw.trim().slice(0, 40) : null;

        const plRaw = obj.preferred_language ?? obj.preferredLanguage;
        const preferredLanguage =
          plRaw === "Auto" ||
          plRaw === "English" ||
          plRaw === "Azerbaijani" ||
          plRaw === "Turkish"
            ? (plRaw as PreferredLanguage)
            : null;

        const cmRaw = obj.companion_mode ?? obj.companionMode;
        const companionMode =
          cmRaw === "Friend" || cmRaw === "Coach" || cmRaw === "Calm listener"
            ? (cmRaw as CompanionMode)
            : null;

        const rsRaw = obj.response_style ?? obj.responseStyle;
        const responseStyle =
          rsRaw === "Short" || rsRaw === "Balanced" || rsRaw === "Deep"
            ? (rsRaw as ResponseStyle)
            : null;

        return {
          aiName: aiFromSettings || cachedAiName,
          displayName,
          preferredLanguage,
          companionMode,
          responseStyle,
        };
      } catch {
        // ignore
      }
      return {
        aiName: null,
        displayName: null,
        preferredLanguage: null,
        companionMode: null,
        responseStyle: null,
      };
    }

    async function readAuthedSettings(uid: string) {
      try {
        const { data, error } = await supabase
          .from("user_settings")
          .select(
            "display_name,ai_name,preferred_language,companion_mode,response_style",
          )
          .eq("user_id", uid)
          .maybeSingle();
        if (error) throw error;

        const aiName =
          typeof data?.ai_name === "string" && data.ai_name.trim()
            ? data.ai_name.trim().slice(0, 40)
            : null;

        const displayName =
          typeof (data as { display_name?: unknown })?.display_name === "string" &&
          (data as { display_name?: string }).display_name?.trim()
            ? (data as { display_name: string }).display_name.trim().slice(0, 40)
            : null;

        const preferredLanguageRaw = (data as { preferred_language?: unknown })
          ?.preferred_language;
        const preferredLanguage =
          preferredLanguageRaw === "Auto" ||
          preferredLanguageRaw === "English" ||
          preferredLanguageRaw === "Azerbaijani" ||
          preferredLanguageRaw === "Turkish"
            ? (preferredLanguageRaw as PreferredLanguage)
            : null;

        const companionModeRaw = (data as { companion_mode?: unknown })?.companion_mode;
        const companionMode =
          companionModeRaw === "Friend" ||
          companionModeRaw === "Coach" ||
          companionModeRaw === "Calm listener"
            ? (companionModeRaw as CompanionMode)
            : null;

        const responseStyleRaw = (data as { response_style?: unknown })?.response_style;
        const responseStyle =
          responseStyleRaw === "Short" ||
          responseStyleRaw === "Balanced" ||
          responseStyleRaw === "Deep"
            ? (responseStyleRaw as ResponseStyle)
            : null;

        return { aiName, displayName, preferredLanguage, companionMode, responseStyle };
      } catch {
        return {
          aiName: null,
          displayName: null,
          preferredLanguage: null,
          companionMode: null,
          responseStyle: null,
        };
      }
    }

    async function load() {
      const guest = readGuestSettings();
      if (!authedUserId) {
        if (cancelled) return;
        setAiName(guest.aiName || "Sofia");
        setDisplayName(guest.displayName || "");
        setPreferredLanguage(guest.preferredLanguage || "Auto");
        setCompanionMode(guest.companionMode || "Friend");
        setResponseStyle(guest.responseStyle || "Balanced");
        return;
      }

      if (cancelled) return;
      const authed = await readAuthedSettings(authedUserId);
      if (cancelled) return;

      setAiName(authed.aiName || guest.aiName || "Sofia");
      setDisplayName(authed.displayName || guest.displayName || "");
      setPreferredLanguage(authed.preferredLanguage || guest.preferredLanguage || "Auto");
      setCompanionMode(authed.companionMode || guest.companionMode || "Friend");
      setResponseStyle(authed.responseStyle || guest.responseStyle || "Balanced");
    }

    function onLocalChange() {
      void load();
    }

    function onAiNameEvent(e: Event) {
      const ce = e as CustomEvent<{ aiName?: string }>;
      const next = ce?.detail?.aiName;
      if (typeof next === "string" && next.trim()) {
        setAiName(next.trim().slice(0, 40));
      }
    }

    void load();
    window.addEventListener("storage", onLocalChange);
    window.addEventListener("callai:settings-saved", onLocalChange);
    window.addEventListener("callai:ai-name-updated", onAiNameEvent as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onLocalChange);
      window.removeEventListener("callai:settings-saved", onLocalChange);
      window.removeEventListener(
        "callai:ai-name-updated",
        onAiNameEvent as EventListener,
      );
    };
  }, [authedUserId]);

  useEffect(() => {
    if (!didRestore) return;
    if (!activeChatId || !chats.length) return;
    if (!isAuthed) saveStoredState(chats, activeChatId);
  }, [chats, activeChatId, didRestore, isAuthed]);

  useEffect(() => {
    if (!authedUserId) return;
    let cancelled = false;

    async function loadAuthed() {
      setIsLoading(true);
      setError(null);
      try {
        const { data: chatsData, error: chatsErr } = await supabase
          .from("chats")
          .select("id,title,created_at")
          .eq("user_id", authedUserId)
          .order("created_at", { ascending: false });
        if (chatsErr) throw chatsErr;

        const mapped: ChatSession[] =
          (chatsData ?? []).map((c) => ({
            id: c.id as string,
            title: (c.title as string) || "New Chat",
            messages: [],
            pinned: false,
            createdAt: new Date(c.created_at as string).toISOString(),
            updatedAt: new Date(c.created_at as string).toISOString(),
          })) ?? [];

        // Ensure at least one chat exists, but do NOT create a new one automatically.
        // If none exist, show a single empty welcome-only chat locally until user clicks New Chat.
        if (cancelled) return;

        if (mapped.length === 0) {
          const now = new Date().toISOString();
          const ephemeral: ChatSession = {
            id: "ephemeral",
            title: "New Chat",
            messages: getWelcomeState(),
            pinned: false,
            createdAt: now,
            updatedAt: now,
          };
          setChats([ephemeral]);
          setActiveChatId(ephemeral.id);
          setDidRestore(true);
          return;
        }

        // Restore active chat id for this user
        let nextActive = mapped[0].id;
        try {
          const storedActive = window.localStorage.getItem(
            `${SUPA_ACTIVE_KEY_PREFIX}${authedUserId}`,
          );
          if (storedActive && mapped.some((c) => c.id === storedActive)) {
            nextActive = storedActive;
          }
        } catch {
          // ignore
        }

        setChats(mapped);
        setActiveChatId(nextActive);
        setDidRestore(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load chats";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    }

    loadAuthed();
    return () => {
      cancelled = true;
    };
  }, [authedUserId]);

  useEffect(() => {
    if (!authedUserId) return;
    if (!activeChatId || activeChatId === "ephemeral") return;
    try {
      window.localStorage.setItem(
        `${SUPA_ACTIVE_KEY_PREFIX}${authedUserId}`,
        activeChatId,
      );
    } catch {
      // ignore
    }
  }, [authedUserId, activeChatId]);

  useEffect(() => {
    if (!isAuthed) return;
    if (!activeChatId || activeChatId === "ephemeral") return;
    let cancelled = false;

    async function loadMessagesForActive() {
      try {
        const current = chats.find((c) => c.id === activeChatId);
        // Avoid refetch spam if already loaded.
        if (current && current.messages.length > 0) return;

        const { data, error: msgErr } = await supabase
          .from("messages")
          .select("id,role,content,created_at")
          .eq("chat_id", activeChatId)
          .order("created_at", { ascending: true });
        if (msgErr) throw msgErr;
        if (cancelled) return;

        const mappedMsgs: ChatMessage[] =
          (data ?? []).map((m) => ({
            id: m.id as string,
            role: m.role as "user" | "assistant",
            content: m.content as string,
            createdAt: new Date(m.created_at as string).toISOString(),
          })) ?? [];

        setChats((prev) =>
          prev.map((c) =>
            c.id === activeChatId ? { ...c, messages: mappedMsgs } : c,
          ),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load messages";
        setError(msg);
      }
    }

    loadMessagesForActive();
    return () => {
      cancelled = true;
    };
  }, [isAuthed, activeChatId, chats]);

  const userMessageCount = useMemo(() => {
    // Count only USER messages in the ACTIVE chat.
    return messages.reduce((acc, m) => acc + (m.role === "user" ? 1 : 0), 0);
  }, [messages]);

  const showLoginBanner =
    !user && loginBannerVisibleByChat[activeChatId] === 1;

  useEffect(() => {
    // Trigger banner only after interaction in this chat, and only once per chat per session.
    if (user) return;
    if (interactedByChat[activeChatId] !== 1) return;
    if (loginBannerSeenByChat[activeChatId] === 1) return;
    if (userMessageCount < 3) return;

    setLoginBannerVisibleByChat((prev) => ({ ...prev, [activeChatId]: 1 }));

    try {
      const next = { ...loginBannerSeenByChat, [activeChatId]: 1 as const };
      window.sessionStorage.setItem(
        LOGIN_BANNER_SEEN_BY_CHAT_KEY,
        JSON.stringify(next),
      );
      setLoginBannerSeenByChat(next);
    } catch {
      setLoginBannerSeenByChat((prev) => ({ ...prev, [activeChatId]: 1 }));
    }
  }, [activeChatId, user, interactedByChat, loginBannerSeenByChat, userMessageCount]);

  function updateActiveChat(updater: (chat: ChatSession) => ChatSession) {
    setChats((prev) => {
      const idx = prev.findIndex((c) => c.id === activeChatId);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = updater(next[idx]);
      return next;
    });
  }

  function createNewChat(opts?: { openMobileDrawer?: boolean }) {
    const now = new Date().toISOString();
    setIsLoading(false);
    setError(null);
    setText("");
    const openDrawer =
      !!opts?.openMobileDrawer &&
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches;

    if (!isAuthed || !user) {
      const chat: ChatSession = {
        id: createId(),
        title: "New Chat",
        messages: getWelcomeState(),
        pinned: false,
        createdAt: now,
        updatedAt: now,
      };
      setChats((prev) => [chat, ...prev]);
      setActiveChatId(chat.id);
      if (openDrawer) setMobileChatDrawerOpen(true);
      return;
    }

    (async () => {
      try {
        const { data, error: chatErr } = await supabase
          .from("chats")
          .insert({ user_id: authedUserId, title: "New Chat" })
          .select("id,created_at")
          .single();
        if (chatErr) throw chatErr;

        const chatId = data.id as string;
        const createdAt = new Date(data.created_at as string).toISOString();

        const welcome = getWelcomeMessage();
        if (welcome) {
          await supabase.from("messages").insert({
            chat_id: chatId,
            role: "assistant",
            content: welcome.content,
          });
        }

        const chat: ChatSession = {
          id: chatId,
          title: "New Chat",
          messages: welcome ? [welcome] : [],
          pinned: false,
          createdAt,
          updatedAt: createdAt,
        };

        setChats((prev) => [chat, ...prev.filter((c) => c.id !== "ephemeral")]);
        setActiveChatId(chat.id);
        if (openDrawer) setMobileChatDrawerOpen(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to create chat";
        setError(msg);
      }
    })();
  }

  function beginRename(chat: ChatSession) {
    if (isLoading) return;
    setEditingChatId(chat.id);
    setEditingTitle(chat.title || "");
  }

  function commitRename(chatId: string, nextRaw: string) {
    const nextTitle = nextRaw.trim().slice(0, 40) || "New Chat";
    setEditingChatId(null);
    setEditingTitle("");

    const now = new Date().toISOString();
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId ? { ...c, title: nextTitle, updatedAt: now } : c,
      ),
    );

    if (isAuthed && chatId !== "ephemeral") {
      supabase.from("chats").update({ title: nextTitle }).eq("id", chatId);
    }
  }

  function deleteChat(chatId: string) {
    setIsLoading(false);
    setError(null);
    setText("");
    setEditingChatId((prev) => (prev === chatId ? null : prev));
    setEditingTitle((prev) => prev);

    setChats((prev) => {
      const remaining = prev.filter((c) => c.id !== chatId);
      if (remaining.length === 0) {
        const now = new Date().toISOString();
        const chat: ChatSession = {
          id: createId(),
          title: "New Chat",
          messages: getWelcomeState(),
          pinned: false,
          createdAt: now,
          updatedAt: now,
        };
        setActiveChatId(chat.id);
        return [chat];
      }

      if (activeChatId === chatId) {
        setActiveChatId(remaining[0].id);
      }

      return remaining;
    });

    if (isAuthed && chatId !== "ephemeral") {
      supabase.from("chats").delete().eq("id", chatId);
    }
  }

  function clearChat() {
    setIsLoading(false);
    setError(null);
    setText("");

    const now = new Date().toISOString();
    updateActiveChat((c) => ({
      ...c,
      messages: getWelcomeState(),
      updatedAt: now,
      title: c.title || "New Chat",
    }));

    if (isAuthed && activeChatId !== "ephemeral") {
      const welcome = getWelcomeMessage();
      (async () => {
        await supabase.from("messages").delete().eq("chat_id", activeChatId);
        if (welcome) {
          await supabase.from("messages").insert({
            chat_id: activeChatId,
            role: "assistant",
            content: welcome.content,
          });
        }
      })();
    }
  }

  function togglePin(chatId: string) {
    const now = new Date().toISOString();
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId ? { ...c, pinned: !c.pinned, updatedAt: now } : c,
      ),
    );
  }

  async function send() {
    const content = text.trim();
    if (!content || isLoading) return;

    setInteractedByChat((prev) => ({ ...prev, [activeChatId]: 1 }));

    const currentChatTitle =
      chats.find((c) => c.id === activeChatId)?.title || "New Chat";
    const autoTitle = content.slice(0, 40).trim() || "New Chat";
    const shouldAutoTitleThisChat =
      isAuthed && activeChatId !== "ephemeral" && currentChatTitle === "New Chat";

    // Lightweight recent context for the assistant (no extra storage).
    const recentMessages = messages
      .filter((m) => m.id !== TYPING_ID)
      .slice(-8)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    const authedMetaName =
      (user as { user_metadata?: { full_name?: string; name?: string } } | null)
        ?.user_metadata?.full_name ||
      (user as { user_metadata?: { full_name?: string; name?: string } } | null)
        ?.user_metadata?.name ||
      null;
    const userDisplayName = displayName?.trim() ? displayName.trim() : authedMetaName;

    const userMsg: ChatMessage = { id: createId(), role: "user", content };
    const typingMsg: ChatMessage = {
      id: TYPING_ID,
      role: "assistant",
      content: `${aiName} is typing...`,
    };

    setError(null);
    setIsLoading(true);
    {
      const now = new Date().toISOString();
      updateActiveChat((c) => {
        const nextMessages = [
          ...c.messages.filter((m) => m.id !== TYPING_ID),
          userMsg,
          typingMsg,
        ];
        const nextTitle = c.title === "New Chat" ? autoTitle : c.title;
        return {
          ...c,
          title: nextTitle,
          messages: nextMessages,
          updatedAt: now,
        };
      });
    }
    setText("");

    try {
      if (shouldAutoTitleThisChat) {
        await supabase
          .from("chats")
          .update({ title: autoTitle })
          .eq("id", activeChatId);
      }

      if (isAuthed && activeChatId !== "ephemeral") {
        await supabase.from("messages").insert({
          chat_id: activeChatId,
          role: "user",
          content,
        });
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          aiName,
          userDisplayName: userDisplayName ?? undefined,
          chatTitle: currentChatTitle,
          recentMessages,
          companionMode,
          responseStyle,
          preferredLanguage,
        }),
      });

      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) {
        throw new Error(data?.error || "Request failed");
      }
      if (!data.reply) {
        throw new Error("No reply received");
      }

      const assistantMsg: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: data.reply,
      };

      {
        const now = new Date().toISOString();
        updateActiveChat((c) => ({
          ...c,
          messages: [
            ...c.messages.filter((m) => m.id !== TYPING_ID),
            assistantMsg,
          ],
          updatedAt: now,
        }));
      }

      if (isAuthed && activeChatId !== "ephemeral") {
        await supabase.from("messages").insert({
          chat_id: activeChatId,
          role: "assistant",
          content: data.reply,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      updateActiveChat((c) => ({
        ...c,
        messages: c.messages.filter((m) => m.id !== TYPING_ID),
        updatedAt: new Date().toISOString(),
      }));
    } finally {
      setIsLoading(false);
    }
  }

  function renderSidebarChatRows(forMobile: boolean) {
    return (
      <Fragment>
        {filteredChats.map((c) => {
          const isActive = c.id === activeChatId;
          const isEditing = c.id === editingChatId;
          const title =
            c.title?.trim() ||
            c.messages.find((m) => m.role === "user")?.content?.slice(0, 32) ||
            "New Chat";

          if (forMobile) {
            if (isEditing) {
              return (
                <div
                  key={c.id}
                  className="w-full min-w-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 ring-1 ring-white/10"
                >
                  <input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.stopPropagation();
                        commitRename(c.id, editingTitle);
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditingChatId(null);
                        setEditingTitle("");
                      }
                    }}
                    onBlur={() => commitRename(c.id, editingTitle)}
                    maxLength={40}
                    autoFocus
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-sm font-medium text-white/90 ring-1 ring-white/5 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                  />
                  <div className="mt-0.5 truncate text-xs text-white/35">
                    {formatYmd(c.updatedAt)}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={c.id}
                className={[
                  "flex min-w-0 max-w-full items-stretch gap-0.5 rounded-2xl text-sm transition-colors ring-1 ring-transparent",
                  isActive
                    ? "bg-white/8 text-white/90 ring-white/10"
                    : "text-white/70",
                  isLoading ? "opacity-60" : "",
                ].join(" ")}
              >
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    if (isLoading) return;
                    if (editingChatId) return;
                    setError(null);
                    setActiveChatId(c.id);
                    setMobileChatDrawerOpen(false);
                  }}
                  className="min-w-0 flex-1 overflow-hidden px-3 py-2 text-left"
                  title={title}
                >
                  <div className="min-w-0 font-medium">
                    <div className="truncate">{title}</div>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-white/35">
                    {formatYmd(c.updatedAt)}
                  </div>
                </button>
                <div
                  className="relative flex shrink-0 flex-col items-end pr-1 pt-1"
                  data-mobile-chat-menu-root
                >
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={mobileChatRowMenuId === c.id}
                    aria-label="Chat actions"
                    disabled={isLoading}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMobileChatRowMenuId((id) => (id === c.id ? null : c.id));
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/10 hover:text-white/80 disabled:opacity-50"
                  >
                    ⋮
                  </button>
                  {mobileChatRowMenuId === c.id ? (
                    <div
                      role="menu"
                      className="absolute right-0 top-full z-[70] mt-1 w-36 overflow-hidden rounded-xl border border-white/10 bg-[rgb(var(--panel))] py-1 shadow-[0_8px_30px_rgba(0,0,0,0.55)]"
                    >
                      <button
                        role="menuitem"
                        type="button"
                        className="block w-full px-3 py-2 text-left text-xs font-semibold text-white/75 transition-colors hover:bg-white/10"
                        onClick={() => {
                          beginRename(c);
                          setMobileChatRowMenuId(null);
                        }}
                      >
                        Rename
                      </button>
                      <button
                        role="menuitem"
                        type="button"
                        className="block w-full px-3 py-2 text-left text-xs font-semibold text-rose-300/90 transition-colors hover:bg-white/10"
                        onClick={() => {
                          if (isLoading) return;
                          deleteChat(c.id);
                          setMobileChatRowMenuId(null);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          }

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                if (isLoading) return;
                if (editingChatId) return;
                setError(null);
                setActiveChatId(c.id);
              }}
              disabled={isLoading}
              className={[
                "group w-full rounded-2xl px-3 py-2 text-left text-sm transition-colors",
                "ring-1 ring-transparent",
                isActive
                  ? "bg-white/8 text-white/90 ring-white/10"
                  : "text-white/70 hover:bg-white/5 hover:text-white/85",
                isLoading ? "opacity-60" : "",
              ].join(" ")}
              title={title}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 font-medium">
                  {isEditing ? (
                    <input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          commitRename(c.id, editingTitle);
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingChatId(null);
                          setEditingTitle("");
                        }
                      }}
                      onBlur={() => commitRename(c.id, editingTitle)}
                      maxLength={40}
                      autoFocus
                      className="w-full rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-sm font-medium text-white/90 ring-1 ring-white/5 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                    />
                  ) : (
                    <div className="truncate">{title}</div>
                  )}
                </div>
                <span className="flex items-center gap-1">
                  <span
                    role="button"
                    tabIndex={isLoading ? -1 : 0}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isLoading) return;
                      togglePin(c.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      e.stopPropagation();
                      if (isLoading) return;
                      togglePin(c.id);
                    }}
                    aria-label={c.pinned ? "Unpin chat" : "Pin chat"}
                    title={c.pinned ? "Unpin" : "Pin"}
                    className={[
                      "inline-flex h-6 w-6 cursor-pointer select-none items-center justify-center rounded-full transition-all duration-200",
                      c.pinned
                        ? "text-white/75 opacity-100"
                        : "text-white/35 opacity-0 hover:bg-white/5 hover:text-white/60 group-hover:opacity-100",
                    ].join(" ")}
                  >
                    📌
                  </span>
                  <span
                    role="button"
                    tabIndex={isLoading ? -1 : 0}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      beginRename(c);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      e.stopPropagation();
                      beginRename(c);
                    }}
                    aria-label="Rename chat"
                    title="Rename"
                    className="inline-flex h-6 w-6 cursor-pointer select-none items-center justify-center rounded-full text-white/40 opacity-0 transition-all duration-200 hover:bg-white/5 hover:text-white/65 group-hover:opacity-100"
                  >
                    ✎
                  </span>
                  <span
                    role="button"
                    tabIndex={isLoading ? -1 : 0}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isLoading) return;
                      deleteChat(c.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      e.stopPropagation();
                      if (isLoading) return;
                      deleteChat(c.id);
                    }}
                    aria-label="Delete chat"
                    title="Delete"
                    className="inline-flex h-6 w-6 cursor-pointer select-none items-center justify-center rounded-full text-white/45 opacity-0 transition-all duration-200 hover:bg-white/5 hover:text-white/70 group-hover:opacity-100"
                  >
                    ×
                  </span>
                </span>
              </div>
              <div className="mt-0.5 truncate text-xs text-white/35">
                {formatYmd(c.updatedAt)}
              </div>
            </button>
          );
        })}
        {filteredChats.length === 0 ? (
          <div className="px-3 py-2 text-sm text-white/40">No chats found</div>
        ) : null}
      </Fragment>
    );
  }

  return (
    <div className="flex min-h-[100dvh] w-full min-w-0 max-w-full flex-col overflow-x-hidden bg-gradient-to-b from-black via-neutral-950 to-indigo-950/20 text-[rgb(var(--fg))]">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(60rem_36rem_at_55%_-10%,rgba(var(--accent),0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(36rem_22rem_at_10%_110%,rgba(34,211,238,0.04),transparent_60%)]" />
      </div>

      <div className="flex w-full max-w-full min-h-0 min-w-0 flex-1 overflow-x-hidden">
        <aside className="hidden w-72 flex-col border-r border-white/5 bg-black/25 backdrop-blur-xl md:flex">
          <div className="p-4">
            <button
              type="button"
              onClick={() => createNewChat()}
              className="inline-flex h-10 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white/80 shadow-[0_0_20px_rgba(99,102,241,0.06)] transition-all duration-200 hover:bg-white/8 hover:text-white/90 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
              title="Start a new chat"
            >
              New Chat
            </button>
            <div className="mt-3">
              <input
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                placeholder="Search chats..."
                className="h-10 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white/85 placeholder:text-white/35 ring-1 ring-white/5 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            <div className="space-y-1">{renderSidebarChatRows(false)}</div>
          </div>
        </aside>

        {mobileChatDrawerOpen ? (
          <div
            className="fixed inset-0 z-[52] flex md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Your chats"
          >
            <button
              type="button"
              aria-label="Close chat list"
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
              onClick={() => setMobileChatDrawerOpen(false)}
            />
            <aside className="relative z-[53] flex h-full min-h-0 w-[min(18rem,calc(100vw-3rem))] min-w-0 flex-col border-r border-white/5 bg-black/85 backdrop-blur-xl shadow-[8px_0_40px_rgba(0,0,0,0.45)]">
              <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-3 py-3">
                <p className="text-sm font-semibold text-white/85">Chats</p>
                <button
                  type="button"
                  onClick={() => setMobileChatDrawerOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/10 hover:text-white/80"
                  aria-label="Close"
                  title="Close"
                >
                  ×
                </button>
              </div>
              <div className="shrink-0 p-4">
                <button
                  type="button"
                  onClick={() => createNewChat({ openMobileDrawer: true })}
                  className="inline-flex h-10 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white/80 shadow-[0_0_20px_rgba(99,102,241,0.06)] transition-all duration-200 hover:bg-white/8 hover:text-white/90 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading}
                  title="Start a new chat"
                >
                  New Chat
                </button>
                <div className="mt-3">
                  <input
                    value={chatSearch}
                    onChange={(e) => setChatSearch(e.target.value)}
                    placeholder="Search chats..."
                    className="h-10 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white/85 placeholder:text-white/35 ring-1 ring-white/5 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                  />
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4">
                <div className="space-y-1">{renderSidebarChatRows(true)}</div>
              </div>
            </aside>
          </div>
        ) : null}

        <div className="flex w-full max-w-full min-w-0 flex-1 flex-col overflow-x-hidden">
          <header className="sticky top-0 z-40 border-b border-white/5 bg-black/35 backdrop-blur-xl">
            <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-2 gap-y-2 px-3 sm:h-16 sm:flex-nowrap sm:px-4">
              <div className="flex min-w-0 max-w-full items-center gap-2 max-sm:basis-full sm:gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm font-semibold text-white/70 transition-all duration-200 hover:bg-white/5 hover:text-white/90 hover:brightness-110"
                  aria-label="Back to home"
                >
                  <span className="text-base leading-none">←</span>
                  <span className="hidden sm:inline">Back</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setMobileChatDrawerOpen(true)}
                  className="md:hidden inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/70 transition-all duration-200 hover:bg-white/8 hover:text-white/85 hover:brightness-110"
                  title="Open chat list"
                >
                  Chats
                </button>

                <Link
                  href="/"
                  className="group flex min-w-0 max-w-full items-center gap-2 rounded-2xl px-2 py-1 transition-colors hover:bg-white/5 sm:gap-3"
                  aria-label={`${brandName} home`}
                >
                  <div className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-b from-neutral-900/60 via-neutral-900/30 to-indigo-500/10 ring-1 ring-white/10 shadow-[inset_0_-10px_18px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.10),0_0_22px_rgba(99,102,241,0.16)] transition-all duration-200 group-hover:brightness-110 group-hover:shadow-[inset_0_-10px_18px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12),0_0_28px_rgba(99,102,241,0.20)]">
                    <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(var(--accent),0.18),transparent_62%)]" />
                    <div className="relative flex h-4 w-4 flex-col items-center justify-center">
                      <div className="flex w-full items-center justify-between px-[1px]">
                        <span className="h-1 w-1 rounded-full bg-white/90 shadow-[0_0_10px_rgba(99,102,241,0.16)]" />
                        <span className="h-1 w-1 rounded-full bg-white/90 shadow-[0_0_10px_rgba(99,102,241,0.16)]" />
                      </div>
                      <div className="mt-1 h-[6px] w-3 rounded-b-full border-b border-white/70 opacity-60" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold tracking-tight text-white/90">
                      {brandName}
                    </p>
                    <p className="hidden text-xs text-white/45 sm:block">
                      Companion chat · UI prototype
                    </p>
                  </div>
                </Link>
              </div>

              <div className="flex min-w-0 flex-shrink-0 flex-wrap items-center justify-end gap-x-1.5 gap-y-2 sm:gap-2 max-sm:w-full max-sm:justify-start">
                {headerActions.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => {
                      if (a.action === "modes") openSettingsPanel();
                      if (a.action === "voice") {
                        setVoiceOutputUserActivated(true);
                        setVoiceInputOpen(true);
                      }
                      if (a.action === "video") setComingSoonKind("video");
                    }}
                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 px-2.5 text-xs font-semibold text-white/70 shadow-[0_0_20px_rgba(99,102,241,0.06)] transition-all duration-200 hover:bg-white/8 hover:text-white/85 hover:brightness-110 hover:scale-[1.02] sm:px-3"
                    title={a.hint}
                  >
                    {a.label}
                  </button>
                ))}
                <div className="min-w-0 shrink">
                  <AuthControls compact />
                </div>
                <label className="flex min-w-0 items-center gap-1 text-[11px] text-white/45">
                  <input
                    type="checkbox"
                    className="h-3 w-3 rounded border border-white/30 bg-black/40 text-indigo-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                    checked={autoPlayVoice}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setAutoPlayVoice(on);
                      if (on) setVoiceOutputUserActivated(true);
                    }}
                  />
                  <span className="hidden sm:inline">Auto-play AI voice</span>
                  <span className="sm:hidden">Auto voice</span>
                </label>
                <button
                  type="button"
                  onClick={() => createNewChat({ openMobileDrawer: true })}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/70 transition-all duration-200 hover:bg-white/8 hover:text-white/85 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 md:hidden"
                  title="Start a new chat"
                  disabled={isLoading}
                >
                  New chat
                </button>
                <button
                  type="button"
                  onClick={clearChat}
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 px-2.5 text-xs font-semibold text-white/70 transition-all duration-200 hover:bg-white/8 hover:text-white/85 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3"
                  title="Clear current chat"
                  disabled={isLoading}
                >
                  <span className="sm:hidden">Clear</span>
                  <span className="hidden sm:inline">Clear chat</span>
                </button>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full min-w-0 max-w-full sm:max-w-4xl flex-1 overflow-x-hidden px-3 pb-28 sm:px-4 sm:pb-0">
            <div className="py-7 sm:py-8">
              <div className="space-y-4 sm:space-y-5">
                {messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    autoPlayVoice={
                      autoPlayVoice &&
                      voiceOutputUserActivated &&
                      m.id === lastAssistantMessageId
                    }
                    speakingMessageId={ttsSpeakingMessageId}
                    onTtsStart={handleTtsStart}
                    onTtsEnd={handleTtsEnd}
                    onVoiceOutputUserGesture={() =>
                      setVoiceOutputUserActivated(true)
                    }
                  />
                ))}
                {showLoginBanner ? (
                  <div className="flex justify-center">
                    <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(99,102,241,0.10),rgba(255,255,255,0.04),rgba(0,0,0,0))] p-4 shadow-[0_0_30px_rgba(99,102,241,0.08)] backdrop-blur">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white/85">
                            Save this conversation?
                          </p>
                          <p className="mt-1 text-sm text-white/60">
                            Login to keep your chats forever.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={openLogin}
                          className="inline-flex h-10 items-center justify-center rounded-2xl bg-white/10 px-4 text-sm font-semibold text-white/85 ring-1 ring-white/10 transition-all duration-200 hover:bg-white/14 hover:brightness-110"
                          title="Login"
                        >
                          Login
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
                {error ? (
                  <div className="flex justify-center">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/65">
                      Couldn’t reach SOFIA. {error}
                    </div>
                  </div>
                ) : null}
                <div ref={endRef} />
              </div>
            </div>
          </main>

          <div className="fixed inset-x-0 bottom-0 z-50 w-full min-w-0 max-w-full overflow-x-hidden sm:sticky sm:inset-x-auto sm:z-auto">
            <ChatInput
              value={text}
              onChange={setText}
              onSend={send}
              onVoiceInput={() => {
                setVoiceOutputUserActivated(true);
                setVoiceInputOpen(true);
              }}
              disabled={isLoading}
              placeholder={isLoading ? `${aiName} is writing…` : undefined}
            />
          </div>
        </div>
      </div>

      {voiceInputOpen ? (
        <VoiceInputPanel
          onClose={() => setVoiceInputOpen(false)}
          onUseText={(spoken) => {
            const t = spoken.trim();
            if (!t) return;
            setText((prev) => {
              const p = prev.trimEnd();
              if (!p) return t;
              return `${p} ${t}`;
            });
          }}
          onSend={send}
        />
      ) : null}

      {comingSoonKind === "video" ? (
        <div
          className="fixed inset-0 z-[61] flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Video coming soon"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setComingSoonKind(null)}
          />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[rgb(var(--panel))] p-4 shadow-[0_0_40px_rgba(0,0,0,0.6)]">
            <p className="text-sm font-semibold text-white/85">Video</p>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Video is coming soon.
            </p>
            <button
              type="button"
              onClick={() => setComingSoonKind(null)}
              className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-white/10 px-4 text-sm font-semibold text-white/85 ring-1 ring-white/10 transition-all duration-200 hover:bg-white/14 hover:brightness-110"
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ChatWindow(props: Props) {
  return (
    <SettingsProvider>
      <ChatWindowInner {...props} />
      <SettingsPanel />
    </SettingsProvider>
  );
}

