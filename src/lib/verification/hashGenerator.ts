/**
 * Hash Generator Service
 * Generates SHA-256 hashes for clinical review data to cryptographically link
 * payments to medical results without exposing payer identity
 */

export interface ClinicalReviewHashData {
  screeningId: string;
  reviewId: string;
  finalDiagnosis: string | null;
  recommendations: string | null;
  socialScoreClinical: number | null;
  fineMotorClinical: number | null;
  languageClinical: number | null;
  grossMotorClinical: number | null;
  reviewedAt: string;
}

/**
 * Generate SHA-256 hash of clinical review data
 * This creates a cryptographic link between payment and medical result
 * 
 * @param data - Clinical review data to hash
 * @returns SHA-256 hash as hexadecimal string
 */
export async function generateClinicalReviewHash(
  data: ClinicalReviewHashData
): Promise<string> {
  // Create a deterministic string representation of the review data
  const hashString = JSON.stringify({
    screeningId: data.screeningId,
    reviewId: data.reviewId,
    finalDiagnosis: data.finalDiagnosis || '',
    recommendations: data.recommendations || '',
    socialScore: data.socialScoreClinical ?? 0,
    fineMotorScore: data.fineMotorClinical ?? 0,
    languageScore: data.languageClinical ?? 0,
    grossMotorScore: data.grossMotorClinical ?? 0,
    reviewedAt: data.reviewedAt,
  });

  // Generate SHA-256 hash
  if (typeof window !== 'undefined') {
    // Browser environment - use Web Crypto API
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(hashString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Node.js environment - use crypto module
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(hashString).digest('hex');
  }
}

/**
 * Verify hash matches clinical review data
 * 
 * @param data - Clinical review data
 * @param hash - Hash to verify against
 * @returns True if hash matches, false otherwise
 */
export async function verifyClinicalReviewHash(
  data: ClinicalReviewHashData,
  hash: string
): Promise<boolean> {
  const generatedHash = await generateClinicalReviewHash(data);
  return generatedHash === hash;
}

