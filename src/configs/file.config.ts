import { registerAs } from '@nestjs/config';

export interface IConfigFile {
    maxDataImport: number;
}

export default registerAs(
    'file',
    (): IConfigFile => ({
        maxDataImport: 1000,
    })
);
