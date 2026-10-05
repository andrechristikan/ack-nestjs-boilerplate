import { registerAs } from '@nestjs/config';
import bytes from 'bytes';

export interface IConfigFile {
    maxDataImport: number;
    maxSizeExportInBytes: number;
}

export default registerAs('file', (): IConfigFile => ({
    maxDataImport: 100,
    maxSizeExportInBytes: bytes('2mb') ?? 0,
}));
