import type {
    FeatureFlag,
    FeatureFlagUser,
} from '@generated/prisma-client/client';

export type IFeatureFlagMetadataValue =
    string | number | boolean | string[] | number[];

export type IFeatureFlagMetadata = Record<string, IFeatureFlagMetadataValue>;

export interface IFeatureFlagUpdateStatus {
    isEnable: boolean;
    rolloutPercent: number;
}

export interface IFeatureFlagUpdateMetadata {
    metadata: IFeatureFlagMetadata;
}

export interface IFeatureFlagWithTargetUsers extends FeatureFlag {
    targetUsers: FeatureFlagUser[];
}
