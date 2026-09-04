export type IFeatureFlagMetadataValue =
    | string
    | number
    | boolean
    | string[]
    | number[];

export type IFeatureFlagMetadata = Record<string, IFeatureFlagMetadataValue>;

export interface IFeatureFlagUpdateStatus {
    isEnable: boolean;
    rolloutPercent: number;
    targetUserIds?: string[];
}

export interface IFeatureFlagUpdateMetadata {
    metadata: IFeatureFlagMetadata;
}
