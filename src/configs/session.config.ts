import { registerAs } from '@nestjs/config';

export interface IConfigSession {
    keyPattern: string;
}

export default registerAs(
    'session',
    (): IConfigSession => ({
        keyPattern: 'User:{userId}:Session:{sessionId}',
    })
);
