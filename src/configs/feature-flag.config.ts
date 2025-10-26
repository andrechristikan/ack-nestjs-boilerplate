import { registerAs } from '@nestjs/config';

export interface IConfigFeatureFlag {
    cachePrefixKey: string;
    cacheTtlMs: number;
}

export default registerAs(
    'featureFlag',
    (): IConfigFeatureFlag => ({
        cachePrefixKey: 'feature-flag:',
        cacheTtlMs: 60 * 60,
    })
);
