import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigFeatureFlag {
    keyPattern: string;
    cacheTtlInMs: number;
    anonymous: {
        headerName: string;
        idMaxLength: number;
        idRegex: RegExp;
    };
}

export default registerAs('featureFlag', (): IConfigFeatureFlag => ({
    keyPattern: 'FeatureFlag:{key}',
    cacheTtlInMs: ms('1h'),
    anonymous: {
        headerName: 'x-anonymous-id',
        idMaxLength: 100,
        idRegex: /^[a-zA-Z0-9-_]+$/,
    },
}));
