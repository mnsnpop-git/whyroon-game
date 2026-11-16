import type { Metadata } from "next";
import { MASCOT_MOODS, MASCOT_POSES, MASCOTS, Mascot, type MascotWho } from "@/components/characters/Mascot";

export const metadata: Metadata = { title: "ตัวละคร · เกมร่าเริง - ปาร์ตี้เกม", robots: { index: false } };

const MOOD_TH = { happy: "ยิ้ม", excited: "ตื่นเต้น", surprised: "ตกใจ", wink: "ขยิบตา", sleepy: "ง่วง", sad: "เศร้า" };
const POSE_TH = { idle: "ยืนเฉย", wave: "โบกมือ", cheers: "ชนแก้ว", point: "ชี้" };

/** หน้าพรีวิวตัวละคร สำหรับนักพัฒนา (ไม่มีลิงก์จากหน้าเกม) */
export default function CharactersPage() {
  const who = Object.keys(MASCOTS) as MascotWho[];
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-extrabold">ตัวละครประจำเกมร่าเริง</h1>
      <p className="mt-1 text-muted">
        ใช้ <code className="rounded bg-panel2 px-1">{`<Mascot who="ra" mood="excited" pose="cheers" />`}</code>
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {who.map((w) => (
          <section key={w} className="card-3d rounded-3xl bg-panel p-4 text-center">
            <Mascot who={w} mood="excited" pose="wave" className="mx-auto h-56 w-auto" />
            <h2 className="mt-2 text-2xl font-extrabold">
              {MASCOTS[w].name} <span className="text-base text-muted">({w})</span>
            </h2>
            <p className="text-muted">{MASCOTS[w].bio}</p>
          </section>
        ))}
      </div>

      {who.map((w) => (
        <section key={w} className="mt-8">
          <h2 className="mb-3 text-xl font-bold">
            {MASCOTS[w].name} — สีหน้า (mood) และท่าทาง (pose)
          </h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {MASCOT_MOODS.map((m) => (
              <figure key={m} className="rounded-2xl bg-panel2 p-2 text-center">
                <Mascot who={w} mood={m} className="mx-auto h-24 w-auto" />
                <figcaption className="text-xs text-muted">
                  {MOOD_TH[m]} <code>{m}</code>
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MASCOT_POSES.map((p) => (
              <figure key={p} className="rounded-2xl bg-panel2 p-2 text-center">
                <Mascot who={w} pose={p} mood={p === "cheers" ? "excited" : "happy"} className="mx-auto h-32 w-auto" />
                <figcaption className="text-xs text-muted">
                  {POSE_TH[p]} <code>{p}</code>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
