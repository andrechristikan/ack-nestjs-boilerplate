import { registerAs } from '@nestjs/config';

export interface IConfigActivityLog {
    jobId: {
        createManyPattern: string;
    };
}

export default registerAs('activityLog', (): IConfigActivityLog => ({
    jobId: {
        createManyPattern: '{process}-{nonce}',
    },
}));
