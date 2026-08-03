import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigFeatureFlag {
    keyPattern: string;
    cacheTtlInMs: number;
}

export default registerAs(
    'featureFlag',
    (): IConfigFeatureFlag => ({
        keyPattern: 'FeatureFlag:{key}',
        cacheTtlInMs: ms('1h'),
    })
);
