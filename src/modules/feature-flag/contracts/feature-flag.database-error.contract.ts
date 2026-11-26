import { DatabaseRecordNotFoundCode } from '@common/database/constants/database.constant';
import type { IDatabaseErrorContract } from '@common/database/interfaces/database.interface';
import { FeatureFlagNotFoundException } from '@modules/feature-flag/exceptions/feature-flag.not-found.exception';

/** @public */
export const FeatureFlagDatabaseErrorContract = {
    [DatabaseRecordNotFoundCode]: FeatureFlagNotFoundException,
} satisfies IDatabaseErrorContract;
