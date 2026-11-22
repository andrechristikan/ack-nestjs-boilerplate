import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigFeatureFlag {
    keyPattern: string;
    cacheTtlInMs: number;
    leaseKeyPattern: string;
    leaseTtlInMs: number;
    anonymous: {
        idMaxLength: number;
        idRegex: RegExp;
    };
}

export default registerAs('featureFlag', (): IConfigFeatureFlag => ({
    keyPattern: 'FeatureFlag:{key}',
    cacheTtlInMs: ms('1h'),
    leaseKeyPattern: 'FeatureFlag:Lease:{key}',
    leaseTtlInMs: ms('10s'),
    anonymous: {
        idMaxLength: 100,
        idRegex: /^[a-zA-Z0-9-_]+$/,
    },
}));
