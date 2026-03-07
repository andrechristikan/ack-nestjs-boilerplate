import { registerAs } from '@nestjs/config';

export interface IConfigFirebase {
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;
}

export default registerAs(
    'firebase',
    (): IConfigFirebase => ({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
);
