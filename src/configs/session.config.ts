import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigSession {
    keyPattern: string;
    loginCacheTtlInMs: number;
}

export default registerAs('session', (): IConfigSession => ({
    keyPattern: 'User:{userId}:Session:{sessionId}',
    loginCacheTtlInMs: ms('15m'),
}));
