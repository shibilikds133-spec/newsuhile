/**
 * Hashes a string using SHA-256
 * @param {string} text 
 * @returns {Promise<string>} Hex representation of the hash
 */
export async function hashPassword(text) {
  if (!text) return '';
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
