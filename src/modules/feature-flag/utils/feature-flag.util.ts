import { HelperHashService } from '@common/helper/services/helper.hash.service';
import type {
    IFeatureFlagMetadata,
    IFeatureFlagMetadataValue,
} from '@modules/feature-flag/interfaces/feature-flag.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FeatureFlagUtil {
    constructor(private readonly helperHashService: HelperHashService) {}

    /** Distinguishes string[] from number[] so an array value cannot silently change element type on update. */
    private metadataValueType(value: IFeatureFlagMetadataValue): string {
        if (Array.isArray(value)) {
            return value.length > 0 ? `array:${typeof value[0]}` : 'array';
        }

        return typeof value;
    }

    /** True only when both have identical keys and matching value types, with no empty/nullish value; false when the stored metadata is null. */
    isMetadataValid(
        oldMetadata: IFeatureFlagMetadata | null,
        newMetadata: IFeatureFlagMetadata
    ): boolean {
        if (oldMetadata === null) {
            return false;
        }

        const oldKeys = Object.keys(oldMetadata).sort();
        const newKeys = Object.keys(newMetadata).sort();

        const isValidStructure =
            JSON.stringify(oldKeys) === JSON.stringify(newKeys);
        if (!isValidStructure) {
            return false;
        }

        for (const key of newKeys) {
            const newVal = newMetadata[key]!;
            const oldVal = oldMetadata[key]!;

            const newValueType = this.metadataValueType(newVal);
            const oldValueType = this.metadataValueType(oldVal);
            if (newValueType !== oldValueType) {
                return false;
            } else if (
                (newVal ?? null) === null ||
                newVal === '' ||
                (Array.isArray(newVal) && newVal.length === 0)
            ) {
                return false;
            }
        }

        return true;
    }

    /** Deterministic bucketing salted by flag key so each flag buckets a user independently. */
    isInRollout(
        rolloutPercent: number,
        key: string,
        identifier: string
    ): boolean {
        const hash = this.helperHashService.sha256Hash(`${key}:${identifier}`);
        const num = Number.parseInt(hash.slice(0, 8), 16);
        const percentage = num % 100;

        return percentage < rolloutPercent;
    }
}
