import { API_BASE_URL } from '@/config/api';

/**
 * Format currency to Vietnamese format
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('vi-VN', { maximumFractionDigits: 0 });
}

/**
 * Format price with currency symbol
 */
export function formatPrice(value: number | null | undefined): string {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat('vi-VN').format(num);
}

/**
 * Build full image URL from relative path
 */
export function buildImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;

  // Already a full URL
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Format date time to Vietnamese format
 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return value;
  }
}

/**
 * Format date time to Vietnamese format with seconds
 * Format: HH:mm:ss DD/MM/YYYY
 */
export function formatDateTimeWithSeconds(value: string | null | undefined): string {
  if (!value || value.trim() === '') return '';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    // Format: HH:mm:ss DD/MM/YYYY
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
  } catch {
    return value;
  }
}

/**
 * Parse money string to number
 */
export function parseMoney(input: string): number {
  // Delegate to parseNumber which handles both VN and international formats
  if (input === null || input === undefined) return 0;
  return parseNumber(String(input));
}

/**
 * Parse number from string
 * Handles Vietnamese format: "21.990.000" (dot as thousand separator)
 * Also handles: "21,990,000" (comma as thousand separator)
 * And: "21990000" (no separator)
 */
export function parseNumber(input: string | number | null | undefined): number {
  if (typeof input === 'number') return input;
  if (!input) return 0;

  // Convert to string and remove all non-digit characters except dots and commas
  let cleaned = String(input).replace(/[^\d,.-]/g, '');

  // Vietnamese format: dots are thousand separators, not decimal points
  // Check if it's Vietnamese format (has dots but no comma before the last 3 digits)
  // Pattern: "21.990.000" or "1.234.567"
  if (cleaned.includes('.') && !cleaned.includes(',')) {
    // Remove all dots (they are thousand separators in VN format)
    cleaned = cleaned.replace(/\./g, '');
  } else if (cleaned.includes(',')) {
    // If has comma, it might be decimal separator or thousand separator
    // Check if comma is followed by exactly 3 digits (thousand separator)
    // Otherwise treat as decimal separator
    const lastCommaIndex = cleaned.lastIndexOf(',');
    const afterComma = cleaned.substring(lastCommaIndex + 1);

    if (afterComma.length === 3 && cleaned.split(',').length > 1) {
      // Likely thousand separator (e.g., "1,234,567")
      cleaned = cleaned.replace(/,/g, '');
    } else {
      // Likely decimal separator (e.g., "123,45")
      cleaned = cleaned.replace(/,/g, '.');
    }
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Normalize text for comparison (lowercase, remove diacritics, trim spaces)
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return '';

  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

/**
 * Normalize product code for comparison
 * Removes all whitespace but keeps all other characters (including special chars)
 * This is important because product codes like "SPDT002" should match "SPDT 002"
 */
export function normalizeProductCode(code: string | null | undefined): string {
  if (!code) return '';

  return code
    .trim()
    .replace(/\s+/g, '') // Remove all whitespace
    .toUpperCase(); // Convert to uppercase for consistency
}

/**
 * Calculate Levenshtein distance between two strings (simple implementation)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity score between two strings (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = normalizeText(str1);
  const normalized2 = normalizeText(str2);

  if (normalized1 === normalized2) return 1.0;

  const maxLen = Math.max(normalized1.length, normalized2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(normalized1, normalized2);
  return 1 - distance / maxLen;
}

/**
 * Interface for product matching
 */
export interface ProductMatchCandidate {
  id: number;
  name: string;
  code: string;
  similarity: number;
}

/**
 * Fuzzy match product by name or code
 * Returns the best match if similarity >= threshold, otherwise null
 */
export function fuzzyMatchProduct(
  searchName: string | null | undefined,
  searchCode: string | null | undefined,
  products: Array<{ id: number; name: string; code?: string | null }>,
  threshold: number = 0.7
): ProductMatchCandidate | null {
  if (!searchName && !searchCode) return null;
  if (products.length === 0) return null;

  let bestMatch: ProductMatchCandidate | null = null;
  let bestScore = 0;

  for (const product of products) {
    let score = 0;

    // Match by name
    if (searchName && product.name) {
      const nameSimilarity = calculateSimilarity(searchName, product.name);
      score = Math.max(score, nameSimilarity * 0.7); // Name match weight: 70%
    }

    // Match by code (higher weight if exact match)
    if (searchCode && product.code) {
      // First try exact match with normalized product codes (no whitespace)
      const normalizedSearchCode = normalizeProductCode(searchCode);
      const normalizedProductCode = normalizeProductCode(product.code);

      if (normalizedSearchCode === normalizedProductCode && normalizedSearchCode.length > 0) {
        score = Math.max(score, 0.95); // Exact normalized code match: 95%
      } else {
        // Try fuzzy match with normalized codes
        const normalizedSearchCodeLower = normalizedSearchCode.toLowerCase();
        const normalizedProductCodeLower = normalizedProductCode.toLowerCase();

        if (normalizedSearchCodeLower === normalizedProductCodeLower && normalizedSearchCodeLower.length > 0) {
          score = Math.max(score, 0.95); // Exact normalized code match (case-insensitive): 95%
        } else {
          // Calculate similarity with normalized codes
          const codeSimilarity = calculateSimilarity(normalizedSearchCodeLower, normalizedProductCodeLower);
          if (codeSimilarity >= 0.8) {
            // High similarity (80%+) gets good score
            score = Math.max(score, codeSimilarity * 0.5); // Code match weight: 50% of similarity
          } else {
            // Lower similarity still gets some weight
            const codeSimilarityOriginal = calculateSimilarity(searchCode, product.code);
            score = Math.max(score, codeSimilarityOriginal * 0.3); // Code match weight: 30%
          }
        }
      }
    }

    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = {
        id: product.id,
        name: product.name,
        code: product.code || '',
        similarity: score,
      };
    }
  }

  return bestMatch;
}

/**
 * Interface for store
 */
export interface Store {
  id: number;
  name: string;
  code?: string | null;
}

/**
 * Resolve storeId from warehouse label (from OCR)
 * Tries multiple matching strategies:
 * 1. Extract code from parentheses: "Kho 1 (KH001)" -> match by code
 * 2. Match by store.code
 * 3. Extract number from "Kho X" and match by store.id or name contains number
 * 4. Match by store.name substring
 */
export function resolveStoreIdFromWarehouseLabel(
  warehouseLabel: string | null | undefined,
  stores: Store[]
): number | null {
  if (!warehouseLabel || stores.length === 0) return null;

  const normalizedLabel = warehouseLabel.toLowerCase().trim();

  // Debug logging (only in development)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('[resolveStoreIdFromWarehouseLabel] Input:', warehouseLabel);
    console.log('[resolveStoreIdFromWarehouseLabel] Normalized:', normalizedLabel);
    console.log('[resolveStoreIdFromWarehouseLabel] Available stores:', stores.map(s => ({ id: s.id, name: s.name, code: s.code })));
  }

  // Strategy 1: Extract code from parentheses (highest priority)
  const codeMatch = warehouseLabel.match(/\(([^)]+)\)/);
  if (codeMatch) {
    const code = codeMatch[1].trim();
    const storeByCode = stores.find(s => s.code && normalizeText(s.code) === normalizeText(code));
    if (storeByCode) {
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('[resolveStoreIdFromWarehouseLabel] Matched by code:', code, '-> Store ID:', storeByCode.id);
      }
      return storeByCode.id;
    }
  }

  // Strategy 2: Match by store.code directly
  for (const store of stores) {
    if (store.code && normalizeText(store.code) === normalizedLabel) {
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('[resolveStoreIdFromWarehouseLabel] Matched by code (direct):', store.code, '-> Store ID:', store.id);
      }
      return store.id;
    }
  }

  // Strategy 3: Extract number from "Kho X" and match by id or name
  const numberMatch = normalizedLabel.match(/kho\s*(\d+)/);
  if (numberMatch) {
    const khoNumber = numberMatch[1];
    // Try match by id
    const storeById = stores.find(s => s.id === Number(khoNumber));
    if (storeById) {
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('[resolveStoreIdFromWarehouseLabel] Matched by ID:', khoNumber, '-> Store ID:', storeById.id);
      }
      return storeById.id;
    }
    // Try match by name contains number
    const storeByName = stores.find(s =>
      normalizeText(s.name).includes(khoNumber) ||
      normalizeText(s.name).includes(`kho ${khoNumber}`)
    );
    if (storeByName) {
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('[resolveStoreIdFromWarehouseLabel] Matched by name (number):', storeByName.name, '-> Store ID:', storeByName.id);
      }
      return storeByName.id;
    }
  }

  // Strategy 4: Improved fuzzy matching by store.name
  // Remove "kho" prefix and normalize both sides for better matching
  const labelWithoutKho = normalizedLabel.replace(/^kho\s*/i, '').trim();

  for (const store of stores) {
    const normalizedStoreName = normalizeText(store.name);
    const storeNameWithoutKho = normalizedStoreName.replace(/^kho\s*/i, '').trim();

    // Check if label contains store name or vice versa
    if (
      normalizedLabel.includes(normalizedStoreName) ||
      normalizedStoreName.includes(normalizedLabel) ||
      labelWithoutKho.includes(storeNameWithoutKho) ||
      storeNameWithoutKho.includes(labelWithoutKho)
    ) {
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('[resolveStoreIdFromWarehouseLabel] Matched by name (fuzzy):', store.name, '-> Store ID:', store.id);
      }
      return store.id;
    }
  }

  // Strategy 5: Match by key location words (Hà Nội, Hồ Chí Minh, HCM, etc.)
  const locationKeywords: { [key: string]: string[] } = {
    'ha noi': ['hà nội', 'ha noi', 'hanoi', 'hn'],
    'ho chi minh': ['hồ chí minh', 'ho chi minh', 'hcm', 'tp hcm', 'thanh pho ho chi minh'],
  };

  for (const [key, variants] of Object.entries(locationKeywords)) {
    const labelHasLocation = variants.some(variant => normalizedLabel.includes(variant));
    if (labelHasLocation) {
      for (const store of stores) {
        const normalizedStoreName = normalizeText(store.name);
        const storeHasLocation = variants.some(variant => normalizedStoreName.includes(variant));
        if (storeHasLocation) {
          if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
            console.log('[resolveStoreIdFromWarehouseLabel] Matched by location keyword:', key, '-> Store ID:', store.id);
          }
          return store.id;
        }
      }
    }
  }

  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.warn('[resolveStoreIdFromWarehouseLabel] No match found for:', warehouseLabel);
  }

  return null;
}
