export interface IHelperEncryptionService {
    base64Encrypt(data: string): string;
    base64Decrypt(data: string): string;
    base64Compare(basicToken1: string, basicToken2: string): boolean;
    aes256Encrypt<T>(data: T, key: string, iv: string): string;
    aes256EncryptSimple(data: string, extendEncryptionKey?: string): string;
    aes256Decrypt<T>(encrypted: string, key: string, iv: string): T;
    aes256DecryptSimple(
        encryptedData: string,
        extendEncryptionKey?: string
    ): string;
    aes256Compare(aes1: string, aes2: string): boolean;
}
