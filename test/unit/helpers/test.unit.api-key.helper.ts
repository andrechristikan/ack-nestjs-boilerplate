import type { MockInstance } from 'vitest';
import type { HelperStringService } from '@common/helper/services/helper.string.service';

export function stubApiKeyRandom(
    random: MockInstance<HelperStringService['random']>,
    keyPart: string,
    secret: string
): void {
    random.mockImplementation(length => (length === 30 ? keyPart : secret));
}
