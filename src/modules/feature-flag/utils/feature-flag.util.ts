import {
    IFeatureFlagMetadata,
    IFeatureFlagMetadataValue,
} from '@modules/feature-flag/interfaces/feature-flag.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FeatureFlagUtil {
    /** True only when both have identical keys and matching value types, with no empty/nullish value. */
    checkMetadataKey(
        oldMetadata: IFeatureFlagMetadata,
        newMetadata: IFeatureFlagMetadata
    ): boolean {
        const oldKeys = Object.keys(oldMetadata).sort();
        const newKeys = Object.keys(newMetadata).sort();

        const isValidStructure =
            JSON.stringify(oldKeys) === JSON.stringify(newKeys);
        if (!isValidStructure) {
            return false;
        }

        for (const key of newKeys) {
            const newVal = newMetadata[key];
            const oldVal = oldMetadata[key];

            if (
                this.metadataValueType(newVal) !==
                this.metadataValueType(oldVal)
            ) {
                return false;
            } else if (
                newVal === undefined ||
                newVal === null ||
                newVal === '' ||
                (Array.isArray(newVal) && newVal.length === 0)
            ) {
                return false;
            }
        }

        return true;
    }

    /** Distinguishes string[] from number[] so an array value cannot silently change element type on update. */
    private metadataValueType(value: IFeatureFlagMetadataValue): string {
        if (Array.isArray(value)) {
            return value.length > 0 ? `array:${typeof value[0]}` : 'array';
        }

        return typeof value;
    }
}
