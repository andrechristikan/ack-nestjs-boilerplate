import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigEmail {
    noreply: string | null;
    support: string | null;
    batchSize: number;
    batchDelayInMs: number;
}

export default registerAs('email', (): IConfigEmail => {
    return {
        noreply:
            process.env.EMAIL_NO_REPLY === ''
                ? null
                : (process.env.EMAIL_NO_REPLY ?? null),
        support:
            process.env.EMAIL_SUPPORT === ''
                ? null
                : (process.env.EMAIL_SUPPORT ?? null),
        batchSize: 50,
        batchDelayInMs: ms('1s'),
    };
});
