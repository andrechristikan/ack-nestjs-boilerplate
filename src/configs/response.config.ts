import { registerAs } from '@nestjs/config';

export interface IConfigRequest {
    cachePrefix: string;
}

export default registerAs(
    'response',
    (): IConfigRequest => ({
        cachePrefix: 'Apis',
    })
);
