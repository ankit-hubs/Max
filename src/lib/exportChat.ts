import { jsPDF } from "jspdf";
import type { ChatTurn } from "@/app/c/[id]/page";

export function exportAsTXT(chatHistory: ChatTurn[], title: string) {
  let content = `# ${title}\n# Exported: ${new Date().toLocaleString()}\n\n`;

  chatHistory.forEach((turn, idx) => {
    const role = turn.message.role === "user" ? "You" : "Kai";
    content += `## ${role}:\n${turn.message.content}\n\n`;

    if (turn.citations && turn.citations.length > 0) {
      content += "### Sources:\n";
      turn.citations.forEach((c, i) => {
        content += `${i + 1}. ${c.title} - ${c.url}\n`;
      });
      content += "\n";
    }
  });

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAsPDF(chatHistory: ChatTurn[], title: string) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  doc.setFontSize(18);
  doc.text(title, margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(128);
  doc.text(`Exported: ${new Date().toLocaleString()}`, margin, y);
  y += 15;

  chatHistory.forEach((turn) => {
    const role = turn.message.role === "user" ? "You" : "Kai";

    doc.setFontSize(12);
    doc.setTextColor(role === "You" ? 59 : 37);
    doc.setFont("helvetica", "bold");
    doc.text(`${role}:`, margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.setFont("helvetica", "normal");

    const lines = doc.splitTextToSize(turn.message.content, pageWidth - margin * 2);
    lines.forEach((line: string) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 6;
    });

    y += 5;

    if (turn.citations && turn.citations.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(128);
      doc.text("Sources:", margin, y);
      y += 5;

      turn.citations.forEach((c) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(`- ${c.title}: ${c.url}`, margin + 5, y);
        y += 5;
      });
    }

    y += 10;
  });

  doc.save(`${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`);
}
