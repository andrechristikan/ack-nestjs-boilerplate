import { registerAs } from '@nestjs/config';

export interface IConfigResponse {
    filenameExportPattern: string;
}

export default registerAs('response', (): IConfigResponse => ({
    filenameExportPattern: 'export-{timestamp}.{extension}',
}));
