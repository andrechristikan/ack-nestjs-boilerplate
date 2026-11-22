import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigRole {
    keyPattern: string;
    cacheTtlInMs: number;
    leaseKeyPattern: string;
    leaseTtlInMs: number;
}

export default registerAs('role', (): IConfigRole => ({
    keyPattern: 'Role:{roleId}',
    cacheTtlInMs: ms('15m'),
    leaseKeyPattern: 'Role:Lease:{roleId}',
    leaseTtlInMs: ms('10s'),
}));
