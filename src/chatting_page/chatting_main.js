import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";

/** ===== Config ===== */
const API_BASE = "http://localhost:5050"; // 필요 시 env로 분리
const LS_PREFIX = "pg";                   // localStorage 네임스페이스
const MAX_HISTORY_LEN = 200;              // 좌측 기록 상한
const MAX_MESSAGES_LEN = 1000;            // 메시지 리스트 상한
const MAX_HISTORY_SEND = 40;              // 서버에 보낼 과거 대화 상한
const REQ_TIMEOUT_MS = 30_000;

/** 간단한 localStorage 훅 (문자열/객체 자동 처리) */
function useLocalStorage(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // 저장 실패 무시 (용량 초과 등)
    }
  }, [key, state]);

  return [state, setState];
}

/** AbortController 기반 timeout fetch */
async function fetchWithTimeout(url, opts = {}, ms = REQ_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/** 안전한 UUID 생성 (fallback 포함) */
function safeUUID() {
  if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  return "u-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** 저장된 로그인 유저 이메일 가져오기 */
function getSavedEmail() {
  try {
    const saved = localStorage.getItem("user");
    if (!saved) return "guest"; // 비로그인 대비
    const { email } = JSON.parse(saved);
    return email || "guest";
  } catch {
    return "guest";
  }
}

export default function Playground() {
  const navigate = useNavigate();

  // 이메일은 최초 1회 고정(계정 스코프)
  const emailRef = useRef(null);
  if (!emailRef.current) {
    emailRef.current = getSavedEmail();
  }
  const EMAIL = emailRef.current; // 예: "admin@admin"

  // USER_ID는 이메일 별도로 보관 (계정별 고유 유저 키)
  const userIdRef = useRef(null);
  if (!userIdRef.current) {
    const userIdKey = `${LS_PREFIX}:${EMAIL}:user_id`;
    const saved = localStorage.getItem(userIdKey);
    userIdRef.current = saved || safeUUID();
    if (!saved) localStorage.setItem(userIdKey, userIdRef.current);
  }
  const USER_ID = userIdRef.current; // 예: u-xxx ...

  // 상태 (계정별로 messages/history를 분리해서 저장)
  const [messages, setMessages] = useLocalStorage(
    `${LS_PREFIX}:${EMAIL}:messages`,
    [{ role: "assistant", text: "플레이그라운드입니다. 자유롭게 물어보세요!" }]
  );
  const [history, setHistory] = useLocalStorage(`${LS_PREFIX}:${EMAIL}:history`, []);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("");
  const listRef = useRef(null);

  // 로그인 세션 확인(옵션)
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser || EMAIL === "guest") {
      console.warn("로그인 정보가 없습니다. 로그인 페이지로 이동합니다.");
      // 필요 시 자동 리디렉션
      // navigate("/");
    }
  }, [EMAIL, navigate]);

  // 스크롤 맨 아래로
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // 안전하게 개수 제한 유지
  const clampList = useCallback((list, max) => {
    if (list.length <= max) return list;
    return list.slice(-max);
  }, []);

  // 기록 추가(중복 제거 + 최근 맨 위 + 상한 유지)
  const pushHistory = useCallback((text) => {
    const t = text.trim();
    if (!t) return;
    setHistory((prev) => {
      const nxt = [t, ...prev.filter((v) => v !== t)];
      return clampList(nxt, MAX_HISTORY_LEN);
    });
  }, [setHistory, clampList]);

  // 서버 전송용 과거 대화 슬라이스
  const payloadHistory = useMemo(() => {
    const slice = messages.slice(-MAX_HISTORY_SEND);
    return slice.map(({ role, text }) => ({ role, text }));
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg = { role: "user", text };
    setMessages((m) => clampList([...m, userMsg], MAX_MESSAGES_LEN));
    setInput("");
    setSending(true);
    pushHistory(text);

    try {
      const payload = { message: text, history: payloadHistory };
      const res = await fetchWithTimeout(`${API_BASE}/main`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": USER_ID,   // 유저 고유 키(이메일별 분리)
          "X-Account-Id": EMAIL,  // 계정 스코프(이메일)
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const replyText = data?.reply ?? "(서버 응답 없음)";

      setMessages((m) =>
        clampList([...m, { role: "assistant", text: replyText }], MAX_MESSAGES_LEN)
      );
    } catch (e) {
      const msg = e?.name === "AbortError" ? "요청 시간 초과" : e.message;
      setMessages((m) =>
        clampList([...m, { role: "assistant", text: `에러: ${msg}` }], MAX_MESSAGES_LEN)
      );
    } finally {
      setSending(false);
    }
  }, [EMAIL, USER_ID, input, sending, payloadHistory, setMessages, clampList, pushHistory]);

  const onKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    },
    [send]
  );

  // 기록 필터링
  const filteredHistory = useMemo(() => {
    const q = historyFilter.trim().toLowerCase();
    if (!q) return history;
    return history.filter((h) => h.toLowerCase().includes(q));
  }, [history, historyFilter]);

  const clearHistory = useCallback(() => setHistory([]), [setHistory]);

  const handleLogout = useCallback(async () => {
    try {
      await fetchWithTimeout(`${API_BASE}/reset`, {
        method: "POST",
        headers: { "X-User-Id": USER_ID, "X-Account-Id": EMAIL },
      });
    } catch {}

    // 세션/토큰 정리
    localStorage.removeItem("token");
    sessionStorage.clear();

    // 계정별 저장된 대화 초기화(필요 시 유지해도 됨)
    localStorage.removeItem(`${LS_PREFIX}:${EMAIL}:messages`);
    localStorage.removeItem(`${LS_PREFIX}:${EMAIL}:history`);

    // 상태 초기화
    setMessages([{ role: "assistant", text: "플레이그라운드입니다. 자유롭게 물어보세요!" }]);

    navigate("/");
  }, [navigate, setMessages, USER_ID, EMAIL]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* 헤더 */}
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #eee",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>Playground (Chat) — {EMAIL}</span>
        <button
          onClick={handleLogout}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          로그아웃
        </button>
      </header>

      {/* 본문: 좌측 기록 + 우측 채팅 */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* 좌측 기록 패널 */}
        <aside
          style={{
            width: 280,
            borderRight: "1px solid #eee",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: 12, borderBottom: "1px solid #f1f1f1" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>검색/프롬프트 기록</div>
            <input
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              placeholder="기록 검색..."
              style={{
                width: "90%",
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: "8px 10px",
                outline: "none",
              }}
            />
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <button
                onClick={() => pushHistory(input || "새 쿼리")}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                현재 입력 저장
              </button>
              <button
                onClick={clearHistory}
                style={{
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                비우기
              </button>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 12,
              background: "#fafafa",
            }}
          >
            {filteredHistory.length === 0 ? (
              <div style={{ color: "#888", fontSize: 14 }}>저장된 기록이 없습니다.</div>
            ) : (
              filteredHistory.map((h, i) => (
                <button
                  key={`${h}-${i}`}
                  onClick={() => setInput(h)}
                  title="클릭하면 입력창으로 불러옵니다"
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    marginBottom: 8,
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {h}
                </button>
              ))
            )}
          </div>
        </aside>

        {/* 우측 채팅 영역 */}
        <section style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div
            ref={listRef}
            style={{ flex: 1, overflowY: "auto", padding: 16, background: "#fafafa" }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    maxWidth: 560,
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: m.role === "user" ? "#3b82f6" : "#fff",
                    color: m.role === "user" ? "#fff" : "#111",
                    border: m.role === "assistant" ? "1px solid #eee" : "none",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: 12, borderTop: "1px solid #eee", display: "flex", gap: 8 }}>
            <textarea
              placeholder="메시지를 입력하고 Enter (줄바꿈은 Shift+Enter)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              style={{
                flex: 1,
                height: 56,
                resize: "none",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #ddd",
                outline: "none",
              }}
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              style={{
                minWidth: 96,
                borderRadius: 10,
                border: "1px solid #ddd",
                background: sending ? "#e5e7eb" : "#fff",
                cursor: sending ? "not-allowed" : "pointer",
              }}
            >
              {sending ? "전송중..." : "전송"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
