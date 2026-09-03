// test-book-pdf.js — Tests for publication book PDF format and Unicode handling
const fs = require('fs');
const path = require('path');

const appJs = fs.readFileSync(path.join(__dirname, 'static', 'app.js'), 'utf8');

let pass = 0, fail = 0;
function t(name, cond) {
    if (cond) {
        pass++;
    } else {
        fail++;
        console.error('FAIL: ' + name);
    }
}

console.log('=== Running Book PDF & Scanner Upgrade Tests ===');

// 1. Check exportCurrentBookPDF structure in app.js
t('exportCurrentBookPDF is async', appJs.includes('async function exportCurrentBookPDF()'));
t('html2pdf integration present', appJs.includes('window.html2pdf()'));
t('openPrintableBookWindow present', appJs.includes('function openPrintableBookWindow('));
t('page-break-before present for chapters', appJs.includes('page-break-before: always'));
t('Noto Serif Georgian font used', appJs.includes("font-family: 'Noto Serif Georgian'"));
t('Georgian Table of Contents header (სარჩევი)', appJs.includes('სარჩევი'));

// 2. Check scanner.js camera & blur tactics
const scannerJs = fs.readFileSync(path.join(__dirname, 'static', 'scanner.js'), 'utf8');
t('focusMode continuous constraint', scannerJs.includes('focusMode: "continuous"'));
t('ImageCapture takePhoto supported', scannerJs.includes('window.ImageCapture') && scannerJs.includes('ic.takePhoto'));
t('tap-to-focus triggerTapToFocus', scannerJs.includes('triggerTapToFocus') && scannerJs.includes('showFocusIndicator'));
t('super_res unsharp mask variant', scannerJs.includes('variant === "super_res"'));
t('blur-triggered upscaling', scannerJs.includes('isBlurry = page._sharpness < 140'));
t('EXIF orientation handled in blobToBitmap', scannerJs.includes('imageOrientation: "from-image"'));

// 3. Check ocr.ts prompt enhancements
const ocrTs = fs.readFileSync(path.join(__dirname, 'lovable-app', 'src', 'routes', 'api', 'ocr.ts'), 'utf8');
t('Blurry & Degraded Photo Recovery in BASE_RULES', ocrTs.includes('Blurry & Degraded Photo Recovery'));
t('Hyphenated compound words preserved in ocr.ts', ocrTs.includes('preserve legitimate hyphenated compound words'));
t('Georgian visually close letters distinguished', ocrTs.includes('შ vs წ vs ჭ') && ocrTs.includes('ვ vs პ vs კ'));

console.log(`Results: ${pass} passed, ${fail} failed.`);
if (fail > 0) process.exit(1);
