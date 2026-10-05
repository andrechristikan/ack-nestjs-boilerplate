import { registerAs } from '@nestjs/config';
import { readOptionalEnv } from '@common/request/validations/request.optional-env.validation';

export interface IConfigFirebase {
    projectId: string | null;
    clientEmail: string | null;
    privateKey: string | null;
}

export default registerAs('firebase', (): IConfigFirebase => ({
    projectId: readOptionalEnv(process.env.FIREBASE_PROJECT_ID),
    clientEmail: readOptionalEnv(process.env.FIREBASE_CLIENT_EMAIL),
    privateKey: readOptionalEnv(process.env.FIREBASE_PRIVATE_KEY),
}));
