import { registerAs } from '@nestjs/config';

export interface IConfigFirebase {
    projectId: string | null;
    clientEmailAddress: string | null;
    privateKey: string | null;
}

export default registerAs('firebase', (): IConfigFirebase => {
    return {
        projectId:
            process.env.FIREBASE_PROJECT_ID === ''
                ? null
                : (process.env.FIREBASE_PROJECT_ID ?? null),
        clientEmailAddress:
            process.env.FIREBASE_CLIENT_EMAIL_ADDRESS === ''
                ? null
                : (process.env.FIREBASE_CLIENT_EMAIL_ADDRESS ?? null),
        privateKey:
            process.env.FIREBASE_PRIVATE_KEY === ''
                ? null
                : (process.env.FIREBASE_PRIVATE_KEY ?? null),
    };
});
