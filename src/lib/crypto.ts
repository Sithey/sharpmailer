import crypto from "crypto";

// Configuration
const algorithm: string = "aes-256-cbc";
const ivLength: number = 16; // 16 octets pour AES

// Récupération de la clé secrète depuis les variables d'environnement
if (!process.env.SECRET_KEY) {
  throw new Error("La variable d'environnement SECRET_KEY n'est pas définie.");
}
const secretKey: string = process.env.SECRET_KEY; // Doit être une chaîne hexadécimale de 64 caractères (32 octets)

/**
 * Chiffre le texte en clair.
 * @param text - Le texte à chiffrer.
 * @returns Le texte chiffré sous la forme "iv:encrypted".
 */
export function encrypt(text: string): string {
  const iv: Buffer = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey, "hex"), iv);
  let encrypted: string = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  // Concaténation de l'IV et du texte chiffré pour pouvoir déchiffrer par la suite
  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Déchiffre un texte chiffré.
 * @param encryptedText - Le texte chiffré au format "iv:encrypted".
 * @returns Le texte en clair.
 */
export function decrypt(encryptedText: string): string {
  const parts: string[] = encryptedText.split(":");
  if (parts.length !== 2) {
    throw new Error("Le format du texte chiffré est invalide.");
  }
  const [ivHex, encrypted] = parts;
  const iv: Buffer = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey, "hex"), iv);
  let decrypted: string = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
