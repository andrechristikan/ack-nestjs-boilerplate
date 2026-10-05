import { registerAs } from '@nestjs/config';
import { readOptionalEnv } from '@common/request/validations/request.optional-env.validation';

export interface IConfigEmail {
    noreply: string | null;
    support: string | null;
    batchSize: number;
}

export default registerAs('email', (): IConfigEmail => ({
    noreply: readOptionalEnv(process.env.EMAIL_NO_REPLY),
    support: readOptionalEnv(process.env.EMAIL_SUPPORT),
    batchSize: 100,
}));
