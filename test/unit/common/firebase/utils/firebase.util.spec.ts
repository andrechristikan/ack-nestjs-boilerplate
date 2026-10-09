import { createPrivateKey, generateKeyPairSync } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { FirebaseUtil } from '@common/firebase/utils/firebase.util';

describe('FirebaseUtil', () => {
    let util: FirebaseUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [FirebaseUtil],
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

        it('decodes a base64-encoded DER key into PEM', () => {
            const { privateKey } = generateKeyPairSync('rsa', {
                modulusLength: 2048,
            });
            const der = privateKey.export({ type: 'pkcs8', format: 'der' });

            const result = util.normalizePrivateKey(der.toString('base64'));

            expect(result).toEqual(expect.stringContaining('-----BEGIN'));
            expect(() =>
                createPrivateKey({ key: result!, format: 'pem' })
            ).not.toThrow();
        });

        it('returns null when the raw key is neither PEM-framed nor a valid DER key', () => {
            const result = util.normalizePrivateKey('not-a-valid-key');

            expect(result).toBeNull();
        });
    });
});
