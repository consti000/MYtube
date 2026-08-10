"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { SocialExternalLink } from "@/components/SocialExternalLink";

export type FolderLinkItem = {
  id: string;
  platform: "x" | "facebook" | string;
  name: string;
  url: string;
};

function handleFromUrl(url: string, platform: string) {
  try {
    const u = new URL(url);
    const seg = u.pathname.replace(/^\/+/, "").split("/")[0] || u.hostname;
    if (platform === "x") return seg.startsWith("@") ? seg : `@${seg}`;
    return `${u.hostname.replace(/^www\./, "")}/${seg}`;
  } catch {
    return url;
  }
}

function PlatformMark({ platform }: { platform: "x" | "facebook" }) {
  const label = platform === "x" ? "X" : "FB";
  return (
    <span className="inline-flex h-[18px] min-w-[22px] items-center justify-center rounded-[3px] bg-ink/10 px-[5px] text-[10px] font-bold tracking-wide text-ink/60">
      {label}
    </span>
  );
}

function SortableLinkRow({ item }: { item: FolderLinkItem }) {
  const platform = item.platform === "facebook" ? "facebook" : "x";
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 rounded-lg border border-ink/15 bg-paper transition ${
        isDragging ? "z-10 opacity-90 shadow-md" : ""
      }`}
    >
      <button
        type="button"
        className="touch-none shrink-0 rounded-md p-2 text-ink/35 hover:bg-ink/5 hover:text-ink/70"
        aria-label={`${item.name} 순서 변경`}
        title="드래그하여 순서 변경"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <SocialExternalLink
        platform={platform}
        url={item.url}
        className="flex min-w-0 flex-1 items-center gap-2.5 py-2.5 pr-3 text-left transition hover:opacity-90"
      >
        <PlatformMark platform={platform} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-ink">
            {item.name}
          </span>
          <span className="block truncate text-[11px] text-ink/40">
            {handleFromUrl(item.url, platform)}
          </span>
        </span>
        <span className="shrink-0 text-[11px] font-semibold text-crimson">
          열기 →
        </span>
      </SocialExternalLink>
    </div>
  );
}

type Props = {
  folderId: string;
  links: FolderLinkItem[];
  deleteMode: boolean;
  selectedLinkIds: string[];
  onToggleLink: (id: string) => void;
};

export function SortableFolderLinks({
  folderId,
  links: initialLinks,
  deleteMode,
  selectedLinkIds,
  onToggleLink,
}: Props) {
  const router = useRouter();
  const [links, setLinks] = useState(initialLinks);
  const [dndReady, setDndReady] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    setDndReady(true);
  }, []);

  useEffect(() => {
    setLinks(initialLinks);
  }, [initialLinks]);

  async function persistOrder(next: FolderLinkItem[]) {
    const res = await fetch(`/api/folders/${folderId}/links/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkIds: next.map((l) => l.id) }),
    });
    if (!res.ok) {
      setLinks(initialLinks);
      return;
    }
    router.refresh();
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLinks((prev) => {
      const oldIndex = prev.findIndex((l) => l.id === active.id);
      const newIndex = prev.findIndex((l) => l.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      const next = arrayMove(prev, oldIndex, newIndex);
      void persistOrder(next);
      return next;
    });
  }

  if (!links.length) {
    return (
      <div className="rounded-lg border border-dashed border-ink/15 bg-ink/[0.02] px-3 py-3 text-xs text-ink/50">
        이 폴더에 등록된 X/Facebook 링크가 없습니다. 링크 추가에서 URL을
        등록하세요.
      </div>
    );
  }

  if (deleteMode) {
    return (
      <div className="space-y-2">
        {links.map((s) => {
          const platform = s.platform === "facebook" ? "facebook" : "x";
          const checked = selectedLinkIds.includes(s.id);
          return (
            <label
              key={s.id}
              className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition ${
                checked
                  ? "border-crimson/40 bg-crimson/[0.06]"
                  : "border-ink/15 bg-paper hover:border-ink/25"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggleLink(s.id)}
                className="h-4 w-4 shrink-0 accent-crimson"
                aria-label={`${s.name} 선택`}
              />
              <PlatformMark platform={platform} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink">
                  {s.name}
                </span>
                <span className="block truncate text-[11px] text-ink/40">
                  {handleFromUrl(s.url, platform)}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    );
  }

  if (!dndReady) {
    return (
      <div className="space-y-2">
        {links.map((item) => {
          const platform = item.platform === "facebook" ? "facebook" : "x";
          return (
            <div
              key={item.id}
              className="flex items-center gap-1 rounded-lg border border-ink/15 bg-paper"
            >
              <span className="shrink-0 p-2 text-ink/25">
                <GripVertical className="h-4 w-4" />
              </span>
              <SocialExternalLink
                platform={platform}
                url={item.url}
                className="flex min-w-0 flex-1 items-center gap-2.5 py-2.5 pr-3"
              >
                <PlatformMark platform={platform} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">
                    {item.name}
                  </span>
                  <span className="block truncate text-[11px] text-ink/40">
                    {handleFromUrl(item.url, platform)}
                  </span>
                </span>
                <span className="shrink-0 text-[11px] font-semibold text-crimson">
                  열기 →
                </span>
              </SocialExternalLink>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <DndContext
      id={`folder-${folderId}-links-dnd`}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={links.map((l) => l.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {links.map((item) => (
            <SortableLinkRow key={item.id} item={item} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
