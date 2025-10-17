import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
  
    if (email === "admin@admin" && password === "1234") {
      localStorage.setItem("user", JSON.stringify({ email, role: "admin" }));
      navigate("/chatting");
    } 
    else if (email === "admin1@admin" && password === "1234") {
      localStorage.setItem("user", JSON.stringify({ email, role: "user" }));
      navigate("/chatting");
    } 
    else {
      alert("로그인 실패!");
    }
  };
  

  return (
    <div
      style={{
        minHeight: "100svh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background:
          "linear-gradient(135deg, #93c5fd 0%, #a5b4fc 50%, #fbcfe8 100%)",
        padding: "20px",
        fontFamily: "Pretendard, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          padding: "40px 32px",
          transition: "transform 0.2s ease",
        }}
      >
        <h2
          style={{
            fontSize: 28,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 30,
            color: "#1e3a8a",
          }}
        >
          로그인
        </h2>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                color: "#374151",
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일을 입력하세요"
              required
              style={{
                width: "92%",
                border: "1px solid #d1d5db",
                borderRadius: 10,
                padding: "10px 14px",
                outline: "none",
                fontSize: 15,
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) =>
                (e.target.style.boxShadow =
                  "0 0 0 3px rgba(59,130,246,0.3)")
              }
              onBlur={(e) => (e.target.style.boxShadow = "none")}
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label
              style={{
                display: "block",
                color: "#374151",
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
              style={{
                width: "92%",
                border: "1px solid #d1d5db",
                borderRadius: 10,
                padding: "10px 14px",
                outline: "none",
                fontSize: 15,
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) =>
                (e.target.style.boxShadow =
                  "0 0 0 3px rgba(59,130,246,0.3)")
              }
              onBlur={(e) => (e.target.style.boxShadow = "none")}
            />
          </div>

          <button
            type="submit"
            style={{
              width: "100%",
              background: "linear-gradient(90deg, #3b82f6, #6366f1)",
              color: "#fff",
              padding: "12px 14px",
              borderRadius: 10,
              border: "none",
              fontWeight: 600,
              fontSize: 16,
              cursor: "pointer",
              transition: "transform 0.2s, opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.target.style.opacity = "1")}
          >
            로그인
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            color: "#6b7280",
            fontSize: 14,
            marginTop: 20,
          }}
        >
          계정이 없으신가요?{" "}
          <Link to="/signup" style={{ color: "#3b82f6", fontWeight: 500 }}>
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
