import { Injectable } from '@nestjs/common';
import { EnumHelperPemLabel } from '@common/helper/enums/helper.enum';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { FirebasePrivateKeyPemMarker } from '@common/firebase/constants/firebase.constant';

@Injectable()
export class FirebaseUtil {
    constructor(
        private readonly helperEncryptionService: HelperEncryptionService
    ) {}

    normalizePrivateKey(rawKey: string | null): string | null {
        const unescaped = (rawKey ?? '').replace(/\\n/g, '\n');

        if (!unescaped.trim()) {
            return null;
        }

        if (unescaped.includes(FirebasePrivateKeyPemMarker)) {
            return unescaped;
        }

        try {
            return this.helperEncryptionService.derBase64ToPem(
                unescaped,
                EnumHelperPemLabel.privateKey
            );
        } catch {
            return null;
        }
    }
}
