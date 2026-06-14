import { registerAs } from '@nestjs/config';

export interface IConfigResponse {
    cachePrefix: string;
}

export default registerAs(
    'response',
    (): IConfigResponse => ({
        cachePrefix: 'Apis',
    })
);
