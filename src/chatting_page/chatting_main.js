import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

export default function Playground() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "플레이그라운드입니다. 자유롭게 물어보세요!" },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);          // ← 왼쪽 기록
  const [historyFilter, setHistoryFilter] = useState("");// ← 기록 검색어
  const listRef = useRef(null);
  const navigate = useNavigate();

  const USER_ID_KEY = "x_user_id";
  const ensureUserId = () => {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
  };
  const USER_ID = ensureUserId();
  
  // 네트워크 타임아웃 보조
  const fetchWithTimeout = (url, opts = {}, ms = 30000) =>
    Promise.race([
      fetch(url, opts),
      new Promise((_, rej) => setTimeout(() => rej(new Error("요청 시간 초과")), ms)),
    ]);
  
  // 기록 로드/저장(localStorage)
  useEffect(() => {
    const savedHistory = localStorage.getItem("chat_history");
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch { /* ignore */ }
    }
    // 대화 로그도 복원
    const savedMessages = localStorage.getItem("messages");
    if (savedMessages) {
      try { setMessages(JSON.parse(savedMessages)); } catch { /* ignore */ }
    }
  }, []);
  
  useEffect(() => {
    localStorage.setItem("chat_history", JSON.stringify(history));
  }, [history]);
  
  useEffect(() => {
    localStorage.setItem("messages", JSON.stringify(messages));
  }, [messages]);
  
  // 스크롤 맨 아래로
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);
  
  const handleLogout = async () => {
    try {
      await fetch("http://localhost:5050/reset", { method: "POST", headers: { "X-User-Id": USER_ID } });
    } catch {}
    localStorage.removeItem("token");
    sessionStorage.clear();
    setMessages([{ role: "assistant", text: "플레이그라운드입니다. 자유롭게 물어보세요!" }]);
    navigate("/");
  };
  
  // 기록에 추가 (중복 제거: 같은 텍스트는 위로 올리기)
  const pushHistory = (text) => {
    const t = text.trim();
    if (!t) return;
    setHistory((prev) => {
      const dedup = prev.filter((v) => v !== t);
      return [t, ...dedup].slice(0, 200);
    });
  };
  
  const MAX_HISTORY_SEND = 40;
  const buildPayloadHistory = () => {
    const slice = messages.slice(-MAX_HISTORY_SEND);
    return slice.map(({ role, text }) => ({ role, text }));
  };
  
  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
  
    const userMsg = { role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);
  
    pushHistory(text);
  
    try {
      const payload = { message: text, history: buildPayloadHistory() };
      const res = await fetchWithTimeout("http://localhost:5050/main", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": USER_ID,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
  
      const data = await res.json();
      const replyText = data?.reply ?? "(서버 응답 없음)";
      setMessages((m) => [...m, { role: "assistant", text: replyText }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: `에러: ${e.message}` }]);
    } finally {
      setSending(false);
    }
  };
  
  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // 기록 필터링
  const filteredHistory = useMemo(() => {
    const q = historyFilter.trim().toLowerCase();
    if (!q) return history;
    return history.filter((h) => h.toLowerCase().includes(q));
  }, [history, historyFilter]);

  const clearHistory = () => setHistory([]);

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
        <span>Playground (Chat)</span>
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
                  key={i}
                  onClick={() => setInput(h)} // 클릭 시 입력창으로
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
