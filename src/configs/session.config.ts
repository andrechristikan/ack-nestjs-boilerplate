import { registerAs } from '@nestjs/config';

export interface IConfigSession {
    keyPattern: string;
}

export default registerAs(
    'session',
    (): IConfigSession => ({
        keyPattern: 'user:{userId}:session:{sessionId}',
    })
);
