import { registerAs } from '@nestjs/config';
import bytes from 'bytes';

export interface IConfigFile {
    maxDataImport: number;
    maxDataExport: number;
    maxSizeExportInBytes: number;
}

export default registerAs('file', (): IConfigFile => ({
    maxDataImport: 100,
    maxDataExport: 1000,
    maxSizeExportInBytes: bytes('2mb') ?? 0,
}));
