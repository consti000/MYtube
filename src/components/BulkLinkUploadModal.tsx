"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import * as XLSX from "xlsx";
import { normalizeLinkPlatform } from "@/lib/validators";

type FolderOption = { id: string; name: string };

type ParsedRow = {
  platform: "x" | "facebook";
  name: string;
  url: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  folders: FolderOption[];
  defaultFolderId?: string;
};

function cell(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const found = Object.keys(row).find(
      (k) => k.trim().toLowerCase() === key.toLowerCase(),
    );
    if (found != null && row[found] != null && String(row[found]).trim()) {
      return String(row[found]).trim();
    }
  }
  return "";
}

function parseSheet(file: ArrayBuffer): {
  rows: ParsedRow[];
  errors: string[];
} {
  const workbook = XLSX.read(file, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { rows: [], errors: ["시트가 비어 있습니다"] };

  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  if (!raw.length) {
    return { rows: [], errors: ["데이터 행이 없습니다"] };
  }

  const rows: ParsedRow[] = [];
  const errors: string[] = [];

  raw.forEach((item, index) => {
    const excelRow = index + 2;
    const platformRaw = cell(item, ["platform", "플랫폼", "sns"]);
    const name = cell(item, ["name", "이름", "채널", "페이지"]);
    const url = cell(item, ["url", "링크", "주소"]);

    const platform = normalizeLinkPlatform(platformRaw);
    if (!platform) {
      errors.push(`${excelRow}행: platform은 x 또는 facebook 이어야 합니다`);
      return;
    }
    if (!name) {
      errors.push(`${excelRow}행: name(이름)이 필요합니다`);
      return;
    }
    if (!url) {
      errors.push(`${excelRow}행: url이 필요합니다`);
      return;
    }

    rows.push({ platform, name, url });
  });

  return { rows, errors };
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["platform", "name", "url"],
    ["x", "북극성", "https://x.com/PolarisLog"],
    ["facebook", "예시페이지", "https://www.facebook.com/example"],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "links");
  XLSX.writeFile(wb, "mytube-links-template.xlsx");
}

export function BulkLinkUploadModal({
  open,
  onClose,
  folders,
  defaultFolderId,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [folderId, setFolderId] = useState(
    defaultFolderId ?? folders[0]?.id ?? "",
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFolderId(defaultFolderId ?? folders[0]?.id ?? "");
    setFileName(null);
    setRows([]);
    setParseErrors([]);
    setError(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [open, defaultFolderId, folders]);

  if (!open) return null;

  async function onFileChange(file: File | null) {
    setError(null);
    setResult(null);
    setRows([]);
    setParseErrors([]);
    setFileName(null);
    if (!file) return;

    const okExt = /\.(xlsx|xls|csv)$/i.test(file.name);
    if (!okExt) {
      setError("xlsx, xls, csv 파일만 업로드할 수 있습니다");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseSheet(buffer);
      setFileName(file.name);
      setRows(parsed.rows);
      setParseErrors(parsed.errors);
      if (!parsed.rows.length && !parsed.errors.length) {
        setError("읽을 수 있는 행이 없습니다");
      }
    } catch {
      setError("엑셀 파일을 읽지 못했습니다");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!folderId || !rows.length) return;
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/links/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId, rows }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        created?: number;
        failed?: number;
        failures?: Array<{ row: number; name: string; reason: string }>;
        error?: string | { formErrors?: string[] };
      };
      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : data.error?.formErrors?.[0] ?? `업로드 실패 (${res.status})`;
        setError(msg);
        return;
      }

      const failHint =
        data.failed && data.failures?.length
          ? ` · 실패 ${data.failed}건 (예: ${data.failures[0].row}행 ${data.failures[0].name})`
          : "";
      setResult(`${data.created ?? 0}건 등록 완료${failHint}`);
      router.refresh();
      if (!data.failed) {
        onClose();
      }
    } catch {
      setError("네트워크 오류로 업로드하지 못했습니다");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-ink/10 bg-paper p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">링크 일괄 업로드</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-ink/50 hover:bg-ink/5 hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-xs leading-relaxed text-ink/55">
            엑셀 열: <code className="text-ink/70">platform</code>,{" "}
            <code className="text-ink/70">name</code>,{" "}
            <code className="text-ink/70">url</code>
            <br />
            platform은 <code className="text-ink/70">x</code> 또는{" "}
            <code className="text-ink/70">facebook</code> (한/영 동의어 가능)
          </p>

          <button
            type="button"
            onClick={downloadTemplate}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm text-ink/70 hover:border-ink/30 hover:text-ink"
          >
            엑셀 양식 다운로드
          </button>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-ink/50">
              소속 폴더
            </span>
            <select
              required
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none ring-crimson/30 focus:ring-2"
            >
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-ink/50">
              엑셀 파일
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-ink/70 file:mr-3 file:rounded-lg file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-paper hover:file:bg-ink/85"
            />
            {fileName ? (
              <p className="text-[11px] text-ink/45">
                {fileName} · 유효 {rows.length}행
                {parseErrors.length ? ` · 오류 ${parseErrors.length}건` : ""}
              </p>
            ) : null}
          </label>

          {parseErrors.length > 0 ? (
            <ul className="max-h-28 space-y-1 overflow-auto rounded-lg border border-crimson/20 bg-crimson/[0.04] px-3 py-2 text-[11px] text-crimson">
              {parseErrors.slice(0, 8).map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
              {parseErrors.length > 8 ? (
                <li>…외 {parseErrors.length - 8}건</li>
              ) : null}
            </ul>
          ) : null}

          {error ? <p className="text-sm text-crimson">{error}</p> : null}
          {result ? <p className="text-sm text-emerald-700">{result}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-ink/70 hover:bg-ink/5"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={pending || !folderId || rows.length === 0}
              className="rounded-lg bg-crimson px-4 py-2 text-sm font-medium text-paper hover:bg-crimson/90 disabled:opacity-50"
            >
              {pending ? "업로드 중…" : `${rows.length || ""}건 업로드`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
