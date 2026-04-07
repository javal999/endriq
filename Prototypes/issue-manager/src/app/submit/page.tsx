"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { L1_DOMAINS, L2_AREAS, PRIORITIES, ROUTES } from "@/lib/types";

const AREAS = [
  "BANDUNG", "BEKASI", "BOGOR", "CIKARANG", "CIKUPA", "CIREBON", "DENPASAR",
  "GARUT", "INDRAMAYU", "JAKARTA 1", "JAKARTA 2", "JAMBI", "JEMBER",
  "KARAWANG", "KEDIRI", "LAMPUNG", "MADIUN", "MAGELANG", "MAKASSAR",
  "MALANG", "MANADO", "MEDAN", "PADANG", "PALEMBANG", "PEKANBARU",
  "PONTIANAK", "PURWOKERTO", "SAMARINDA", "SEMARANG", "SOLO",
  "SUKABUMI", "SURABAYA", "TANGERANG", "TASIKMALAYA", "YOGYAKARTA",
];

const DIVISIONS = ["Administrator", "Logistik", "Absolute", "Commercial", "BCR", "Finance", "HR", "All"];
const ROLES = ["Admin", "Logistik", "Storeman", "Driver", "Sales", "BCR", "HRBP", "Koordinator", "Absolute", "Other"];

interface Classification {
  l1Domain: string;
  l2ProcessArea: string;
  routeTo: string;
  priority: string;
  summary: string;
}

interface SimilarIssue {
  id: string;
  area: string;
  summary: string;
  issue: string;
  l1Domain: string;
  l2ProcessArea: string;
  status: string;
  routeTo: string;
  followUp: string;
  progress: string;
}

