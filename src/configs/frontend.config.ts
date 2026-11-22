import { registerAs } from '@nestjs/config';

export interface IConfigFrontend {
    name: string;
    baseUrl: string;
}

export default registerAs('frontend', (): IConfigFrontend => {
    return {
        name: process.env.FRONTEND_NAME!,
        baseUrl: process.env.FRONTEND_BASE_URL!,
    };
});
