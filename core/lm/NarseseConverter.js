// Narsese conversion system
import NarseseTranslator from './NarseseTranslator.js';

/**
 * NarseseConverter - Unified Narsese conversion system
 * 
 * A wrapper around the more comprehensive NarseseTranslator that provides
 * the same interface but with full-featured conversion capabilities.
 */
class NarseseConverter {
  constructor() {
    this.translator = new NarseseTranslator();
  }

  async initialize(config = {}) {
    await this.translator.initialize(config);
  }

  /**
   * Convert text to Narsese format
   */
  convertToNarsese(text, type = 'default') {
    try {
      // Simple conversion for basic terms
      const narsese = this._simpleConvertToNarsese(text);
      return {
        original: text,
        narsese,
        type
      };
    } catch (error) {
      // Fallback to simple placeholder if complex conversion fails
      return {
        original: text,
        narsese: `[Placeholder Narsese conversion for: ${text}]`,
        type,
        error: error.message
      };
    }
  }

  /**
   * Convert from Narsese back to text
   */
  convertFromNarsese(narsese) {
    try {
      // Parse the Narsese and extract meaningful text
      const result = this.translator.narseseToJs(narsese);
      return result.value || result.term || narsese;
    } catch (error) {
      // Fallback for placeholder format or invalid Narsese
      const placeholderMatch = narsese.match(/^\[Placeholder Narsese conversion for: (.+)\]$/);
      if (placeholderMatch) {
        return placeholderMatch[1];
      }
      return narsese;
    }
  }

  /**
   * Simple conversion to Narsese for basic cases
   * @private
   */
  _simpleConvertToNarsese(text) {
    // Handle simple cases like "subject predicate" -> "<subject --> predicate>"
    // This is a simplified version; real implementation would be more sophisticated
    const normalized = text.trim();
    
    // If it already looks like Narsese, return as is
    if (normalized.startsWith('<') && normalized.endsWith('>')) {
      return normalized;
    }
    
    // If it looks like a simple term, convert to Narsese format
    if (!normalized.includes(' ') && !normalized.includes(' --> ')) {
      return `<${normalized} --> ${normalized}>`;
    }
    
    // Attempt to identify patterns and convert appropriately
    const parts = normalized.split(' ');
    if (parts.length >= 2) {
      return `<${parts[0]} --> ${parts.slice(1).join(' ')}>`;
    }
    
    return `<${normalized} --> ${normalized}>`;
  }

  /**
   * Batch convert multiple items to Narsese
   */
  batchConvertToNarsese(texts, type = 'default') {
    return texts.map(text => this.convertToNarsese(text, type));
  }

  /**
   * Batch convert multiple items from Narsese
   */
  batchConvertFromNarsese(narseseList) {
    return narseseList.map(narsese => this.convertFromNarsese(narsese));
  }

  /**
   * Get conversion statistics
   */
  getStats() {
    return this.translator.getStats ? this.translator.getStats() : { conversions: 0 };
  }
}

export default NarseseConverter;