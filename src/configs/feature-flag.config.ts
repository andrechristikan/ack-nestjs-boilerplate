import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigFeatureFlag {
    cachePrefixKey: string;
    cacheTtlMs: number;
}

export default registerAs(
    'featureFlag',
    (): IConfigFeatureFlag => ({
        cachePrefixKey: 'FeatureFlag',
        cacheTtlMs: ms('1h'),
    })
);
