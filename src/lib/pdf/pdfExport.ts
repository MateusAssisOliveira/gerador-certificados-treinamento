import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import { CertificateTemplate } from '@/types/certificate';

// 1 mm = 2.834645669 pt
const MM_TO_PT = 72 / 25.4;

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) / 255;
    const g = parseInt(clean[1] + clean[1], 16) / 255;
    const b = parseInt(clean[2] + clean[2], 16) / 255;
    return rgb(r, g, b);
  }
  if (clean.length >= 6) {
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return rgb(r, g, b);
  }
  return rgb(0, 0, 0);
}

function substituteVariables(text: string, data: Record<string, string>): string {
  let result = text;
  for (const [key, val] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
    result = result.replace(regex, val || '');
  }
  return result;
}

export async function generateCertificatePdfBytes(
  template: CertificateTemplate,
  participantData: Record<string, string> = {}
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const isLandscape = template.orientation === 'landscape';
  const widthPt = isLandscape ? 841.89 : 595.28;
  const heightPt = isLandscape ? 595.28 : 841.89;

  const page = pdfDoc.addPage([widthPt, heightPt]);

  // Carrega fontes padrão universais do PDF
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontTimesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontTimesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  // 1. Fundo do Certificado
  if (template.background.color && template.background.type !== 'image') {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: widthPt,
      height: heightPt,
      color: hexToRgb(template.background.color),
    });
  }

  // Se houver imagem ou PDF de fundo carregado (Overlay)
  if (template.background.imageUrl) {
    try {
      const dataUrl = template.background.imageUrl;
      const base64Data = dataUrl.split(',')[1];
      if (base64Data) {
        const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        const isPng = dataUrl.startsWith('data:image/png');
        const embeddedImg = isPng ? await pdfDoc.embedPng(imageBytes) : await pdfDoc.embedJpg(imageBytes);
        page.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: widthPt,
          height: heightPt,
          opacity: template.background.opacity || 1.0,
        });
      }
    } catch (e) {
      console.warn('Não foi possível carregar o background do template no PDF:', e);
    }
  }

  // Ordena elementos pelo zIndex
  const sortedElements = [...template.elements].sort((a, b) => a.zIndex - b.zIndex);

  for (const el of sortedElements) {
    if (el.hidden) continue;

    const xPt = el.xMm * MM_TO_PT;
    const widthElPt = el.widthMm * MM_TO_PT;
    const heightElPt = el.heightMm * MM_TO_PT;
    // No PDF o eixo Y começa na base inferior da página
    const yPt = heightPt - (el.yMm * MM_TO_PT + heightElPt);

    if (el.type === 'frame' || el.type === 'line') {
      const bColor = el.border?.borderColor ? hexToRgb(el.border.borderColor) : rgb(0.2, 0.2, 0.2);
      const bWidth = el.border?.borderWidth || 1;

      if (el.type === 'line') {
        page.drawLine({
          start: { x: xPt, y: yPt + heightElPt / 2 },
          end: { x: xPt + widthElPt, y: yPt + heightElPt / 2 },
          thickness: bWidth,
          color: bColor,
        });
      } else if (el.frameType === 'classic-double') {
        // Moldura clássica dupla
        page.drawRectangle({
          x: xPt,
          y: yPt,
          width: widthElPt,
          height: heightElPt,
          borderColor: bColor,
          borderWidth: 1,
        });
        const gap = 5;
        if (widthElPt > gap * 2 && heightElPt > gap * 2) {
          page.drawRectangle({
            x: xPt + gap,
            y: yPt + gap,
            width: widthElPt - gap * 2,
            height: heightElPt - gap * 2,
            borderColor: bColor,
            borderWidth: bWidth,
          });
        }
      } else {
        page.drawRectangle({
          x: xPt,
          y: yPt,
          width: widthElPt,
          height: heightElPt,
          borderColor: bColor,
          borderWidth: bWidth,
          color: el.border?.borderWidth === 0 ? bColor : undefined,
        });
      }
    } else if (el.type === 'text' || el.type === 'variable') {
      const rawText = el.content || (el.variableTag ? `{{${el.variableTag}}}` : '');
      const replacedText = substituteVariables(rawText, participantData);

      let fontSize = el.style?.fontSize || 12;
      const isBold = el.style?.fontWeight === '700' || el.style?.fontWeight === '800';
      const isSerif = el.style?.fontFamily === 'Cinzel' || el.style?.fontFamily === 'Playfair Display';

      let selectedFont: PDFFont = fontHelvetica;
      if (isSerif) {
        selectedFont = isBold ? fontTimesBold : fontTimesRoman;
      } else {
        selectedFont = isBold ? fontHelveticaBold : fontHelvetica;
      }

      const textColor = el.style?.color ? hexToRgb(el.style.color) : rgb(0.1, 0.1, 0.1);

      // Auto-shrink para nomes longos se habilitado
      if (el.style?.shrinkToFit && replacedText.length > 0) {
        let measuredWidth = selectedFont.widthOfTextAtSize(replacedText, fontSize);
        while (measuredWidth > widthElPt && fontSize > 8) {
          fontSize -= 0.5;
          measuredWidth = selectedFont.widthOfTextAtSize(replacedText, fontSize);
        }
      }

      // Quebra de texto em linhas caso contenha \n ou seja parágrafo
      const lines = wrapTextLines(replacedText, widthElPt, selectedFont, fontSize);
      const lineHeightPt = fontSize * (el.style?.lineHeight || 1.3);
      const totalBlockHeight = lines.length * lineHeightPt;
      const startY = yPt + (heightElPt + totalBlockHeight) / 2 - fontSize;

      lines.forEach((line, idx) => {
        const textWidth = selectedFont.widthOfTextAtSize(line, fontSize);
        let textX = xPt;

        if (el.style?.textAlign === 'center') {
          textX = xPt + (widthElPt - textWidth) / 2;
        } else if (el.style?.textAlign === 'right') {
          textX = xPt + widthElPt - textWidth;
        }

        const lineY = startY - idx * lineHeightPt;

        page.drawText(line, {
          x: textX,
          y: lineY,
          size: fontSize,
          font: selectedFont,
          color: textColor,
        });
      });
    } else if (el.type === 'qrcode') {
      // Desenha bloco vetorial simulando QR Code de validação
      drawVectorQrCode(page, xPt, yPt, widthElPt, heightElPt);
    } else if (el.type === 'image' && el.imageUrl) {
      try {
        const dataUrl = el.imageUrl;
        const base64Data = dataUrl.split(',')[1];
        if (base64Data) {
          const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
          const isPng = dataUrl.startsWith('data:image/png');
          const embeddedImg = isPng ? await pdfDoc.embedPng(imageBytes) : await pdfDoc.embedJpg(imageBytes);

          page.drawImage(embeddedImg, {
            x: xPt,
            y: yPt,
            width: widthElPt,
            height: heightElPt,
          });
        }
      } catch (err) {
        console.warn('Erro ao embutir imagem no PDF:', err);
      }
    }
  }

  return await pdfDoc.save();
}

