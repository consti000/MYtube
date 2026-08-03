"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

export type DashboardFolderCard = {
  id: string;
  name: string;
  channelCount: number;
  linkCount: number;
  previews: { id: string; thumbnailUrl: string | null }[];
};

function FolderCardBody({ folder }: { folder: DashboardFolderCard }) {
  return (
    <>
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-ink">
          {folder.name}
        </h2>
        <span className="shrink-0 text-[11px] text-ink/40">
          YT {folder.channelCount} · 링크 {folder.linkCount}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {folder.previews.length === 0 ? (
          <p className="col-span-2 py-8 text-center text-xs text-ink/40">
            미리볼 영상 없음
          </p>
        ) : (
          folder.previews.map((v) => (
            <div key={v.id} className="overflow-hidden rounded-lg bg-ink/5">
              <div className="aspect-video">
                {v.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function StaticFolderCard({ folder }: { folder: DashboardFolderCard }) {
  return (
    <div className="relative rounded-2xl border border-ink/10 bg-paper transition hover:border-crimson/35 hover:shadow-md">
      <span className="absolute left-2 top-2 z-10 rounded-md p-1.5 text-ink/25">
        <GripVertical className="h-4 w-4" />
      </span>
      <Link href={`/folders/${folder.id}`} className="block p-4 pl-10">
        <FolderCardBody folder={folder} />
      </Link>
    </div>
  );
}

function SortableFolderCard({ folder }: { folder: DashboardFolderCard }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: folder.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-2xl border border-ink/10 bg-paper transition hover:border-crimson/35 hover:shadow-md ${
        isDragging ? "z-10 opacity-90 shadow-lg" : ""
      }`}
    >
      <button
        type="button"
        className="absolute left-2 top-2 z-10 touch-none rounded-md p-1.5 text-ink/35 hover:bg-ink/5 hover:text-ink/70"
        aria-label={`${folder.name} 순서 변경`}
        title="드래그하여 순서 변경"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Link href={`/folders/${folder.id}`} className="block p-4 pl-10">
        <FolderCardBody folder={folder} />
      </Link>
    </div>
  );
}

export function DashboardFoldersClient({
  initialFolders,
}: {
  initialFolders: DashboardFolderCard[];
}) {
  const router = useRouter();
  const [folders, setFolders] = useState(initialFolders);
  const [dndReady, setDndReady] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    setDndReady(true);
  }, []);

  useEffect(() => {
    setFolders(initialFolders);
  }, [initialFolders]);

  async function persistOrder(next: DashboardFolderCard[]) {
    const res = await fetch("/api/folders/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderIds: next.map((f) => f.id) }),
    });
    if (!res.ok) {
      setFolders(initialFolders);
      return;
    }
    router.refresh();
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setFolders((prev) => {
      const oldIndex = prev.findIndex((f) => f.id === active.id);
      const newIndex = prev.findIndex((f) => f.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      const next = arrayMove(prev, oldIndex, newIndex);
      void persistOrder(next);
      return next;
    });
  }

  return (
    <div className="overflow-x-hidden">
      <p className="mb-3 text-xs text-ink/45">
        왼쪽 ⋮⋮ 아이콘을 드래그해 폴더 순서를 바꿀 수 있습니다.
      </p>
      {!dndReady ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {folders.map((folder) => (
            <StaticFolderCard key={folder.id} folder={folder} />
          ))}
        </div>
      ) : (
        <DndContext
          id="dashboard-folders-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={folders.map((f) => f.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {folders.map((folder) => (
                <SortableFolderCard key={folder.id} folder={folder} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
