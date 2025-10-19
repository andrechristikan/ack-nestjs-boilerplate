import { registerAs } from '@nestjs/config';

export interface IConfigTermPolicy {
    uploadContentPath: string;
    contentPublicPath: string;
    filenamePattern: string;
}

export default registerAs(
    'termPolicy',
    (): IConfigTermPolicy => ({
        uploadContentPath:
            '/term-policies/{type}/{language}-{version}.{extension}',
        contentPublicPath: '/term-policies/{type}',
        filenamePattern: '{language}-v{version}',
    })
);
