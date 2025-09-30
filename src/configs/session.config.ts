import { registerAs } from '@nestjs/config';

export interface IConfigSession {
    namespace: string;
    keyPattern: string;
}

export default registerAs(
    'session',
    (): IConfigSession => ({
        namespace: 'session',
        keyPattern: 'user:{userId}:session:{sessionId}',
    })
);
