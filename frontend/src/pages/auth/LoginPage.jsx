import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Hammer, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { control, handleSubmit } = useForm({ defaultValues: { username: "", password: "" } });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setError(""); setLoading(true);
    try { await login(data.username, data.password); navigate("/"); }
    catch (err) { setError(err.response?.data?.message || "Tên đăng nhập hoặc mật khẩu không đúng."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'rgb(var(--c-bg))', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, background: 'rgb(var(--c-blue))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            boxShadow: '0 0 24px rgb(var(--c-blue) / 0.3)',
          }}>
            <Hammer style={{ width: 22, height: 22, color: '#fff' }} strokeWidth={2.2} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'rgb(var(--c-ink))', letterSpacing: '-0.02em' }}>
            Prosimex MES
          </h1>
          <p style={{ fontSize: 13, color: 'rgb(var(--c-ink-3))', marginTop: 4 }}>
            Hệ thống điều hành sản xuất
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgb(var(--c-s1))',
          border: '1px solid rgb(var(--c-line-2))',
          borderRadius: 10,
          padding: 24,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {error && (
            <div style={{
              background: 'rgb(var(--c-crit-bg))', border: '1px solid rgb(var(--c-crit) / 0.3)',
              borderRadius: 6, padding: '10px 12px', marginBottom: 16,
              fontSize: 13, color: 'rgb(var(--c-crit))',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="form-label">Tên đăng nhập</label>
              <Controller name="username" control={control} render={({ field }) => (
                <input {...field} placeholder="Nhập tên đăng nhập" disabled={loading} required
                  autoComplete="username" className="field" style={{ height: 38 }} />
              )} />
            </div>

            <div>
              <label className="form-label">Mật khẩu</label>
              <div style={{ position: 'relative' }}>
                <Controller name="password" control={control} render={({ field }) => (
                  <input {...field} type={showPw ? "text" : "password"} placeholder="Nhập mật khẩu"
                    disabled={loading} required autoComplete="current-password"
                    className="field" style={{ height: 38, paddingRight: 36 }} />
                )} />
                <button type="button" tabIndex={-1} onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgb(var(--c-ink-4))', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {showPw ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', height: 38, marginTop: 4, fontSize: 13, fontWeight: 600 }}
            >
              {loading
                ? <><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />Đang đăng nhập...</>
                : "Đăng nhập"
              }
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgb(var(--c-ink-4))', marginTop: 20 }}>
          © 2026 Prosimex Corporation
        </p>
      </div>
    </div>
  );
}
