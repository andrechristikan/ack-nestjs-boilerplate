import { generateKeyPairSync } from 'crypto';
import firebaseConfig, {
    normalizeFirebasePrivateKey,
} from '@configs/firebase.config';

const PemHeader = '-----BEGIN PRIVATE KEY-----';
const PemFooter = '-----END PRIVATE KEY-----';

describe('firebase.config', () => {
    let generatedPem: string;
    let bareBody: string;

    beforeAll(() => {
        const { privateKey } = generateKeyPairSync('rsa', {
            modulusLength: 2048,
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
            publicKeyEncoding: { type: 'spki', format: 'pem' },
        });

        generatedPem = privateKey;
        bareBody = generatedPem
            .replace(PemHeader, '')
            .replace(PemFooter, '')
            .replace(/\n/g, '');
    });

    describe('normalizeFirebasePrivateKey', () => {
        it('returns null when the raw key is undefined', () => {
            expect(normalizeFirebasePrivateKey(undefined)).toBeNull();
        });

        it('returns null when the raw key is an empty string', () => {
            expect(normalizeFirebasePrivateKey('')).toBeNull();
        });

        it('returns null when the raw key is only spaces', () => {
            expect(normalizeFirebasePrivateKey('   ')).toBeNull();
        });

        it('returns null when the raw key is only newlines and tabs', () => {
            expect(normalizeFirebasePrivateKey('\n\t  ')).toBeNull();
        });

        it('returns null when the raw key is the literal escape sequence for a lone newline', () => {
            expect(normalizeFirebasePrivateKey('\\n')).toBeNull();
        });

        it('returns an already framed PEM byte-identical when passed verbatim', () => {
            expect(normalizeFirebasePrivateKey(generatedPem)).toBe(
                generatedPem
            );
        });

        it('unescapes the literal escape sequences of an already framed PEM back to the original PEM', () => {
            const escapedPem: string = generatedPem.replace(/\n/g, '\\n');

            expect(normalizeFirebasePrivateKey(escapedPem)).toBe(generatedPem);
        });

        it('frames a bare base64 body wrapped at 64 characters per line with a trailing newline', () => {
            const body: string = 'A'.repeat(150);
            const firstLine: string = 'A'.repeat(64);
            const secondLine: string = 'A'.repeat(64);
            const thirdLine: string = 'A'.repeat(22);
            const expected: string = `${PemHeader}\n${firstLine}\n${secondLine}\n${thirdLine}\n${PemFooter}\n`;

            const result = normalizeFirebasePrivateKey(body);

            expect(result).toBe(expected);

            const bodyLines: string[] = result!.split('\n').slice(1, -2);
            expect(bodyLines).toHaveLength(3);
            expect(bodyLines[0]).toHaveLength(64);
            expect(bodyLines[1]).toHaveLength(64);
            expect(bodyLines[2]).toHaveLength(22);
        });

        it('strips surrounding and embedded whitespace from a bare base64 body before framing', () => {
            const segment: string = 'A'.repeat(4);

            expect(
                normalizeFirebasePrivateKey(
                    `  ${segment}\n${segment}  `
                )
            ).toBe(`${PemHeader}\n${segment}${segment}\n${PemFooter}\n`);
        });

        it('rebuilds the exact original PEM from its bare single-line base64 body', () => {
            expect(normalizeFirebasePrivateKey(bareBody)).toBe(generatedPem);
        });
    });

    describe('factory', () => {
        const originalEnv: NodeJS.ProcessEnv = { ...process.env };

        beforeEach(() => {
            process.env = { ...originalEnv };
        });

        afterEach(() => {
            process.env = { ...originalEnv };
        });

        it('normalizes FIREBASE_PRIVATE_KEY from a bare base64 body into the full PEM', () => {
            process.env.FIREBASE_PRIVATE_KEY = bareBody;

            expect(firebaseConfig().privateKey).toBe(generatedPem);
        });

        it('returns a null privateKey when FIREBASE_PRIVATE_KEY is unset', () => {
            delete process.env.FIREBASE_PRIVATE_KEY;

            expect(firebaseConfig().privateKey).toBeNull();
        });

        it('reads projectId and clientEmail from the environment when they are set', () => {
            process.env.FIREBASE_PROJECT_ID = 'project-1';
            process.env.FIREBASE_CLIENT_EMAIL = 'service@project-1.test';

            expect(firebaseConfig()).toMatchObject({
                projectId: 'project-1',
                clientEmail: 'service@project-1.test',
            });
        });

        it('returns null projectId and clientEmail when they are unset', () => {
            delete process.env.FIREBASE_PROJECT_ID;
            delete process.env.FIREBASE_CLIENT_EMAIL;

            expect(firebaseConfig()).toMatchObject({
                projectId: null,
                clientEmail: null,
            });
        });
    });
});
