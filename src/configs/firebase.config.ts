import { registerAs } from '@nestjs/config';

export interface IConfigFirebase {
    projectId: string | null;
    clientEmail: string | null;
    privateKey: string | null;
}

export default registerAs(
    'firebase',
    (): IConfigFirebase => ({
        projectId: process.env.FIREBASE_PROJECT_ID ?? null,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? null,
        privateKey: process.env.FIREBASE_PRIVATE_KEY
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
            : null,
    })
);
