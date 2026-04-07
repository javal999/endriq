"use client";

import { useState } from "react";
import Link from "next/link";

interface UploadResult {
  success: boolean;
  sheet: string;
  totalRows: number;
  validRows: number;
  inserted: number;
  skipped: number;
  newIds: string[];
  error?: string;
}

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) {
      setError("Select an Excel file first.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error. Check the server.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Excel</h1>
        <p className="text-sm text-gray-500 mt-1">
          Import issue data from an Excel file. The system will parse, normalize,
          classify, and deduplicate automatically. Existing issues are skipped.
        </p>
      </div>

      <form
        onSubmit={handleUpload}
        className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Excel File (.xlsx)
          </label>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm hover:bg-gray-200">
              Choose File
              <input
                type="file"
                name="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => setFileName(e.target.files?.[0]?.name || null)}
              />
            </label>
            <span className="text-sm text-gray-500">
              {fileName || "No file selected"}
            </span>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800 space-y-1">
          <p className="font-semibold">How deduplication works</p>
          <p>
            Each row is matched by area + date + division + role + issue text.
            If an identical combination already exists in the system, the row is skipped.
            Only genuinely new issues are added.
          </p>
        </div>

        <button
          type="submit"
          disabled={uploading || !fileName}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? "Uploading & Processing..." : "Upload & Process"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-800">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-lg">Upload Result</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{result.totalRows}</div>
              <div className="text-xs text-gray-500">Total Rows</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{result.validRows}</div>
              <div className="text-xs text-gray-500">Valid Issues</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-700">
                {result.inserted}
              </div>
              <div className="text-xs text-green-600">New Added</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-700">
                {result.skipped}
              </div>
              <div className="text-xs text-yellow-600">Duplicates Skipped</div>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Sheet used: <span className="font-medium">{result.sheet}</span>
          </p>

          {result.newIds.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Newly Added Issues
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.newIds.map((id) => (
                  <Link
                    key={id}
                    href={`/issues/${id}`}
                    className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100"
                  >
                    {id}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Link
              href="/issues"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              View All Issues
            </Link>
            <Link
              href="/triage?status=New"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              Triage New Issues
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
