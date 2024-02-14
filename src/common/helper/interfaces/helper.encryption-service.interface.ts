import {
    IHelperJwtOptions,
    IHelperJwtVerifyOptions,
} from 'src/common/helper/interfaces/helper.interface';

export interface IHelperEncryptionService {
    base64Encrypt(data: string): string;
    base64Decrypt(data: string): string;
    base64Compare(basicToken1: string, basicToken2: string): boolean;
    aes256Encrypt(
        data: string | Record<string, any> | Record<string, any>[],
        key: string,
        iv: string
    ): string;
    aes256Decrypt(
        encrypted: string,
        key: string,
        iv: string
    ): string | Record<string, any> | Record<string, any>[];
    aes256Compare(aes1: string, aes2: string): boolean;
    jwtEncrypt(
        payload: Record<string, any>,
        options: IHelperJwtOptions
    ): string;
    jwtDecrypt(token: string): Record<string, any>;
    jwtVerify(token: string, options: IHelperJwtVerifyOptions): boolean;
}
