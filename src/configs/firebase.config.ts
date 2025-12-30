import { registerAs } from '@nestjs/config';

export default registerAs(
    'firebase',
    (): Record<string, unknown> => ({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
);
