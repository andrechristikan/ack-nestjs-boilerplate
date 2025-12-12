import { registerAs } from '@nestjs/config';

export interface IConfigFeatureFlag {
    cachePrefixKey: string;
    cacheTtlMs: number;
}

export default registerAs(
    'featureFlag',
    (): IConfigFeatureFlag => ({
        cachePrefixKey: 'FeatureFlag',
        cacheTtlMs: 60 * 60,
    })
);
