import { registerAs } from '@nestjs/config';

const FirebasePrivateKeyPemMarker = '-----BEGIN';
const FirebasePrivateKeyPemHeader = '-----BEGIN PRIVATE KEY-----';
const FirebasePrivateKeyPemFooter = '-----END PRIVATE KEY-----';
const FirebasePrivateKeyPemLineLength = 64;

export interface IConfigFirebase {
    projectId: string | null;
    clientEmail: string | null;
    privateKey: string | null;
}

export function normalizeFirebasePrivateKey(
    rawKey: string | undefined
): string | null {
    const unescaped = (rawKey ?? '').replace(/\\n/g, '\n');

    if (!unescaped.trim()) {
        return null;
    }

    if (unescaped.includes(FirebasePrivateKeyPemMarker)) {
        return unescaped;
    }

    const body = unescaped.replace(/\s/g, '');
    const lines: string[] = [];

    for (
        let index = 0;
        index < body.length;
        index += FirebasePrivateKeyPemLineLength
    ) {
        lines.push(body.slice(index, index + FirebasePrivateKeyPemLineLength));
    }

    return `${FirebasePrivateKeyPemHeader}\n${lines.join('\n')}\n${FirebasePrivateKeyPemFooter}\n`;
}

export default registerAs(
    'firebase',
    (): IConfigFirebase => ({
        projectId: process.env.FIREBASE_PROJECT_ID ?? null,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? null,
        privateKey: normalizeFirebasePrivateKey(
            process.env.FIREBASE_PRIVATE_KEY
        ),
    })
);
