import { IHelperStringRandomOptions } from 'src/common/helper/interfaces/helper.interface';

export interface IHelperStringService {
    checkEmail(email: string): boolean;
    randomReference(length: number, prefix?: string): string;
    random(length: number, options?: IHelperStringRandomOptions): string;
    censor(value: string): string;
    checkPasswordWeak(password: string, length?: number): boolean;
    checkPasswordMedium(password: string, length?: number): boolean;
    checkPasswordStrong(password: string, length?: number): boolean;
    checkSafeString(text: string): boolean;
}
