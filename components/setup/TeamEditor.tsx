"use client";

import { ChevronDown, ChevronUp, Shuffle, X } from "lucide-react";
import { DEFAULT_TEAM_NAMES, TEAM_COLORS } from "@/lib/constants";
import { useRoom } from "@/lib/client/room-store";
import type { WordsTeam } from "@/lib/types";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Section, Stepper } from "../ui/Section";

/** จัดทีม (ใช้ร่วมกันระหว่างเกมใบ้คำแข่งเวลา และเติมคำในช่องว่าง) */
export function TeamEditor({
  teams,
  serverTeams,
  editable,
  onChange,
}: {
  teams: WordsTeam[]; // ชื่อ/สี/จำนวนทีม จาก draft ของหัวหน้าห้อง
  serverTeams: WordsTeam[]; // สมาชิกทีม อ่านจากเซิร์ฟเวอร์เสมอ
  editable: boolean;
  onChange: (teams: WordsTeam[]) => void;
}) {
  const room = useRoom();
  const membersOf = (id: string) =>
    (serverTeams.find((t) => t.id === id)?.members ?? []).filter((m) => room.player(m)?.status === "active");
  const assigned = new Set(teams.flatMap((t) => membersOf(t.id)));
  const unassigned = room.players.filter((p) => !assigned.has(p.id));
  const myTeam = teams.find((t) => membersOf(t.id).includes(room.me));

  const setTeamCount = (n: number) => {
    const next = teams.slice(0, n);
    while (next.length < n) {
      const i = next.length;
      const usedColors = new Set(next.map((t) => t.color));
      next.push({
        id: `t${Date.now().toString(36)}${i}`,
        name: DEFAULT_TEAM_NAMES[i] ?? `ทีม ${i + 1}`,
        color: TEAM_COLORS.find((c) => !usedColors.has(c.hex))?.hex ?? TEAM_COLORS[i].hex,
        members: [],
      });
    }
    onChange(next);
  };

  const patchTeam = (id: string, patch: Partial<WordsTeam>) =>
    onChange(teams.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  return (
    <Section
      title="ทีม"
      icon={<span>👥</span>}
      right={
        editable && (
          <Stepper value={teams.length} min={2} max={4} onChange={setTeamCount} />
        )
      }
    >
      {editable && (
        <Button tone="sun" className="mb-3 w-full" onClick={() => room.dispatch("setup.autoTeams")}>
          <Shuffle size={18} /> สุ่มแบ่งทีมอัตโนมัติ
        </Button>
      )}

      <div className="flex flex-col gap-3">
        {teams.map((team) => {
          const members = membersOf(team.id);
          const mine = myTeam?.id === team.id;
          return (
            <div
              key={team.id}
              className="rounded-3xl border-2 p-3"
              style={{ borderColor: team.color, backgroundColor: `${team.color}1f` }}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="h-5 w-5 shrink-0 rounded-full border-2 border-black/30" style={{ backgroundColor: team.color }} />
                {editable ? (
                  <input
                    value={team.name}
                    maxLength={24}
                    onChange={(e) => patchTeam(team.id, { name: e.target.value })}
                    aria-label="ชื่อทีม"
                    className="min-w-0 flex-1 rounded-xl px-2 py-1 text-lg font-bold border border-white/15 bg-black/30 text-white placeholder:text-white/30 transition focus:border-sky/60 focus:outline-none focus:ring-4 focus:ring-sky/20"
                  />
                ) : (
                  <span className="flex-1 text-xl font-bold">{team.name}</span>
                )}
                <span className="text-sm text-muted">{members.length} คน</span>
              </div>

              {editable && (
                <div className="mb-2 flex gap-1.5">
                  {TEAM_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-label={`สี${c.name}`}
                      onClick={() => patchTeam(team.id, { color: c.hex })}
                      className={`h-7 w-7 rounded-full border-2 ${team.color === c.hex ? "border-white" : "border-white/10"}`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              )}

              <ul className="flex flex-col gap-1.5">
                {members.map((id, i) => (
                  <li key={id} className="flex items-center gap-2 rounded-2xl bg-ink/50 p-1.5">
                    <span className="w-5 text-center font-bold" style={{ color: team.color }}>
                      {i + 1}
                    </span>
                    <Avatar player={room.player(id)} size="sm" />
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {room.player(id)?.nickname}
                      {id === room.me && <span className="ml-1 text-sm text-sky">(คุณ)</span>}
                    </span>
                    {editable && (
                      <>
                        <button
                          type="button"
                          aria-label="เลื่อนขึ้น"
                          disabled={i === 0}
                          className="p-1 disabled:opacity-20"
                          onClick={() =>
                            room.dispatch("setup.moveMember", { playerId: id, teamId: team.id, index: i - 1 })
                          }
                        >
                          <ChevronUp size={20} />
                        </button>
                        <button
                          type="button"
                          aria-label="เลื่อนลง"
                          disabled={i === members.length - 1}
                          className="p-1 disabled:opacity-20"
                          onClick={() =>
                            room.dispatch("setup.moveMember", { playerId: id, teamId: team.id, index: i + 1 })
                          }
                        >
                          <ChevronDown size={20} />
                        </button>
                        <button
                          type="button"
                          aria-label="เอาออกจากทีม"
                          className="p-1 text-coral"
                          onClick={() => room.dispatch("setup.moveMember", { playerId: id, teamId: null })}
                        >
                          <X size={20} />
                        </button>
                      </>
                    )}
                  </li>
                ))}
                {members.length === 0 && (
                  <li className="py-2 text-center text-sm text-muted">ยังไม่มีสมาชิก</li>
                )}
              </ul>

              {!mine && (
                <button
                  type="button"
                  onClick={() => room.dispatch("setup.pickTeam", { teamId: team.id })}
                  className="btn-3d mt-2 w-full rounded-2xl py-2 font-bold text-ink"
                  style={{ backgroundColor: team.color }}
                >
                  เข้าร่วมทีมนี้
                </button>
              )}
            </div>
          );
        })}
      </div>

      {unassigned.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-muted">
            ยังไม่มีทีม ({unassigned.length}) {editable && "— แตะสีเพื่อจัดเข้าทีม"}
          </p>
          <div className="flex flex-col gap-1.5">
            {unassigned.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-2xl bg-panel2 p-1.5">
                <Avatar player={p} size="sm" />
                <span className="min-w-0 flex-1 truncate font-semibold">{p.nickname}</span>
                {editable &&
                  teams.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      aria-label={`ย้ายไป${t.name}`}
                      onClick={() => room.dispatch("setup.moveMember", { playerId: p.id, teamId: t.id })}
                      className="h-8 w-8 rounded-full border-2 border-black/30"
                      style={{ backgroundColor: t.color }}
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}
