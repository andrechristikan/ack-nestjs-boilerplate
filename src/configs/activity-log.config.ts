import { registerAs } from '@nestjs/config';

export interface IConfigActivityLog {
    analytic: {
        pageSize: number;
    };
}

export default registerAs('activityLog', (): IConfigActivityLog => ({
    analytic: {
        pageSize: 5000,
    },
}));