function wrapTextLines(text: string, maxWidthPt: number, font: PDFFont, fontSize: number): string[] {
  const result: string[] = [];
  const rawParagraphs = text.split('\n');

  for (const para of rawParagraphs) {
    if (!para.trim()) {
      result.push('');
      continue;
    }

    const words = para.split(' ');
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const candidateWidth = font.widthOfTextAtSize(candidate, fontSize);

      if (candidateWidth <= maxWidthPt || !currentLine) {
        currentLine = candidate;
      } else {
        result.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) {
      result.push(currentLine);
    }
  }

  return result;
}

function drawVectorQrCode(page: PDFPage, x: number, y: number, w: number, h: number) {
  // Borda do QR Code
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.1, 0.1, 0.1),
    borderWidth: 1,
  });

  // Marcadores de canto clássicos de QR Code
  const mSize = Math.min(w, h) * 0.28;
  const innerSize = mSize * 0.5;

  // Canto superior esquerdo
  page.drawRectangle({ x: x + 2, y: y + h - mSize - 2, width: mSize, height: mSize, borderColor: rgb(0, 0, 0), borderWidth: 2 });
  page.drawRectangle({ x: x + 2 + (mSize - innerSize) / 2, y: y + h - mSize - 2 + (mSize - innerSize) / 2, width: innerSize, height: innerSize, color: rgb(0, 0, 0) });

  // Canto superior direito
  page.drawRectangle({ x: x + w - mSize - 2, y: y + h - mSize - 2, width: mSize, height: mSize, borderColor: rgb(0, 0, 0), borderWidth: 2 });
  page.drawRectangle({ x: x + w - mSize - 2 + (mSize - innerSize) / 2, y: y + h - mSize - 2 + (mSize - innerSize) / 2, width: innerSize, height: innerSize, color: rgb(0, 0, 0) });

  // Canto inferior esquerdo
  page.drawRectangle({ x: x + 2, y: y + 2, width: mSize, height: mSize, borderColor: rgb(0, 0, 0), borderWidth: 2 });
  page.drawRectangle({ x: x + 2 + (mSize - innerSize) / 2, y: y + 2 + (mSize - innerSize) / 2, width: innerSize, height: innerSize, color: rgb(0, 0, 0) });
}

export function downloadPdfBlob(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
