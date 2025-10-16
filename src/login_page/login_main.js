import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (email === "admin@admin" && password === "1234") {
      navigate("/chatting");
    } else {
      alert("로그인 실패!");
    }
  };

  return (
    <div
      style={{
        minHeight: "100svh",          // 모바일 주소창
        display: "grid",
        placeItems: "center",
        background: "#f3f4f6",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 384,              // max-w-sm
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 10px 20px rgba(0,0,0,0.06)",
          padding: 32,
        }}
      >
        <h2 style={{ fontSize: 24, fontWeight: 700, textAlign: "center", marginBottom: 24 }}>
          로그인
        </h2>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "#4b5563", marginBottom: 4 }}>이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일을 입력하세요"
              required
              style={{
                width: "100%",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "8px 12px",
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", color: "#4b5563", marginBottom: 4 }}>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
              style={{
                width: "100%",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "8px 12px",
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              width: "100%",
              background: "#3b82f6",
              color: "#fff",
              padding: "10px 12px",
              borderRadius: 8,
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            로그인
          </button>
        </form>

        <p style={{ textAlign: "center", color: "#6b7280", fontSize: 14, marginTop: 16 }}>
          계정이 없으신가요?{" "}
          <Link to="/signup" style={{ color: "#3b82f6" }}>회원가입</Link>
        </p>
      </div>
    </div>
  );
}
