export function downloadCsv(
  filename: string,
  rows: Record<string, unknown>[],
  columns: { key: string; header: string }[],
): void {
  if (typeof document === "undefined") return;

  const escape = (v: unknown): string => {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [
    columns.map((c) => escape(c.header)).join(","),
    ...rows.map((r) => columns.map((c) => escape(r[c.key])).join(",")),
  ];
  const csv = "﻿" + lines.join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
