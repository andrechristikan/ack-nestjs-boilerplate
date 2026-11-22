import type { MockProxy } from 'vitest-mock-extended';
import type { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';

export const TestPushStampedAt = new Date('2024-03-01T00:00:00.000Z');

export function stubCipherDecryption(
    helperEncryptionService: MockProxy<HelperEncryptionService>
): void {
    helperEncryptionService.aes256Decrypt.mockImplementation(
        (encrypted: string) => encrypted.replace(/^cipher\((.*)\)$/, '$1')
    );
}
