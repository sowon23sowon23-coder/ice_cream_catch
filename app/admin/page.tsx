"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { STORE_OPTIONS } from "../lib/stores";
import { supabase } from "../lib/supabaseClient";

type CharId = "green" | "berry" | "sprinkle";

type AdminRow = {
  nickname_key: string;
  nickname_display: string;
  score: number;
  updated_at: string;
  character?: CharId | null;
  store?: string | null;
};

function characterLabel(character?: CharId | null) {
  if (character === "green") return "Green";
  if (character === "berry") return "Berry";
  if (character === "sprinkle") return "Sprinkle";
  return "-";
}

export default function AdminPage() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState("__ALL__");
  const [adminToken, setAdminToken] = useState("");

  const loadRows = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("leaderboard_best_v2")
        .select("nickname_key,nickname_display,score,updated_at,character,store")
        .order("updated_at", { ascending: false })
        .limit(500);

      if (error) {
        console.error("Admin leaderboard fetch error:", error);
        alert("Failed to load leaderboard records.");
        setRows([]);
      } else {
        setRows((data as AdminRow[] | null) ?? []);
      }
    } catch (err) {
      console.error("Admin leaderboard fetch exception:", err);
      alert("Failed to load leaderboard records.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows();
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem("adminPanelToken") || "";
    setAdminToken(saved);
  }, []);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      const storeOk = storeFilter === "__ALL__" || (row.store ?? "") === storeFilter;
      if (!storeOk) return false;
      if (!term) return true;
      return (
        row.nickname_display.toLowerCase().includes(term) ||
        row.nickname_key.toLowerCase().includes(term) ||
        (row.store ?? "").toLowerCase().includes(term)
      );
    });
  }, [rows, search, storeFilter]);

  const totalUsers = useMemo(() => new Set(rows.map((r) => r.nickname_key)).size, [rows]);

  const deleteUserScores = async (nicknameKey: string, nicknameDisplay: string) => {
    const token = adminToken.trim();
    if (!token) {
      alert("Enter admin token first.");
      return;
    }

    const ok = window.confirm(
      `Delete all leaderboard scores for "${nicknameDisplay}"?\nThis cannot be undone.`
    );
    if (!ok) return;

    setDeletingKey(nicknameKey);
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nicknameKey }),
      });

      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        console.error("Delete user score error:", json);
        alert("Failed to delete this user's scores.");
      } else {
        sessionStorage.setItem("adminPanelToken", token);
        setRows((prev) => prev.filter((r) => r.nickname_key !== nicknameKey));
      }
    } catch (err) {
      console.error("Delete user score exception:", err);
      alert("Failed to delete this user's scores.");
    } finally {
      setDeletingKey(null);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_8%,#ffffff_0%,#ffedf7_36%,#f9d3e7_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[#f4c5dd] bg-white/85 p-4 shadow-[0_16px_36px_rgba(150,9,83,0.15)]">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#960953]">Admin</p>
            <h1 className="text-2xl font-black text-[#4b0b31]">Leaderboard Manager</h1>
            <p className="text-sm font-semibold text-[#7f4a66]">View and delete user scores quickly.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadRows()}
              className="rounded-full border border-[#f2bad5] bg-white px-4 py-2 text-sm font-black text-[#960953]"
            >
              Refresh
            </button>
            <Link
              href="/"
              className="rounded-full bg-[linear-gradient(135deg,#960953,#c54b86)] px-4 py-2 text-sm font-black text-white"
            >
              Back to Game
            </Link>
          </div>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#f4c5dd] bg-white/90 p-4">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#8c4a6a]">Total Records</p>
            <p className="mt-1 text-2xl font-black text-[#4b0b31]">{rows.length}</p>
          </div>
          <div className="rounded-2xl border border-[#f4c5dd] bg-white/90 p-4">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#8c4a6a]">Total Users</p>
            <p className="mt-1 text-2xl font-black text-[#4b0b31]">{totalUsers}</p>
          </div>
          <div className="rounded-2xl border border-[#f4c5dd] bg-white/90 p-4">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#8c4a6a]">Visible Rows</p>
            <p className="mt-1 text-2xl font-black text-[#4b0b31]">{filteredRows.length}</p>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-[#f4c5dd] bg-white/90 p-3 sm:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nickname / key / store"
            className="w-full rounded-xl border border-[#edb8d3] bg-white px-3 py-2 text-sm font-semibold text-[#5b2041] outline-none"
          />
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="rounded-xl border border-[#edb8d3] bg-white px-3 py-2 text-sm font-semibold text-[#5b2041] outline-none sm:w-[220px]"
          >
            <option value="__ALL__">All Stores</option>
            {STORE_OPTIONS.map((store) => (
              <option key={store} value={store}>
                {store}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-[#f4c5dd] bg-white/90 p-3 sm:flex-row sm:items-center">
          <label className="text-xs font-black uppercase tracking-[0.14em] text-[#8c4a6a] sm:w-[170px]">
            Admin Token
          </label>
          <input
            type="password"
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            placeholder="Enter admin token for delete"
            className="w-full rounded-xl border border-[#edb8d3] bg-white px-3 py-2 text-sm font-semibold text-[#5b2041] outline-none"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#f3c7dd] bg-white shadow-[0_12px_24px_rgba(150,9,83,0.12)]">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_120px] bg-[#fff2f8] px-4 py-3 text-xs font-black text-[#8a5a75]">
            <div>Nickname</div>
            <div>Score</div>
            <div>Store</div>
            <div>Character</div>
            <div>Updated</div>
            <div className="text-right">Action</div>
          </div>

          {loading ? (
            <div className="px-4 py-8 text-sm font-semibold text-[#8b6178]">Loading records...</div>
          ) : filteredRows.length === 0 ? (
            <div className="px-4 py-8 text-sm font-semibold text-[#8b6178]">No records found.</div>
          ) : (
            <div className="max-h-[65vh] overflow-auto">
              {filteredRows.map((row) => (
                <div
                  key={`${row.nickname_key}-${row.store ?? "-"}-${row.updated_at}`}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_120px] border-t border-[#f9d7e8] px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-black text-[#4e1434]">{row.nickname_display}</p>
                    <p className="truncate text-xs font-semibold text-[#8d6280]">{row.nickname_key}</p>
                  </div>
                  <div className="font-black text-[#7d1148]">{row.score}</div>
                  <div className="truncate font-semibold text-[#5f2b4b]">{row.store ?? "-"}</div>
                  <div className="font-semibold text-[#5f2b4b]">{characterLabel(row.character)}</div>
                  <div className="font-semibold text-[#6a3b58]">
                    {new Date(row.updated_at).toLocaleDateString()}
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => void deleteUserScores(row.nickname_key, row.nickname_display)}
                      disabled={deletingKey === row.nickname_key}
                      className="rounded-lg bg-[#cb225e] px-3 py-1.5 text-xs font-black text-white disabled:opacity-60"
                    >
                      {deletingKey === row.nickname_key ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
