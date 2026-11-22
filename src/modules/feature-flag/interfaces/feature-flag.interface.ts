import type { FeatureFlagWithTargetsInclude } from '@modules/feature-flag/constants/feature-flag.constant';
import type { FeatureFlag, Prisma } from '@generated/prisma-client/client';

export type IFeatureFlagMetadataValue =
    string | number | boolean | string[] | number[];

export type IFeatureFlagMetadata = Record<string, IFeatureFlagMetadataValue>;

export interface IFeatureFlag extends FeatureFlag {
    targetUserIds: string[];
}

export type IFeatureFlagWithTargets = Prisma.FeatureFlagGetPayload<{
    include: typeof FeatureFlagWithTargetsInclude;
}>;

export interface IFeatureFlagUpdateStatus {
    isEnable: boolean;
    rolloutPercent: number;
    targetUserIds: string[];
}

export interface IFeatureFlagUpdateMetadata {
    metadata: IFeatureFlagMetadata;
}
