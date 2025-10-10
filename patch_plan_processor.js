import fs from 'fs';

const filePath = 'core/plan/PlanProcessor.js';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the problematic line - remove the fifth pattern which is just /\/
content = content.replace(
    "const filePathPatterns = [/^\\.\\//, /^\\.\\.\\//, /^[a-zA-Z]:/, /^\\//, /\\//];",
    "const filePathPatterns = [/^\\.\\//, /^\\.\\.\\//, /^[a-zA-Z]:/, /^\\//];"
);

// Add additional check to avoid treating content as filenames
content = content.replace(
    `const looksLikeFilePath = filePathPatterns.some(pattern => pattern.test(document)) &&
                               document.includes('.') && document.length > 2;

      if (looksLikeFilePath) {`,
    `const hasFilePathPattern = filePathPatterns.some(pattern => pattern.test(document));
      const hasFileExtension = /\\.[a-zA-Z0-9]+/.test(document);
      const looksLikeFilePath = hasFilePathPattern && hasFileExtension && document.length > 2;
      
      // Additional check: if content contains newlines or markdown-like structures, it's likely content
      const likelyContent = document.includes('\\n') || document.includes('# ') || document.includes('- ') || 
                           document.includes('* ') || document.startsWith('{') || document.startsWith('[');

      if (looksLikeFilePath && !likelyContent) {  // Only treat as file path if not likely content`
);

fs.writeFileSync(filePath, content);
console.log('PlanProcessor.js updated successfully!');