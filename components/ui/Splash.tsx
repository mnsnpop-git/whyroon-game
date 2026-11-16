export function Splash({ text = "กำลังโหลดปาร์ตี้..." }: { text?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="animate-bounce text-7xl">🎉</div>
      <p className="text-xl font-semibold text-muted">{text}</p>
    </div>
  );
}
