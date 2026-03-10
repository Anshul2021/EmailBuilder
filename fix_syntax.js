const fs = require('fs');
let content = fs.readFileSync('src/components/LivePreview.tsx', 'utf8');

// Fix escaped backticks
content = content.split('\\`\\${').join('`${');
content = content.split('}px\\`').join('}px`');

// Fix explicit newline strings
content = content.split('\\n').join('\n');

// Move the undoRedo block AFTER injectIframeStyles and updateResizeHandlePosition
const startIdx = content.indexOf('    const applyHtmlToIframe = useCallback(');
const endIdx = content.indexOf('    // Refs to avoid stale closures');
if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
  const extracted = content.substring(startIdx, endIdx);
  // remove it from the top
  content = content.substring(0, startIdx) + content.substring(endIdx);
  
  const insertIdx = content.indexOf('    // Handle iframe load');
  if (insertIdx !== -1) {
    content = content.substring(0, insertIdx) + extracted + "\n" + content.substring(insertIdx);
  }
}

fs.writeFileSync('src/components/LivePreview.tsx', content);
console.log('Pass 1 done!');
