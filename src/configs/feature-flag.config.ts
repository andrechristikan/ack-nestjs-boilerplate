import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigFeatureFlag {
    keyPattern: string;
    cacheTtlInMs: number;
    anonymous: {
        headerName: string;
        idMaxLength: number;
        idPattern: RegExp;
    };
}

export default registerAs(
    'featureFlag',
    (): IConfigFeatureFlag => ({
        keyPattern: 'FeatureFlag:{key}',
        cacheTtlInMs: ms('1h'),
        anonymous: {
            headerName: 'x-anonymous-id',
            idMaxLength: 100,
            idPattern: /^[a-zA-Z0-9-_]+$/,
        },
    })
);
