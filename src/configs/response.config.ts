import { registerAs } from '@nestjs/config';

export interface IConfigResponse {
    keyPattern: string;
    filenameExportPattern: string;
}

export default registerAs(
    'response',
    (): IConfigResponse => ({
        keyPattern: 'Apis:{key}',
        filenameExportPattern: 'export-{timestamp}.{extension}',
    })
);
