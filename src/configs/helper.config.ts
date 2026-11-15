import { registerAs } from '@nestjs/config';
import bytes from 'bytes';

export interface IConfigHelperArgon2 {
    memoryInBytes: number;
    passes: number;
    parallelism: number;
    saltLength: number;
    tagLength: number;
}

export interface IConfigHelper {
    argon2: IConfigHelperArgon2;
}

export default registerAs('helper', (): IConfigHelper => ({
    argon2: {
        memoryInBytes: bytes('19mb') ?? 0,
        passes: 2,
        parallelism: 1,
        saltLength: 16,
        tagLength: 32,
    },
}));
