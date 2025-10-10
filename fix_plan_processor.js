import fs from 'fs';

// Read the file
const content = fs.readFileSync('core/plan/PlanProcessor.js', 'utf8');

// Replace the function with the corrected version
const correctedContent = content.replace(
  /async _parseDocumentInput\(document, format\) \{\s*\n(\s*let content, detectedFormat = format;\s*\n\s*if \(typeof document === 'string'\) \{\s*\n\s*const filePathPatterns = \[\/\^\\\.\\\/,\/\^\\\.\\\.\.\\\/,\/\^[a-zA-Z]:,\/\^\\\/,\/\\\/\];\s*\n\s*const looksLikeFilePath = filePathPatterns\.some\(pattern => pattern\.test\(document\)\) &&\s*\n\s*document\.includes\('\.'\) && document\.length > 2;\s*\n\s*if \(looksLikeFilePath\) \{\s*\n\s*const extension = document\.substring\(document\.lastIndexOf\('\.'\)\)\.toLowerCase\(\);\s*\n\s*detectedFormat = detectedFormat \|\| this\.supportedFormats\[extension\];\s*\n\s*content = await this\._readDocumentFromFile\(document\);\s*\n\s*\} else \{\s*\n\s*content = document;\s*\n\s*detectedFormat = detectedFormat \|\| 'text';\s*\n\s*\}\s*\n\s*\} else \{\s*\n\s*content = JSON\.stringify\(document\);\s*\n\s*detectedFormat = detectedFormat \|\| 'json';\s*\n\s*\}\s*\n\s*return \{ content, detectedFormat \};\s*\n\s*\}/g,
  `async _parseDocumentInput(document, format) {
    let content, detectedFormat = format;

    if (typeof document === 'string') {
      // Check if this looks like a file path by checking for common patterns
      // but avoid false positives for actual content by checking for newlines first
      const filePathPatterns = [/^\\.\\//, /^\\.\\.\\//, /^[a-zA-Z]:/, /^\\//];
      const hasFilePathPattern = filePathPatterns.some(pattern => pattern.test(document));
      const hasFileExtension = /\\.[a-zA-Z0-9]+/.test(document);
      const looksLikeFilePath = hasFilePathPattern && hasFileExtension && document.length > 2;
      
      // Additional check: if content contains newlines or markdown-like structures, it's likely content
      const likelyContent = document.includes('\\n') || document.includes('# ') || document.includes('- ') || 
                           document.includes('* ') || document.startsWith('{') || document.startsWith('[');

      if (looksLikeFilePath && !likelyContent) {  // Only treat as file path if not likely content
        const extension = document.substring(document.lastIndexOf('.')).toLowerCase();
        detectedFormat = detectedFormat || this.supportedFormats[extension];
        content = await this._readDocumentFromFile(document);
      } else {
        content = document;
        detectedFormat = detectedFormat || 'text';
      }
    } else {
      content = JSON.stringify(document);
      detectedFormat = detectedFormat || 'json';
    }

    return { content, detectedFormat };
  }`
);

// Write the corrected content back
fs.writeFileSync('core/plan/PlanProcessor.js', correctedContent);
console.log('PlanProcessor.js has been updated successfully!');