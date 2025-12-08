import { registerAs } from '@nestjs/config';

export interface IConfigTermPolicy {
    uploadContentPath: string;
    contentPublicPath: string;
}

export default registerAs(
    'termPolicy',
    (): IConfigTermPolicy => ({
        uploadContentPath: '/term-policies/{type}/v{version}',
        contentPublicPath: '/term-policies/{type}/v{version}',
    })
);
