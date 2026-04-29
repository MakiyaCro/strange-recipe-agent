import PDFDocument from 'pdfkit';
import fs from 'fs';

const GREEN = '#00cc44';
const BLACK = '#000000';
const DIM   = '#336633';
const WHITE = '#e8ffe8';

// Single margin used by all pages — page 1 content Y is manually pushed below the header
const MARGIN   = { top: 50, bottom: 50, left: 72, right: 72 };
const HEADER_H = 78;

export function generatePDF(recipeText, destination) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margins: MARGIN, autoFirstPage: false });

      const isStream = typeof destination !== 'string';
      const output   = isStream ? destination : fs.createWriteStream(destination);

      if (!isStream) {
        output.on('finish', resolve);
        output.on('error', reject);
      } else {
        doc.on('end', resolve);
        doc.on('error', reject);
      }

      doc.pipe(output);

      let pageNum = 0;

      doc.on('pageAdded', () => {
        pageNum++;
        const { width, height } = doc.page;
        const ML = MARGIN.left;
        const MR = MARGIN.right;
        const W  = width - ML - MR;

        // No save/restore — PDFKit's JS color state is NOT restored by Q/q operators,
        // causing invisible (black-on-black) text for any overflow content rendered
        // after the handler. Instead we explicitly reset state at the end.

        doc.rect(0, 0, width, height).fill(BLACK);

        if (pageNum === 1) {
          doc.rect(0, 0, width, HEADER_H).fill('#001800');
          doc
            .font('Courier-Bold').fontSize(16).fillColor(GREEN)
            .text('STRANGE RECIPE GENERATOR', ML, 16, { width: W, align: 'center' });
          doc
            .font('Courier').fontSize(8).fillColor(DIM)
            .text(
              '// FUSION CUISINE AI SYNTHESIS ENGINE — OFFLINE LOCAL BUILD //',
              ML, 40, { width: W, align: 'center' }
            );
          doc
            .moveTo(ML, HEADER_H - 2).lineTo(width - MR, HEADER_H - 2)
            .strokeColor(GREEN).lineWidth(0.5).stroke();
        }

        // Explicitly reset fill/stroke so overflow text from an interrupted text()
        // call renders in the correct colour on the new page.
        doc.fillColor(WHITE).strokeColor(GREEN).lineWidth(1);
      });

      // Add first page — fires pageAdded, draws background + header
      doc.addPage();

      // Push page 1 content cursor below the header (PDFKit set it to MARGIN.top=50)
      doc.y = HEADER_H + 10;

      // ── Render recipe lines ──────────────────────────────────
      const W = doc.page.width - MARGIN.left - MARGIN.right;
      const lines = recipeText.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) {
          doc.moveDown(0.25);
          continue;
        }

        const isMeta     = /^(RECIPE NAME|CUISINE FUSION|SERVES|PREP TIME|COOK TIME)\s*:/i.test(trimmed);
        const isTitle    = /^(INGREDIENTS|INSTRUCTIONS|CHEF'S NOTES)\s*:?\s*$/i.test(trimmed);
        const isBullet   = trimmed.startsWith('-');
        const isNumbered = /^\d+\./.test(trimmed);

        if (isTitle) {
          doc.moveDown(0.5);
          doc
            .font('Courier-Bold').fontSize(11).fillColor(GREEN)
            .text(trimmed, MARGIN.left, doc.y, { width: W });
          const lineY = doc.y + 2;
          doc
            .moveTo(MARGIN.left, lineY).lineTo(MARGIN.left + W, lineY)
            .strokeColor(GREEN).lineWidth(0.4).stroke();
          doc.moveDown(0.3);

        } else if (isMeta) {
          const colon = trimmed.indexOf(':');
          doc
            .font('Courier-Bold').fontSize(10).fillColor(GREEN)
            .text(trimmed.slice(0, colon + 1), MARGIN.left, doc.y, { continued: true, width: W });
          doc
            .font('Courier').fontSize(10).fillColor(WHITE)
            .text(trimmed.slice(colon + 1), { width: W });

        } else if (isBullet || isNumbered) {
          doc
            .font('Courier').fontSize(10).fillColor(WHITE)
            .text(trimmed, MARGIN.left, doc.y, { indent: 14, width: W });

        } else {
          doc
            .font('Courier').fontSize(10).fillColor(WHITE)
            .text(trimmed, MARGIN.left, doc.y, { width: W });
        }
      }

      // ── Footer — flows naturally after content ───────────────
      doc.moveDown(1.5);
      doc
        .font('Courier').fontSize(8).fillColor(DIM)
        .text(
          `Generated ${new Date().toLocaleString()}  |  Strange Recipe Generator v1.0.0  |  LOCAL AI`,
          MARGIN.left, doc.y, { width: W, align: 'center' }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
