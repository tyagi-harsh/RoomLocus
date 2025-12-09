import forge from 'node-forge';

/**
 * Encrypts the provided plaintext using RSA-OAEP with SHA-256 digest and MGF1(SHA-1).
 * This mirrors the backend's `Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding")`
 * configuration where MGF1 defaults to SHA-1.
 */
export function encryptWithBackendRsa(publicKeyPem: string, plaintext: string): string {
  if (!publicKeyPem) {
    throw new Error('Public key is required for encryption.');
  }
  if (typeof plaintext !== 'string') {
    throw new Error('Plaintext password must be a string.');
  }

  const normalizedPem = normalizePem(publicKeyPem);
  const publicKey = forge.pki.publicKeyFromPem(normalizedPem);

  const encryptedBytes = publicKey.encrypt(plaintext, 'RSA-OAEP', {
    md: forge.md.sha256.create(),
    mgf1: { md: forge.md.sha1.create() },
  });

  return forge.util.encode64(encryptedBytes);
}

function normalizePem(pem: string): string {
  const trimmed = pem.trim();
  if (trimmed.includes('BEGIN PUBLIC KEY')) {
    return trimmed;
  }
  const cleaned = trimmed.replace(/\s+/g, '');
  return `-----BEGIN PUBLIC KEY-----\n${cleaned}\n-----END PUBLIC KEY-----`;
}

