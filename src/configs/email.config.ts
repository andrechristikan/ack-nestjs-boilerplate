import { registerAs } from '@nestjs/config';
import ms from 'ms';
import { readOptionalEnv } from '@common/request/validations/request.optional-env.validation';

export interface IConfigEmail {
    noreply: string | null;
    support: string | null;
    batchSize: number;
    batchDelayInMs: number;
}

export default registerAs('email', (): IConfigEmail => ({
    noreply: readOptionalEnv(process.env.EMAIL_NO_REPLY),
    support: readOptionalEnv(process.env.EMAIL_SUPPORT),
    batchSize: 100,
    batchDelayInMs: ms('1s'),
}));
