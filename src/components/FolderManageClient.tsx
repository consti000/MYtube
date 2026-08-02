"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Channel = {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  folders: { folder: { id: string; name: string } }[];
};

type Folder = { id: string; name: string };

type Props = {
  initialFolders: Folder[];
  channels: Channel[];
};

export function FolderManageClient({ initialFolders, channels }: Props) {
  const router = useRouter();
  const [folders, setFolders] = useState(initialFolders);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [assignChannel, setAssignChannel] = useState<string | null>(null);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);

  async function createFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (res.ok) {
      setName("");
      router.refresh();
      const created = await res.json();
      setFolders((prev) => [...prev, { id: created.id, name: created.name }]);
    }
  }

  async function deleteFolder(id: string) {
    if (!confirm("이 폴더를 삭제할까요?")) return;
    await fetch(`/api/folders/${id}`, { method: "DELETE" });
    setFolders((prev) => prev.filter((f) => f.id !== id));
    router.refresh();
  }

  async function renameFolder(id: string, current: string) {
    const next = prompt("새 폴더 이름", current);
    if (!next || next === current) return;
    await fetch(`/api/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: next }),
    });
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name: next } : f)));
    router.refresh();
  }

  function openAssign(ch: Channel) {
    setAssignChannel(ch.id);
    setSelectedFolders(ch.folders.map((f) => f.folder.id));
  }

  async function saveAssign() {
    if (!assignChannel) return;
    setBusy(true);
    await fetch("/api/channels/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: assignChannel, folderIds: selectedFolders }),
    });
    setBusy(false);
    setAssignChannel(null);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">폴더 관리</h1>
        <p className="mt-2 text-sm text-ink/55">
          주제별 폴더를 만들고 유튜브 채널을 배정하세요. 한 채널을 여러 폴더에 넣을 수
          있습니다.
        </p>
      </div>

      <form onSubmit={createFolder} className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="새 폴더 이름"
          className="min-w-[220px] flex-1 rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none ring-crimson/30 focus:ring-2"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-crimson px-4 py-2 text-sm font-medium text-paper hover:bg-crimson/90 disabled:opacity-50"
        >
          폴더 생성
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/45">
          내 폴더
        </h2>
        {folders.length === 0 ? (
          <p className="text-sm text-ink/45">아직 폴더가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-ink/10 rounded-xl border border-ink/10 bg-paper">
            {folders.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <a
                  href={`/folders/${f.id}`}
                  className="font-medium text-ink hover:text-crimson"
                >
                  {f.name}
                </a>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => renameFolder(f.id, f.name)}
                    className="rounded-md border border-ink/15 px-2.5 py-1 text-xs text-ink/70 hover:border-ink/30"
                  >
                    이름 변경
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteFolder(f.id)}
                    className="rounded-md border border-crimson/30 px-2.5 py-1 text-xs text-crimson hover:bg-crimson/5"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/45">
          유튜브 채널 배정
        </h2>
        {channels.length === 0 ? (
          <p className="text-sm text-ink/45">
            동기화된 채널이 없습니다. 설정에서 구독 목록을 불러오세요.
          </p>
        ) : (
          <ul className="space-y-2">
            {channels.map((ch) => (
              <li
                key={ch.id}
                className="flex items-center gap-3 rounded-xl border border-ink/10 bg-paper px-3 py-2"
              >
                {ch.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ch.thumbnailUrl}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-ink/10" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{ch.name}</p>
                  <p className="truncate text-xs text-ink/45">
                    {ch.folders.length
                      ? ch.folders.map((f) => f.folder.name).join(", ")
                      : "미배정"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openAssign(ch)}
                  className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink/70 hover:border-ink/30"
                >
                  폴더 배정
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {assignChannel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-ink/50"
            aria-label="닫기"
            onClick={() => setAssignChannel(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-paper p-5 shadow-xl">
            <h3 className="font-display text-lg text-ink">폴더에 배정</h3>
            <p className="mt-1 text-xs text-ink/50">여러 폴더를 선택할 수 있습니다.</p>
            <ul className="mt-4 max-h-64 space-y-2 overflow-auto">
              {folders.map((f) => {
                const checked = selectedFolders.includes(f.id);
                return (
                  <li key={f.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink/10 px-3 py-2 text-sm hover:bg-ink/[0.03]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedFolders((prev) =>
                            checked
                              ? prev.filter((id) => id !== f.id)
                              : [...prev, f.id],
                          )
                        }
                      />
                      {f.name}
                    </label>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssignChannel(null)}
                className="rounded-lg px-3 py-1.5 text-sm text-ink/60"
              >
                취소
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={saveAssign}
                className="rounded-lg bg-crimson px-3 py-1.5 text-sm font-medium text-paper disabled:opacity-50"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
