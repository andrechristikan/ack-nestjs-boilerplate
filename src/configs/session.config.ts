import { registerAs } from '@nestjs/config';

export interface IConfigSession {
    keyPrefix: string;
}

export default registerAs(
    'session',
    (): IConfigSession => ({
        keyPrefix: 'UserLogin',
    })
);
