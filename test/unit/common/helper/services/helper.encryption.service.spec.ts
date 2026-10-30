import { EnumHelperPemLabel } from '@common/helper/enums/helper.enum';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { EnumHelperStatusCodeError } from '@common/helper/enums/helper.status-code.enum';
import {
    HelperEncryptionAuthTagLengthInBytes,
    HelperEncryptionIvLengthInBytes,
    HelperEncryptionKeyLengthInBytes,
    HelperEncryptionPayloadSeparator,
    HelperEncryptionSaltLengthInBytes,
} from '@common/helper/constants/helper.constant';

describe('HelperEncryptionService', () => {
    const secret = randomBytes(48).toString('base64url');
    const purpose = 'purpose';
    const context = 'context';
    const nonCanonicalPart = 'Jso4k2fExXWPm5WuLi61EY5-5kh4QtmViKuPKN-ckRbr_B';

    let service: HelperEncryptionService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [HelperEncryptionService],
        }).compile();

        service = module.get(HelperEncryptionService);
    });

    describe('aes256Encrypt', () => {
        it('produces a 4-part base64url payload that decrypts back to the plaintext', () => {
            const payload = service.aes256Encrypt(
                'secret message',
                secret,
                purpose,
                context
            );

            expect(
                payload.split(HelperEncryptionPayloadSeparator)
            ).toHaveLength(4);
            expect(
                service.aes256Decrypt(payload, secret, purpose, context)
            ).toBe('secret message');
        });

        it('throws when the secret is invalid', () => {
            let error: unknown;
            try {
                service.aes256Encrypt(
                    'secret message',
                    'not-a-valid-secret',
                    purpose,
                    context
                );
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'helper',
                statusCode: EnumHelperStatusCodeError.encryptionSecretInvalid,
                statusCodeKey:
                    EnumHelperStatusCodeError[
                        EnumHelperStatusCodeError.encryptionSecretInvalid
                    ],
                messagePath: 'helper.error.encryptionSecretInvalid',
            });
        });
    });

    describe('aes256Decrypt', () => {
        it('throws when the payload does not carry exactly 4 parts', () => {
            let error: unknown;
            try {
                service.aes256Decrypt('a.b.c', secret, purpose, context);
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'helper',
                statusCode: EnumHelperStatusCodeError.decryptFailed,
                statusCodeKey:
                    EnumHelperStatusCodeError[
                        EnumHelperStatusCodeError.decryptFailed
                    ],
                messagePath: 'helper.error.decryptFailed',
            });
        });

        it('throws when the salt segment is not canonical base64url', () => {
            const payload = service.aes256Encrypt(
                'm',
                secret,
                purpose,
                context
            );
            const [, ivPart, ciphertextPart, authTagPart] = payload.split(
                HelperEncryptionPayloadSeparator
            );
            const tampered = [
                nonCanonicalPart,
                ivPart,
                ciphertextPart,
                authTagPart,
            ].join(HelperEncryptionPayloadSeparator);

            let error: unknown;
            try {
                service.aes256Decrypt(tampered, secret, purpose, context);
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'helper',
                statusCode: EnumHelperStatusCodeError.decryptFailed,
                statusCodeKey:
                    EnumHelperStatusCodeError[
                        EnumHelperStatusCodeError.decryptFailed
                    ],
                messagePath: 'helper.error.decryptFailed',
            });
        });

        it('throws when the iv segment is not canonical base64url', () => {
            const payload = service.aes256Encrypt(
                'm',
                secret,
                purpose,
                context
            );
            const [saltPart, , ciphertextPart, authTagPart] = payload.split(
                HelperEncryptionPayloadSeparator
            );
            const tampered = [
                saltPart,
                nonCanonicalPart,
                ciphertextPart,
                authTagPart,
            ].join(HelperEncryptionPayloadSeparator);

            let error: unknown;
            try {
                service.aes256Decrypt(tampered, secret, purpose, context);
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'helper',
                statusCode: EnumHelperStatusCodeError.decryptFailed,
                statusCodeKey:
                    EnumHelperStatusCodeError[
                        EnumHelperStatusCodeError.decryptFailed
                    ],
                messagePath: 'helper.error.decryptFailed',
            });
        });

        it('throws when the ciphertext segment is not canonical base64url', () => {
            const payload = service.aes256Encrypt(
                'm',
                secret,
                purpose,
                context
            );
            const [saltPart, ivPart, , authTagPart] = payload.split(
                HelperEncryptionPayloadSeparator
            );
            const tampered = [
                saltPart,
                ivPart,
                nonCanonicalPart,
                authTagPart,
            ].join(HelperEncryptionPayloadSeparator);

            let error: unknown;
            try {
                service.aes256Decrypt(tampered, secret, purpose, context);
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'helper',
                statusCode: EnumHelperStatusCodeError.decryptFailed,
                statusCodeKey:
                    EnumHelperStatusCodeError[
                        EnumHelperStatusCodeError.decryptFailed
                    ],
                messagePath: 'helper.error.decryptFailed',
            });
        });

        it('throws when the auth tag segment is not canonical base64url', () => {
            const payload = service.aes256Encrypt(
                'm',
                secret,
                purpose,
                context
            );
            const [saltPart, ivPart, ciphertextPart] = payload.split(
                HelperEncryptionPayloadSeparator
            );
            const tampered = [
                saltPart,
                ivPart,
                ciphertextPart,
                nonCanonicalPart,
            ].join(HelperEncryptionPayloadSeparator);

            let error: unknown;
            try {
                service.aes256Decrypt(tampered, secret, purpose, context);
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'helper',
                statusCode: EnumHelperStatusCodeError.decryptFailed,
                statusCodeKey:
                    EnumHelperStatusCodeError[
                        EnumHelperStatusCodeError.decryptFailed
                    ],
                messagePath: 'helper.error.decryptFailed',
            });
        });

        it('throws when the salt segment decodes to the wrong length', () => {
            const payload = service.aes256Encrypt(
                'm',
                secret,
                purpose,
                context
            );
            const [, ivPart, ciphertextPart, authTagPart] = payload.split(
                HelperEncryptionPayloadSeparator
            );
            const wrongSalt = randomBytes(
                HelperEncryptionSaltLengthInBytes - 1
            ).toString('base64url');
            const tampered = [
                wrongSalt,
                ivPart,
                ciphertextPart,
                authTagPart,
            ].join(HelperEncryptionPayloadSeparator);

            let error: unknown;
            try {
                service.aes256Decrypt(tampered, secret, purpose, context);
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'helper',
                statusCode: EnumHelperStatusCodeError.decryptFailed,
                statusCodeKey:
                    EnumHelperStatusCodeError[
                        EnumHelperStatusCodeError.decryptFailed
                    ],
                messagePath: 'helper.error.decryptFailed',
            });
        });

        it('throws when the iv segment decodes to the wrong length', () => {
            const payload = service.aes256Encrypt(
                'm',
                secret,
                purpose,
                context
            );
            const [saltPart, , ciphertextPart, authTagPart] = payload.split(
                HelperEncryptionPayloadSeparator
            );
            const wrongIv = randomBytes(
                HelperEncryptionIvLengthInBytes - 1
            ).toString('base64url');
            const tampered = [
                saltPart,
                wrongIv,
                ciphertextPart,
                authTagPart,
            ].join(HelperEncryptionPayloadSeparator);

            let error: unknown;
            try {
                service.aes256Decrypt(tampered, secret, purpose, context);
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'helper',
                statusCode: EnumHelperStatusCodeError.decryptFailed,
                statusCodeKey:
                    EnumHelperStatusCodeError[
                        EnumHelperStatusCodeError.decryptFailed
                    ],
                messagePath: 'helper.error.decryptFailed',
            });
        });

        it('throws when the auth tag segment decodes to the wrong length', () => {
            const payload = service.aes256Encrypt(
                'm',
                secret,
                purpose,
                context
            );
            const [saltPart, ivPart, ciphertextPart] = payload.split(
                HelperEncryptionPayloadSeparator
            );
            const wrongAuthTag = randomBytes(
                HelperEncryptionAuthTagLengthInBytes - 1
            ).toString('base64url');
            const tampered = [
                saltPart,
                ivPart,
                ciphertextPart,
                wrongAuthTag,
            ].join(HelperEncryptionPayloadSeparator);

            let error: unknown;
            try {
                service.aes256Decrypt(tampered, secret, purpose, context);
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'helper',
                statusCode: EnumHelperStatusCodeError.decryptFailed,
                statusCodeKey:
                    EnumHelperStatusCodeError[
                        EnumHelperStatusCodeError.decryptFailed
                    ],
                messagePath: 'helper.error.decryptFailed',
            });
        });

        it('wraps the caught cause when the auth tag does not verify', () => {
            const payload = service.aes256Encrypt(
                'm',
                secret,
                purpose,
                context
            );
            const [saltPart, ivPart, ciphertextPart, authTagPart] =
                payload.split(HelperEncryptionPayloadSeparator) as [
                    string,
                    string,
                    string,
                    string,
                ];
            const tamperedAuthTag = Buffer.from(authTagPart, 'base64url');
            tamperedAuthTag[0]! ^= 0xff;
            const tampered = [
                saltPart,
                ivPart,
                ciphertextPart,
                tamperedAuthTag.toString('base64url'),
            ].join(HelperEncryptionPayloadSeparator);

            let error: unknown;
            try {
                service.aes256Decrypt(tampered, secret, purpose, context);
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'helper',
                statusCode: EnumHelperStatusCodeError.decryptFailed,
                statusCodeKey:
                    EnumHelperStatusCodeError[
                        EnumHelperStatusCodeError.decryptFailed
                    ],
                messagePath: 'helper.error.decryptFailed',
            });
        });

        it('throws when decrypted under the wrong context', () => {
            const payload = service.aes256Encrypt(
                'm',
                secret,
                purpose,
                context
            );

            let error: unknown;
            try {
                service.aes256Decrypt(
                    payload,
                    secret,
                    purpose,
                    'other-context'
                );
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'helper',
                statusCode: EnumHelperStatusCodeError.decryptFailed,
                statusCodeKey:
                    EnumHelperStatusCodeError[
                        EnumHelperStatusCodeError.decryptFailed
                    ],
                messagePath: 'helper.error.decryptFailed',
            });
        });
    });

    describe('derBase64ToPem', () => {
        const keyPair = generateKeyPairSync('rsa', { modulusLength: 2048 });
        const privatePem = keyPair.privateKey.export({
            type: 'pkcs8',
            format: 'pem',
        }) as string;
        const publicPem = keyPair.publicKey.export({
            type: 'spki',
            format: 'pem',
        }) as string;
        const privateDer = keyPair.privateKey
            .export({ type: 'pkcs8', format: 'der' })
            .toString('base64');
        const publicDer = keyPair.publicKey
            .export({ type: 'spki', format: 'der' })
            .toString('base64');

        it('frames a PKCS#8 DER private key as PEM', () => {
            const result = service.derBase64ToPem(
                privateDer,
                EnumHelperPemLabel.privateKey
            );

            expect(result).toBe(privatePem);
        });

        it('frames an SPKI DER public key as PEM', () => {
            const result = service.derBase64ToPem(
                publicDer,
                EnumHelperPemLabel.publicKey
            );

            expect(result).toBe(publicPem);
        });

        it('throws when the DER bytes are not a key', () => {
            expect(() =>
                service.derBase64ToPem(
                    'bm90LWEta2V5',
                    EnumHelperPemLabel.privateKey
                )
            ).toThrow();
            expect(() =>
                service.derBase64ToPem(
                    'bm90LWEta2V5',
                    EnumHelperPemLabel.publicKey
                )
            ).toThrow();
        });
    });

    describe('decodeSecret', () => {
        it('decodes a canonical base64url secret of the required length', () => {
            const decoded = service['decodeSecret'](secret);

            expect(decoded).toBeInstanceOf(Buffer);
            expect(decoded).toHaveLength(48);
        });

        it('throws when the secret is not canonical base64url', () => {
            let error: unknown;
            try {
                service['decodeSecret'](nonCanonicalPart);
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'helper',
                statusCode: EnumHelperStatusCodeError.encryptionSecretInvalid,
                statusCodeKey:
                    EnumHelperStatusCodeError[
                        EnumHelperStatusCodeError.encryptionSecretInvalid
                    ],
                messagePath: 'helper.error.encryptionSecretInvalid',
            });
        });

        it('throws when the decoded secret is not 48 bytes', () => {
            const wrongLength = randomBytes(32).toString('base64url');

            let error: unknown;
            try {
                service['decodeSecret'](wrongLength);
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({
                module: 'helper',
                statusCode: EnumHelperStatusCodeError.encryptionSecretInvalid,
                statusCodeKey:
                    EnumHelperStatusCodeError[
                        EnumHelperStatusCodeError.encryptionSecretInvalid
                    ],
                messagePath: 'helper.error.encryptionSecretInvalid',
            });
        });
    });

    describe('deriveKey', () => {
        it('derives a key of the configured length', () => {
            const secretKey = service['decodeSecret'](secret);
            const salt = randomBytes(HelperEncryptionSaltLengthInBytes);

            const key = service['deriveKey'](secretKey, salt, purpose);

            expect(key).toBeInstanceOf(Buffer);
            expect(key).toHaveLength(HelperEncryptionKeyLengthInBytes);
        });

        it('derives a different key for a different purpose', () => {
            const secretKey = service['decodeSecret'](secret);
            const salt = randomBytes(HelperEncryptionSaltLengthInBytes);

            const keyOne = service['deriveKey'](secretKey, salt, 'one');
            const keyTwo = service['deriveKey'](secretKey, salt, 'two');

            expect(keyOne.equals(keyTwo)).toBe(false);
        });
    });

    describe('decodePart', () => {
        it('decodes a canonical base64url part', () => {
            const part = Buffer.from('hello').toString('base64url');

            const decoded = service['decodePart'](part);

            expect(decoded).toEqual(Buffer.from('hello'));
        });

        it('returns null for a part that is not canonical base64url', () => {
            const decoded = service['decodePart'](nonCanonicalPart);

            expect(decoded).toBeNull();
        });
    });
});
