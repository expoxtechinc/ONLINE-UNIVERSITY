import PDFDocument from "pdfkit";
import QRCode from "qrcode";

type CertificateDocumentInput = {
  learnerName: string;
  courseName: string;
  issuedAt: Date;
  finalScore: number;
  verificationCode: string;
  verificationUrl: string;
};

type TranscriptDocumentInput = {
  learnerName: string;
  learnerEmail: string | null;
  createdAt: Date;
  entries: Array<{ title: string; category: string; level: string; durationMinutes: number; status: string; progressPercent: number; finalScore: number | null; issuedAt: Date | null }>;
};

function collectDocument(build: (document: any) => void) {
  return new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", layout: "landscape", margin: 0, info: { Author: "Online University", Creator: "Online University Credential Service" } });
    const chunks: Buffer[] = [];
    document.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
    build(document);
    document.end();
  });
}

export async function generateCertificatePdf(input: CertificateDocumentInput) {
  const qr = await QRCode.toBuffer(input.verificationUrl, { type: "png", errorCorrectionLevel: "M", margin: 1, width: 220 });
  return collectDocument((document) => {
    const width = document.page.width;
    const height = document.page.height;
    document.rect(0, 0, width, height).fill("#F8F6F1");
    document.rect(0, 0, 18, height).fill("#102A43");
    document.rect(width - 146, 0, 146, height).fill("#102A43");
    document.fillColor("#D6A84B").font("Helvetica-Bold").fontSize(11).text("ONLINE UNIVERSITY", 55, 48, { characterSpacing: 2 });
    document.fillColor("#102A43").font("Helvetica-Bold").fontSize(31).text("Certificate of Completion", 55, 84);
    document.strokeColor("#D6A84B").lineWidth(2).moveTo(55, 128).lineTo(190, 128).stroke();
    document.fillColor("#627D98").font("Helvetica").fontSize(12).text(`Issued ${input.issuedAt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`, 55, 157);
    document.fillColor("#627D98").fontSize(11).text("This certifies that", 55, 206);
    document.fillColor("#102A43").font("Helvetica-Bold").fontSize(28).text(input.learnerName, 55, 225, { width: 430 });
    document.fillColor("#627D98").font("Helvetica").fontSize(11).text("has successfully completed", 55, 277);
    document.fillColor("#183B65").font("Helvetica-Bold").fontSize(19).text(input.courseName, 55, 296, { width: 440 });
    document.fillColor("#4A5E73").font("Helvetica").fontSize(10).text("This credential was generated from the learner’s verified Online University academic record.", 55, 345, { width: 420, lineGap: 3 });
    document.fillColor("#D6A84B").font("Helvetica-Oblique").fontSize(23).text("Sokpah", 55, 405);
    document.strokeColor("#102A43").lineWidth(0.8).moveTo(55, 436).lineTo(190, 436).stroke();
    document.fillColor("#4A5E73").font("Helvetica").fontSize(9).text("Akin S. Sokpah · CEO & Founder, Online University", 55, 443);
    document.fillColor("#627D98").font("Helvetica-Bold").fontSize(8).text("CERTIFICATE ID", 55, 497, { characterSpacing: 1 });
    document.fillColor("#102A43").font("Helvetica-Bold").fontSize(10).text(input.verificationCode, 55, 510);
    document.fillColor("#627D98").font("Helvetica-Bold").fontSize(8).text("FINAL SCORE", 265, 497, { characterSpacing: 1 });
    document.fillColor("#102A43").font("Helvetica-Bold").fontSize(10).text(`${input.finalScore}%`, 265, 510);
    document.image(qr, width - 119, 177, { width: 90, height: 90 });
    document.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(8).text("SCAN TO VERIFY", width - 130, 278, { width: 115, align: "center", characterSpacing: 0.7 });
    document.fillColor("#D6A84B").font("Helvetica").fontSize(7).text(input.verificationCode, width - 130, 295, { width: 115, align: "center" });
  });
}

export async function generateTranscriptPdf(input: TranscriptDocumentInput) {
  return collectDocument((document) => {
    const width = document.page.width;
    document.rect(0, 0, width, 100).fill("#102A43");
    document.fillColor("#D6A84B").font("Helvetica-Bold").fontSize(11).text("ONLINE UNIVERSITY", 42, 30, { characterSpacing: 1.8 });
    document.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(25).text("Official Learner Transcript", 42, 51);
    document.fillColor("#102A43").font("Helvetica-Bold").fontSize(17).text(input.learnerName, 42, 132);
    document.fillColor("#627D98").font("Helvetica").fontSize(10).text(input.learnerEmail || "", 42, 155);
    document.text(`Academic record created ${input.createdAt.toLocaleDateString()}`, 42, 170);
    const columns = [42, 255, 370, 448, 520, 610, 690];
    const headers = ["COURSE", "CATEGORY", "LEVEL", "STATUS", "PROGRESS", "SCORE", "ISSUED"];
    document.rect(42, 205, width - 84, 24).fill("#EAF0F7");
    document.fillColor("#4A5E73").font("Helvetica-Bold").fontSize(7);
    headers.forEach((header, index) => document.text(header, columns[index], 213, { characterSpacing: 0.7 }));
    let y = 243;
    document.font("Helvetica").fontSize(8);
    input.entries.forEach((entry) => {
      if (y > 530) { document.addPage({ size: "A4", layout: "landscape", margin: 42 }); y = 60; }
      document.fillColor("#102A43").font("Helvetica-Bold").fontSize(9).text(entry.title, columns[0], y, { width: 195 });
      document.fillColor("#4A5E73").font("Helvetica").fontSize(8).text(entry.category, columns[1], y, { width: 100 });
      document.text(entry.level, columns[2], y, { width: 65 });
      document.text(entry.status.replace(/_/g, " "), columns[3], y, { width: 64 });
      document.text(`${entry.progressPercent}%`, columns[4], y, { width: 55 });
      document.text(entry.finalScore === null ? "—" : `${entry.finalScore}%`, columns[5], y, { width: 45 });
      document.text(entry.issuedAt ? entry.issuedAt.toLocaleDateString() : "—", columns[6], y, { width: 60 });
      document.strokeColor("#E3EAF0").lineWidth(0.5).moveTo(42, y + 26).lineTo(width - 42, y + 26).stroke();
      y += 38;
    });
    document.fillColor("#627D98").font("Helvetica").fontSize(8).text("This transcript is generated from the learner’s secure Online University record. Credential validity can be independently checked using each certificate verification code.", 42, 548, { width: width - 84, align: "center" });
  });
}
