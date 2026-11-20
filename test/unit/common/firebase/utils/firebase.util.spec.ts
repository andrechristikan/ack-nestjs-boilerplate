import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { generateKeyPairSync } from 'node:crypto';
import { FirebaseUtil } from '@common/firebase/utils/firebase.util';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';

describe('FirebaseUtil', () => {
    let util: FirebaseUtil;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [FirebaseUtil, HelperEncryptionService],
        }).compile();

        util = module.get(FirebaseUtil);
    });

    describe('normalizePrivateKey', () => {
        it('returns null when the raw key is null', () => {
            expect(util.normalizePrivateKey(null)).toBeNull();
        });

        it('returns null when the raw key is blank after unescaping', () => {
            expect(util.normalizePrivateKey('   ')).toBeNull();
        });

        it('unescapes newlines and returns the key as-is when it already carries the PEM marker', () => {
            const pem =
                '-----BEGIN PRIVATE KEY-----\\nMIIBVQI\\n-----END PRIVATE KEY-----\\n';

            const result = util.normalizePrivateKey(pem);

            expect(result).toBe(pem.replace(/\\n/g, '\n'));
        });

        it('frames a base64-encoded DER key as PEM', () => {
            const { privateKey } = generateKeyPairSync('ed25519');
            const der = privateKey
                .export({ format: 'der', type: 'pkcs8' })
                .toString('base64');

            const result = util.normalizePrivateKey(der);

            expect(result).toBe(
                `-----BEGIN PRIVATE KEY-----\n${der}\n-----END PRIVATE KEY-----\n`
            );
        });

        it('returns null when the bytes are not a private key', () => {
            const result = util.normalizePrivateKey('not-a-valid-key');

            expect(result).toBeNull();
        });
    });
});