export default function SubmitPage() {
  const [step, setStep] = useState(1);

  const [area, setArea] = useState("");
  const [divisi, setDivisi] = useState("");
  const [role, setRole] = useState("");
  const [issueText, setIssueText] = useState("");

  const [classification, setClassification] = useState<Classification | null>(null);
  const [overrides, setOverrides] = useState<Partial<Classification>>({});
  const [classifying, setClassifying] = useState(false);

  const [similarIssues, setSimilarIssues] = useState<SimilarIssue[]>([]);
  const [searchingKb, setSearchingKb] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runClassification = useCallback(async () => {
    if (issueText.trim().length < 5) return;
    setClassifying(true);
    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: issueText }),
      });
      const data = await res.json();
      if (res.ok) {
        setClassification(data);
        setOverrides({});
      }
    } catch { /* ignore */ }
    setClassifying(false);
  }, [issueText]);

  const runKbSearch = useCallback(async () => {
    if (issueText.trim().length < 5) return;
    setSearchingKb(true);
    try {
      const res = await fetch("/api/similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: issueText, area }),
      });
      const data = await res.json();
      setSimilarIssues(data.matches || []);
    } catch { /* ignore */ }
    setSearchingKb(false);
  }, [issueText, area]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const final = { ...classification, ...overrides };
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area,
          divisi,
          role,
          issue: issueText,
          ...final,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Submission failed");
      } else {
        setSubmitted(data.issue);
      }
    } catch {
      setError("Network error");
    }
    setSubmitting(false);
  }

  function canProceedStep1() {
    return area && divisi && role;
  }
  function canProceedStep2() {
    return issueText.trim().length >= 5;
  }

  if (submitted) {
    return (
      <div className="p-6 max-w-3xl space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center space-y-4">
          <div className="text-4xl">&#10003;</div>
          <h2 className="text-xl font-bold text-green-800">Issue Submitted</h2>
          <p className="text-sm text-green-700">
            Your issue has been recorded as{" "}
            <Link
              href={`/issues/${submitted.id}`}
              className="font-mono font-bold underline"
            >
              {submitted.id}
            </Link>
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              href={`/issues/${submitted.id}`}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              View Issue
            </Link>
            <button
              onClick={() => {
                setSubmitted(null);
                setStep(1);
                setArea("");
                setDivisi("");
                setRole("");
                setIssueText("");
                setClassification(null);
                setOverrides({});
                setSimilarIssues([]);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Submit Issue</h1>
        <p className="text-sm text-gray-500 mt-1">
          Report a new issue. The system will classify, route, and check for previously solved cases.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 text-xs">
        {[
          { n: 1, label: "Reporter" },
          { n: 2, label: "Describe Issue" },
          { n: 3, label: "AI Classification" },
          { n: 4, label: "Knowledge Base" },
          { n: 5, label: "Confirm" },
        ].map((s) => (
          <div key={s.n} className="flex items-center gap-1">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s.n
                  ? "bg-blue-600 text-white"
                  : step > s.n
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-200 text-gray-400"
              }`}
            >
              {step > s.n ? "\u2713" : s.n}
            </span>
            <span className={`${step === s.n ? "text-gray-900 font-medium" : "text-gray-400"}`}>
              {s.label}
            </span>
            {s.n < 5 && <span className="text-gray-300 mx-1">/</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Reporter Info */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold">Step 1: Reporter Information</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Area / DC *
              </label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select area...</option>
                {AREAS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Division *
              </label>
              <select
                value={divisi}
                onChange={(e) => setDivisi(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select division...</option>
                {DIVISIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select role...</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              disabled={!canProceedStep1()}
              onClick={() => setStep(2)}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Issue Description */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold">Step 2: Describe the Issue</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Issue Description *
            </label>
            <textarea
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              rows={5}
              placeholder="Describe the problem in detail. Include what happened, when, and what process was affected..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              {issueText.length} characters (min 5)
            </p>
          </div>
          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              Back
            </button>
            <button
              disabled={!canProceedStep2()}
              onClick={async () => {
                setStep(3);
                await runClassification();
                await runKbSearch();
              }}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
            >
              Analyze & Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: AI Classification */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold">Step 3: AI Classification</h2>
          {classifying ? (
            <p className="text-sm text-gray-500">Analyzing issue text...</p>
          ) : classification ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm space-y-2">
                <p className="font-semibold text-blue-800">AI Suggestion</p>
                <p>
                  <span className="text-gray-500">Summary:</span>{" "}
                  <span className="font-medium">{classification.summary}</span>
                </p>
                <div className="flex flex-wrap gap-4">
                  <span>
                    <span className="text-gray-500">Domain:</span>{" "}
                    <span className="font-medium">{classification.l1Domain}</span>
                  </span>
                  <span>
                    <span className="text-gray-500">Process Area:</span>{" "}
                    <span className="font-medium">{classification.l2ProcessArea}</span>
                  </span>
                  <span>
                    <span className="text-gray-500">Route to:</span>{" "}
                    <span className="font-medium">{classification.routeTo}</span>
                  </span>
                  <span>
                    <span className="text-gray-500">Priority:</span>{" "}
                    <span className="font-medium">{classification.priority}</span>
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-600">
                  Override if needed:
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Domain (L1)</label>
                    <select
                      value={overrides.l1Domain || classification.l1Domain}
                      onChange={(e) =>
                        setOverrides({ ...overrides, l1Domain: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                    >
                      {L1_DOMAINS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">
                      Process Area (L2)
                    </label>
                    <select
                      value={overrides.l2ProcessArea || classification.l2ProcessArea}
                      onChange={(e) =>
                        setOverrides({
                          ...overrides,
                          l2ProcessArea: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                    >
                      {L2_AREAS.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Priority</label>
                    <select
                      value={overrides.priority || classification.priority}
                      onChange={(e) =>
                        setOverrides({ ...overrides, priority: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Route To</label>
                    <select
                      value={overrides.routeTo || classification.routeTo}
                      onChange={(e) =>
                        setOverrides({ ...overrides, routeTo: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                    >
                      {ROUTES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              Could not classify. Proceed manually.
            </p>
          )}
          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Knowledge Base */}
      {step === 4 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold">Step 4: Previously Solved Cases</h2>
          {searchingKb ? (
            <p className="text-sm text-gray-500">
              Searching knowledge base...
            </p>
          ) : similarIssues.length > 0 ? (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                Found {similarIssues.length} previously resolved issue(s) that
                match your description. Review them below. You might find
                the answer without submitting a new ticket.
              </div>
              <div className="space-y-3">
                {similarIssues.map((si) => (
                  <div
                    key={si.id}
                    className="border border-gray-200 rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/issues/${si.id}`}
                        target="_blank"
                        className="font-mono text-sm text-blue-600 hover:underline"
                      >
                        {si.id}
                      </Link>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-md">
                        {si.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        {si.area}
                      </span>
                      <span className="text-xs text-gray-400">
                        {si.l2ProcessArea}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">
                      {si.summary}
                    </p>
                    {(si.followUp || si.progress) && (
                      <div className="bg-green-50 rounded-lg p-3 text-xs space-y-1">
                        <p className="font-semibold text-green-800">
                          Resolution
                        </p>
                        {si.followUp && (
                          <p className="text-green-700">
                            <span className="font-medium">Follow-up:</span>{" "}
                            {si.followUp}
                          </p>
                        )}
                        {si.progress && (
                          <p className="text-green-700">
                            <span className="font-medium">Progress:</span>{" "}
                            {si.progress}
                          </p>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      Handled by: {si.routeTo}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-500">
              No previously solved cases found matching your issue. You can
              proceed to submit.
            </div>
          )}
          <div className="flex justify-between">
            <button
              onClick={() => setStep(3)}
              className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              Back
            </button>
            <button
              onClick={() => setStep(5)}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Proceed to Submit
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Confirm & Submit */}
      {step === 5 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold">Step 5: Review & Submit</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Area:</span>{" "}
              <span className="font-medium">{area}</span>
            </div>
            <div>
              <span className="text-gray-500">Division:</span>{" "}
              <span className="font-medium">{divisi}</span>
            </div>
            <div>
              <span className="text-gray-500">Role:</span>{" "}
              <span className="font-medium">{role}</span>
            </div>
            <div>
              <span className="text-gray-500">Domain:</span>{" "}
              <span className="font-medium">
                {overrides.l1Domain || classification?.l1Domain || "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Process Area:</span>{" "}
              <span className="font-medium">
                {overrides.l2ProcessArea || classification?.l2ProcessArea || "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Priority:</span>{" "}
              <span className="font-medium">
                {overrides.priority || classification?.priority || "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Route To:</span>{" "}
              <span className="font-medium">
                {overrides.routeTo || classification?.routeTo || "—"}
              </span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Issue Description</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">
              {issueText}
            </p>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {error}
            </div>
          )}
          <div className="flex justify-between">
            <button
              onClick={() => setStep(4)}
              className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Issue"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
