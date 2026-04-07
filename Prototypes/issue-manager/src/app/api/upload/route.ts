import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { enrichRowAsync } from "@/lib/ai";
import { bulkInsert, computeDedupHash } from "@/lib/db";
import { parseExcelCellDateToIso } from "@/lib/excel-date";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

function isExcelBuffer(buf: Buffer, lowerName: string): boolean {
  if (buf.length < 4) return false;
  const zip = buf[0] === 0x50 && buf[1] === 0x4b;
  const ole =
    buf[0] === 0xd0 &&
    buf[1] === 0xcf &&
    buf[2] === 0x11 &&
    buf[3] === 0xe0;
  if (lowerName.endsWith(".xlsx")) return zip;
  if (lowerName.endsWith(".xls")) return ole || zip;
  return zip || ole;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File too large (max 15 MB)" },
        { status: 413 },
      );
    }

    const name = (file.name || "").toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      return NextResponse.json(
        { error: "Only .xlsx or .xls files are allowed" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isExcelBuffer(buffer, name)) {
      return NextResponse.json(
        { error: "Invalid file: not a recognized Excel workbook" },
        { status: 400 },
      );
    }

    const workbook = XLSX.read(buffer, { type: "buffer" });

    const targetSheets = ["Rekap All Area", workbook.SheetNames[0]];
    let sheetName = targetSheets.find((n) => workbook.SheetNames.includes(n));
    if (!sheetName) sheetName = workbook.SheetNames[0];

    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });

    if (rawRows.length === 0) {
      return NextResponse.json({ error: "No data rows found in sheet" }, { status: 400 });
    }

    const headers = Object.keys(rawRows[0]);

    const colMap = {
      area: headers.find((h) => /area|dc|lokasi/i.test(h)) || headers[0],
      date: headers.find((h) => /tanggal|date/i.test(h)) || headers[1],
      divisi: headers.find((h) => /divisi|division/i.test(h)) || headers[2],
      role: headers.find((h) => /role|jabatan/i.test(h)) || headers[3],
      klasifikasi: headers.find((h) => /klasifikasi|classif/i.test(h)) || headers[4],
      issue: headers.find((h) => /issue|masalah|problem|keluhan/i.test(h)) || headers[5],
      followUp: headers.find((h) => /follow/i.test(h)) || headers[6],
      progress: headers.find((h) => /progress|update/i.test(h)) || headers[7],
      urgency: headers.find((h) => /urgen|severity|prior/i.test(h)) || headers[8],
      ticketNo: headers.find((h) => /ticket|tiket/i.test(h)) || headers[10],
    };

    const enrichedRows = [];
    for (const raw of rawRows) {
      const issueText = String(raw[colMap.issue] || "").trim();
      if (!issueText || issueText === "0" || issueText.length < 3) continue;

      const enriched = await enrichRowAsync({
        area: String(raw[colMap.area] || ""),
        date: parseExcelCellDateToIso(raw[colMap.date]),
        divisi: String(raw[colMap.divisi] || ""),
        role: String(raw[colMap.role] || ""),
        klasifikasi: String(raw[colMap.klasifikasi] || ""),
        issue: issueText,
        followUp: String(raw[colMap.followUp] || ""),
        progress: String(raw[colMap.progress] || ""),
        urgency: String(raw[colMap.urgency] || ""),
        ticketNo: String(raw[colMap.ticketNo] || ""),
      });

      const dedupHash = computeDedupHash(
        enriched.area,
        enriched.date,
        enriched.divisi,
        enriched.role,
        enriched.issue,
      );

      enrichedRows.push({ ...enriched, dedupHash, source: "excel" });
    }

    const result = await bulkInsert(enrichedRows);

    return NextResponse.json({
      success: true,
      sheet: sheetName,
      totalRows: rawRows.length,
      validRows: enrichedRows.length,
      inserted: result.inserted,
      skipped: result.skipped,
      newIds: result.newIds.slice(0, 20),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
