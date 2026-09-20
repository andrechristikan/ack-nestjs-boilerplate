import {
    HelperEncryptionAlgorithm,
    HelperEncryptionAuthTagLengthInBytes,
    HelperEncryptionIvLengthInBytes,
    HelperEncryptionKeyDigest,
    HelperEncryptionKeyLengthInBytes,
    HelperEncryptionPayloadSeparator,
    HelperEncryptionSaltLengthInBytes,
    HelperEncryptionSecretLengthInBytes,
} from '@common/helper/constants/helper.constant';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { HelperEncryptionSecretInvalidException } from '@common/helper/exceptions/helper.encryption-secret-invalid.exception';
import { Injectable } from '@nestjs/common';
import {
    createCipheriv,
    createDecipheriv,
    hkdfSync,
    randomBytes,
} from 'node:crypto';

/**
 * AES-256-GCM with a key derived by HKDF-SHA-256 from a base64url-encoded 48-byte secret, a random per-payload salt and the purpose, and the context bound as authenticated data.
 */
@Injectable()
export class HelperEncryptionService {
    private decodeSecret(secret: string): Buffer {
        const decoded = Buffer.from(secret, 'base64url');
        if (
            decoded.toString('base64url') !== secret ||
            decoded.length !== HelperEncryptionSecretLengthInBytes
        ) {
            throw new HelperEncryptionSecretInvalidException();
        }

        return decoded;
    }

    private deriveKey(secret: Buffer, salt: Buffer, purpose: string): Buffer {
        return Buffer.from(
            hkdfSync(
                HelperEncryptionKeyDigest,
                secret,
                salt,
                purpose,
                HelperEncryptionKeyLengthInBytes
            )
        );
    }

    private decodePart(part: string): Buffer | null {
        const decoded = Buffer.from(part, 'base64url');

        return decoded.toString('base64url') === part ? decoded : null;
    }

    aes256Encrypt(
        plaintext: string,
        secret: string,
        purpose: string,
        context: string
    ): string {
        const secretKey = this.decodeSecret(secret);

        const salt = randomBytes(HelperEncryptionSaltLengthInBytes);
        const iv = randomBytes(HelperEncryptionIvLengthInBytes);
        const derivedKey = this.deriveKey(secretKey, salt, purpose);
        const cipher = createCipheriv(
            HelperEncryptionAlgorithm,
            derivedKey,
            iv,
            { authTagLength: HelperEncryptionAuthTagLengthInBytes }
        );
        cipher.setAAD(Buffer.from(context, 'utf8'));
        const ciphertext = Buffer.concat([
            cipher.update(plaintext, 'utf8'),
            cipher.final(),
        ]);
        const authTag = cipher.getAuthTag();

        return [
            salt.toString('base64url'),
            iv.toString('base64url'),
            ciphertext.toString('base64url'),
            authTag.toString('base64url'),
        ].join(HelperEncryptionPayloadSeparator);
    }

    aes256Decrypt(
        payload: string,
        secret: string,
        purpose: string,
        context: string
    ): string {
        const secretKey = this.decodeSecret(secret);

        const parts = payload.split(HelperEncryptionPayloadSeparator);
        if (parts.length !== 4) {
            throw new HelperDecryptFailedException();
        }

        const [saltPart, ivPart, ciphertextPart, authTagPart] = parts;
        const salt = this.decodePart(saltPart);
        const iv = this.decodePart(ivPart);
        const ciphertext = this.decodePart(ciphertextPart);
        const authTag = this.decodePart(authTagPart);
        if (
            !salt ||
            !iv ||
            !ciphertext ||
            !authTag ||
            salt.length !== HelperEncryptionSaltLengthInBytes ||
            iv.length !== HelperEncryptionIvLengthInBytes ||
            authTag.length !== HelperEncryptionAuthTagLengthInBytes
        ) {
            throw new HelperDecryptFailedException();
        }

        try {
            const derivedKey = this.deriveKey(secretKey, salt, purpose);
            const decipher = createDecipheriv(
                HelperEncryptionAlgorithm,
                derivedKey,
                iv,
                { authTagLength: HelperEncryptionAuthTagLengthInBytes }
            );
            decipher.setAAD(Buffer.from(context, 'utf8'));
            decipher.setAuthTag(authTag);

            return Buffer.concat([
                decipher.update(ciphertext),
                decipher.final(),
            ]).toString('utf8');
        } catch (error: unknown) {
            throw new HelperDecryptFailedException(error);
        }
    }
}
