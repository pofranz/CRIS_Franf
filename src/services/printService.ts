export function openPrintWindow(el: HTMLElement, title: string) {
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((s) => s.outerHTML)
    .join('\n');

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  ${styles}
  <style>
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    @page {
      size: 8.5in 13in;
      margin: 8mm 10mm;
    }
    html, body {
      background: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 24px 0;
      font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .print-toolbar {
      max-width: 8.5in;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: white;
      padding: 12px 18px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      font-family: system-ui, -apple-system, sans-serif;
    }
    .print-toolbar-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .print-toolbar-actions {
      display: flex;
      gap: 10px;
    }
    .btn-print {
      background: #2563eb;
      color: white;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-print:hover {
      background: #1d4ed8;
    }
    .btn-close {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    .print-sheet {
      width: 8.5in;
      max-width: 8.5in;
      min-height: 13in;
      box-sizing: border-box;
      margin: 0 auto;
      background: white;
      padding: 36px 40px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      position: relative;
    }
    @media print {
      body {
        background: transparent !important;
        padding: 0 !important;
        color: black !important;
      }
      .print-toolbar {
        display: none !important;
      }
      .print-sheet {
        padding: 0 !important;
        margin: 0 auto !important;
        box-shadow: none !important;
        border: none !important;
        max-width: 100% !important;
        width: 100% !important;
        position: relative !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      #printable-lcr-certificate, #printable-lcr-certificate-view, .wysiwyg-rendered-certificate {
        padding: 0 !important;
        margin: 0 !important;
        border: none !important;
        box-shadow: none !important;
        max-width: 100% !important;
        width: 100% !important;
        position: relative !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <div>
      <span class="print-toolbar-title">${title}</span>
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Tip: In print destination, select "Save as PDF" (Paper Size: Legal / Folio 8.5 × 13 in) to download as a permanent PDF document.</div>
    </div>
    <div class="print-toolbar-actions">
      <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF (8.5 × 13 in / PH Legal)</button>
      <button class="btn-close" onclick="window.close()">Close Window</button>
    </div>
  </div>
  <div class="print-sheet">
    ${el.outerHTML}
  </div>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 400);
    });
  <\/script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  const win = window.open(blobUrl, '_blank');
  if (!win || win.closed || typeof win.closed === 'undefined') {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 300);
  }
}

export function executeCertificatePrint(el: HTMLElement, title: string, forceNewTab = false) {
  if (forceNewTab) {
    openPrintWindow(el, title);
    return;
  }
  const inIframe = typeof window !== 'undefined' && window.self !== window.top;
  if (inIframe) {
    openPrintWindow(el, title);
    return;
  }
  try {
    window.print();
  } catch {
    openPrintWindow(el, title);
  }
}
