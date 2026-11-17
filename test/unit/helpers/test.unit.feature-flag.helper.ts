import type { MockProxy } from 'vitest-mock-extended';
import { EnumFeatureFlagMetadataKey } from '@modules/feature-flag/enums/feature-flag.enum';
import type { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';

export function buildMetadataWithKeyCount(
    count: number
): Record<string, boolean> {
    const metadata: Record<string, boolean> = {};
    for (let index = 0; index < count; index++) {
        metadata[`key${'a'.repeat(index)}`] = true;
    }

    return metadata;
}

export function stubPasswordMetadataNumbers(
    featureFlagService: MockProxy<FeatureFlagService>,
    maxAttempts: number,
    lockDurationInMinutes: number
): void {
    featureFlagService.getMetadataNumber.mockImplementation(
        async (_key, metadataKey) =>
            metadataKey === EnumFeatureFlagMetadataKey.passwordMaxAttempts
                ? maxAttempts
                : lockDurationInMinutes
    );
}

export function issueMessages(
    issues: readonly { message: string }[] | undefined
): string[] {
    return (issues ?? []).map(issue => issue.message);
}
