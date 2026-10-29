import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigSession {
    keyPattern: string;
    loginCacheTtlInMs: number;
    jobId: {
        purgeLoginsPattern: string;
    };
}

export default registerAs('session', (): IConfigSession => ({
    keyPattern: 'User:{userId}:Session:{sessionId}',
    loginCacheTtlInMs: ms(
        process.env.AUTH_JWT_ACCESS_TOKEN_EXPIRED as ms.StringValue
    ),
    jobId: {
        purgeLoginsPattern: '{process}-{nonce}',
    },
}));
