import { registerAs } from '@nestjs/config';

export interface IConfigResponse {
    cachePrefix: string;
    filenameExportPattern: string;
}

export default registerAs(
    'response',
    (): IConfigResponse => ({
        cachePrefix: 'Apis',
        filenameExportPattern: 'export-{timestamp}.{extension}',
    })
);
