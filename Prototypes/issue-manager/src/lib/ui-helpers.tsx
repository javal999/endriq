export function priorityColor(priority: string): string {
  if (priority.includes("P1")) return "bg-red-100 text-red-800 border-red-200";
  if (priority.includes("P2")) return "bg-orange-100 text-orange-800 border-orange-200";
  if (priority.includes("P3")) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    New: "bg-blue-100 text-blue-800",
    Triaged: "bg-indigo-100 text-indigo-800",
    Assigned: "bg-purple-100 text-purple-800",
    "In Progress": "bg-amber-100 text-amber-800",
    Resolved: "bg-emerald-100 text-emerald-800",
    Closed: "bg-gray-100 text-gray-600",
    Duplicate: "bg-gray-100 text-gray-400",
  };
  return map[status] || "bg-gray-100 text-gray-600";
}

export function l1Color(l1: string): string {
  const map: Record<string, string> = {
    System: "bg-red-50 text-red-700",
    Process: "bg-blue-50 text-blue-700",
    Data: "bg-violet-50 text-violet-700",
    People: "bg-green-50 text-green-700",
    Infrastructure: "bg-orange-50 text-orange-700",
    Coordination: "bg-cyan-50 text-cyan-700",
  };
  return map[l1] || "bg-gray-50 text-gray-600";
}

export function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date("2026-04-02");
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function checkSlaBreach(priority: string, ageDays: number): boolean {
  if (priority.includes("P1")) return ageDays > 1;
  if (priority.includes("P2")) return ageDays > 3;
  if (priority.includes("P3")) return ageDays > 7;
  return ageDays > 14;
}

export function slaTargetLabel(priority: string): string {
  if (priority.includes("P1")) return "24 hours";
  if (priority.includes("P2")) return "72 hours";
  if (priority.includes("P3")) return "7 days";
  return "14 days";
}

export function Badge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${className}`}
    >
      {children}
    </span>
  );
}
