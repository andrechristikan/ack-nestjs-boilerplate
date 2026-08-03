export type IFeatureFlagMetadataValue =
    | string
    | number
    | boolean
    | string[]
    | number[];

export type IFeatureFlagMetadata = Record<string, IFeatureFlagMetadataValue>;
