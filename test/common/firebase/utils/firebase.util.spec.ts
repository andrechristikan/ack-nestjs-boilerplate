import { generateKeyPairSync } from 'crypto';

import { FirebaseUtil } from '@common/firebase/utils/firebase.util';

describe('FirebaseUtil', () => {
    const util = new FirebaseUtil();
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const der = privateKey
        .export({ type: 'pkcs8', format: 'der' })
        .toString('base64');

    describe('normalizePrivateKey', () => {
        it.each([[null], [''], ['   ']])('returns null for %j', raw => {
            expect(util.normalizePrivateKey(raw)).toBeNull();
        });

        it('returns a PEM key unchanged', () => {
            expect(util.normalizePrivateKey(pem)).toBe(pem);
        });

        it('unescapes literal \\n sequences in a PEM key', () => {
            expect(util.normalizePrivateKey(pem.replace(/\n/g, '\\n'))).toBe(
                pem
            );
        });

        it('re-frames a base64 pkcs8 DER key as PEM', () => {
            expect(util.normalizePrivateKey(der)).toBe(pem);
        });

        it('returns null for a key that is neither PEM nor valid DER', () => {
            expect(util.normalizePrivateKey('not-a-key')).toBeNull();
        });
    });
});
