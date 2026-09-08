import { IHelperEncryptionService } from '@common/helper/interfaces/helper.encryption.service.interface';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AES, SHA256, enc, lib, mode, pad } from 'crypto-js';

@Injectable()
export class HelperEncryptionService implements IHelperEncryptionService {
    private readonly encryptionSecretKey: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService
    ) {
        this.encryptionSecretKey = this.configService.get<string>(
            'app.encryptionSecretKey'
        )!;
    }

    private parseAesIv(iv: string): lib.WordArray {
        if (!iv) {
            throw new Error('AES IV parsing failed: missing IV value');
        } else if (iv.startsWith('hex:')) {
            const stringIv = iv.slice(4);
            if (!stringIv) {
                throw new Error('AES IV parsing failed: missing IV value');
            }

            return enc.Hex.parse(stringIv);
        } else if (iv.startsWith('b64:')) {
            const stringIv = iv.slice(4);
            if (!stringIv) {
                throw new Error('AES IV parsing failed: missing IV value');
            }

            return enc.Base64.parse(stringIv);
        }

        return enc.Utf8.parse(iv);
    }

    base64Encrypt(data: string): string {
        const buff: Buffer = Buffer.from(data, 'utf8');
        return buff.toString('base64');
    }

    base64Decrypt(data: string): string {
        const buff: Buffer = Buffer.from(data, 'base64');
        return buff.toString('utf8');
    }

    base64Compare(basicToken1: string, basicToken2: string): boolean {
        return basicToken1 === basicToken2;
    }

    aes256Encrypt<T>(data: T, key: string, iv: string): string {
        const cIv = this.parseAesIv(iv);
        const cKey = SHA256(key);
        const cipher = AES.encrypt(JSON.stringify(data), cKey, {
            mode: mode.CBC,
            padding: pad.Pkcs7,
            iv: cIv,
        });

        return cipher.toString();
    }

    aes256EncryptSimple(data: string, extendEncryptionKey?: string): string {
        const randomIv = this.helperStringService.random(16);
        const encryptionKey = extendEncryptionKey
            ? `${this.encryptionSecretKey}:${extendEncryptionKey}`
            : this.encryptionSecretKey;
        const encrypted = this.aes256Encrypt(data, encryptionKey, randomIv);

        return `${randomIv}:${encrypted}`;
    }

    aes256Decrypt<T>(encrypted: string, key: string, iv: string): T {
        const cIv = this.parseAesIv(iv);
        const cKey = SHA256(key);

        const decrypted = AES.decrypt(encrypted, cKey, {
            mode: mode.CBC,
            padding: pad.Pkcs7,
            iv: cIv,
        }).toString(enc.Utf8);

        if (!decrypted) {
            throw new Error('AES-256-CBC decryption failed');
        }

        return JSON.parse(decrypted);
    }

    aes256DecryptSimple(
        encryptedData: string,
        extendEncryptionKey?: string
    ): string {
        const [iv, encrypted] = encryptedData.split(':');
        if (!iv || !encrypted) {
            throw new Error('Invalid encrypted data format');
        }

        const encryptionKey = extendEncryptionKey
            ? `${this.encryptionSecretKey}:${extendEncryptionKey}`
            : this.encryptionSecretKey;
        return this.aes256Decrypt(encrypted, encryptionKey, iv);
    }

    aes256Compare(aes1: string, aes2: string): boolean {
        return aes1 === aes2;
    }
}
