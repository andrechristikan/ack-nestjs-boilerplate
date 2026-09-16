import { createPrivateKey } from 'crypto';
import { Injectable } from '@nestjs/common';
import { FirebasePrivateKeyPemMarker } from '@common/firebase/constants/firebase.constant';
import { IFirebaseUtil } from '@common/firebase/interfaces/firebase.util.interface';

/**
 * Normalizes the service-account private key into a PEM the Admin SDK accepts.
 */
@Injectable()
export class FirebaseUtil implements IFirebaseUtil {
    normalizePrivateKey(rawKey: string | null): string | null {
        const unescaped = (rawKey ?? '').replace(/\\n/g, '\n');

        if (!unescaped.trim()) {
            return null;
        }

        if (unescaped.includes(FirebasePrivateKeyPemMarker)) {
            return unescaped;
        }

        try {
            return createPrivateKey({
                key: Buffer.from(unescaped, 'base64'),
                format: 'der',
                type: 'pkcs8',
            }).export({ type: 'pkcs8', format: 'pem' }) as string;
        } catch {
            return null;
        }
    }
}
