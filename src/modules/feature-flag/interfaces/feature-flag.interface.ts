import type {
    FeatureFlag,
    FeatureFlagUser,
} from '@generated/prisma-client/client';

export type { FeatureFlagUpdateStatusRequestDto as IFeatureFlagUpdateStatus } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request.dto';

export type IFeatureFlagMetadataValue =
    string | number | boolean | string[] | number[];

export type IFeatureFlagMetadata = Record<string, IFeatureFlagMetadataValue>;

export interface IFeatureFlagUpdateMetadata {
    metadata: IFeatureFlagMetadata;
}

export interface IFeatureFlagWithTargetUsers extends FeatureFlag {
    targetUsers: FeatureFlagUser[];
}
