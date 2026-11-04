import { registerAs } from '@nestjs/config';

export interface IConfigActivityLog {
    jobId: {
        createManyPattern: string;
    };
    analytic: {
        pageSize: number;
    };
}

export default registerAs('activityLog', (): IConfigActivityLog => ({
    jobId: {
        createManyPattern: '{process}-{nonce}',
    },
    analytic: {
        pageSize: 5000,
    },
}));
