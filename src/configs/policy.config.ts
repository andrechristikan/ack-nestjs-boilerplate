import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigPolicy {
    keyPattern: string;
    cacheTtlInMs: number;
}

export default registerAs('policy', (): IConfigPolicy => ({
    keyPattern: 'Policy:Role:{roleId}',
    cacheTtlInMs: ms('5m'),
}));
