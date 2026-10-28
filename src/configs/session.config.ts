import { registerAs } from '@nestjs/config';

export interface IConfigSession {
    keyPattern: string;
    jobId: {
        purgeLoginsPattern: string;
    };
}

export default registerAs('session', (): IConfigSession => ({
    keyPattern: 'User:{userId}:Session:{sessionId}',
    jobId: {
        purgeLoginsPattern: '{process}-{nonce}',
    },
}));
