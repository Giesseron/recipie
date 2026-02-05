"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { formatCost, formatTokens } from "@/lib/cost";

// ── types ─────────────────────────────────────────────────────────────────
interface UserStat {
  id: string;
  email: string;
  joinedAt: string;
  recipeCount: number;
  totalTokens: number;
  totalCost: number;
  lastActive: string;
  failedExtractions: number;
}

interface AdminStats {
  overview: {
    totalUsers: number;
    totalRecipes: number;
    totalTokens: number;
    totalCost: number;
  };
  users: UserStat[];
  platforms: Record<string, number>;
}

// ── platform metadata ─────────────────────────────────────────────────────
const PLATFORMS = [
  { key: "instagram", label: "אינסטגרם", emoji: "📸", color: "#E67E22" },
  { key: "youtube", label: "יוטיוב", emoji: "▶️", color: "#CD5C5C" },
  { key: "tiktok", label: "טיקטוק", emoji: "🎵", color: "#6B5B95" },
  { key: "facebook", label: "פייסבוק", emoji: "👥", color: "#4682B4" },
];

// ── page ──────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => {
        if (r.status === 403) {
          router.push("/");
          throw new Error("forbidden");
        }
        if (!r.ok) throw new Error("fetch");
        return r.json();
      })
      .then((d) => setStats(d))
      .catch((e) => {
        if (e.message !== "forbidden") setError("שגיאה בטעינת הנתונים");
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading)
    return (
      <Shell>
        <p className="text-[#8B7355] font-bold text-lg text-center py-20">טוען...</p>
      </Shell>
    );

  if (error)
    return (
      <Shell>
        <div className="text-center py-20 space-y-4">
          <p className="text-red-600 font-bold text-lg">{error}</p>
          <button onClick={() => router.push("/")} className="retro-btn">
            חזור לאפ
          </button>
        </div>
      </Shell>
    );

  if (!stats) return null;

  const { overview, users, platforms } = stats;
  const totalPlatformCount = Object.values(platforms).reduce((a, b) => a + b, 0);

  return (
    <Shell>
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* ── overview cards ──────────────────────────────────────────── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard emoji="👤" label="משתמשים" value={String(overview.totalUsers)} />
          <StatCard emoji="🍳" label="מתכונים" value={String(overview.totalRecipes)} />
          <StatCard emoji="🤖" label="טוקנים" value={formatTokens(overview.totalTokens)} />
          <StatCard
            emoji="💰"
            label="עלות כולל"
            value={formatCost(overview.totalCost)}
            accent
          />
        </section>

        {/* ── platform breakdown ──────────────────────────────────────── */}
        <section className="card p-5">
          <h2 className="font-bold text-[#3D2817] mb-4">📊 פלטפורמות</h2>
          <div className="space-y-3">
            {PLATFORMS.map(({ key, label, emoji, color }) => {
              const count = platforms[key] || 0;
              const pct = totalPlatformCount
                ? (count / totalPlatformCount) * 100
                : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold text-[#3D2817]">
                      {emoji} {label}
                    </span>
                    <span className="text-[#8B7355] font-medium">
                      {count} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div
                    className="w-full h-3 rounded-full"
                    style={{ background: "#E8DCC8" }}
                  >
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── user table (sorted by cost desc) ──────────────────────── */}
        <section className="card p-5 overflow-x-auto">
          <h2 className="font-bold text-[#3D2817] mb-4">👥 משתמשים לפי עלות</h2>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "2px solid #D2691E" }}>
                {["אימייל", "הצטרף", "מתכונים", "טוקנים", "עלות", "שגיאות"].map(
                  (h) => (
                    <th
                      key={h}
                      className="py-2 text-right text-[#8B4513] font-bold whitespace-nowrap pr-3"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr
                  key={u.id}
                  className={`${i % 2 === 1 ? "bg-[#FFF5EC]" : ""} ${
                    i === 0 && u.totalCost > 0 ? "border-l-4 border-l-[#E67E22]" : ""
                  }`}
                >
                  <td className="py-2.5 pr-3 text-[#3D2817] font-medium truncate max-w-[180px]">
                    {u.email}
                  </td>
                  <td className="py-2.5 pr-3 text-[#8B7355] whitespace-nowrap">
                    {new Date(u.joinedAt).toLocaleDateString("he-IL")}
                  </td>
                  <td className="py-2.5 pr-3 text-[#3D2817] font-bold">
                    {u.recipeCount}
                  </td>
                  <td className="py-2.5 pr-3 text-[#8B7355]">
                    {formatTokens(u.totalTokens)}
                  </td>
                  <td className="py-2.5 pr-3 font-bold text-[#D2691E]">
                    {formatCost(u.totalCost)}
                  </td>
                  <td className="py-2.5 pr-3">
                    {u.failedExtractions > 0 ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FFE5E5] text-red-600">
                        {u.failedExtractions}
                      </span>
                    ) : (
                      <span className="text-[#82A284]">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#8B7355]">
                    אין משתמשים עוד — הטבלה תופיע מיעוד שמשתמשים יתחברו לאפ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </Shell>
  );
}

// ── layout shell ──────────────────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="min-h-screen" style={{ background: "#FFF9E6" }}>
      <header
        className="px-4 py-4 flex items-center justify-between"
        style={{ background: "#3D2817", borderBottom: "3px solid #8B4513" }}
      >
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-[#FFE5CC] hover:text-white transition-colors font-bold text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          חזור לאפ
        </button>
        <h1 className="text-white font-bold">🔍 לוח בקרה מנהלתי</h1>
        <div /> {/* balance flex */}
      </header>
      {children}
    </div>
  );
}

// ── stat card ─────────────────────────────────────────────────────────────
function StatCard({
  emoji,
  label,
  value,
  accent,
}: {
  emoji: string;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className="card p-4 text-center"
      style={accent ? { border: "2px solid #E67E22", background: "#FFF5EC" } : {}}
    >
      <div className="text-2xl mb-1">{emoji}</div>
      <p className="text-xl font-bold text-[#3D2817]">{value}</p>
      <p className="text-xs text-[#8B7355] font-bold mt-0.5">{label}</p>
    </div>
  );
}
