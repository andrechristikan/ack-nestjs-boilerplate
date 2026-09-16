import {
    IHelperEmailValidation,
    IHelperPasswordOptions,
} from '@common/helper/interfaces/helper.interface';

export interface IHelperStringService {
    random(length: number): string;
    generateSlug(prefix: string, maxLength: number): string;
    censor(text: string): string;
    checkPasswordStrength(
        password: string,
        options?: IHelperPasswordOptions
    ): boolean;
    checkEmail(value: string): IHelperEmailValidation;
    checkUrlMatchesPatterns(url: string, patterns: string[]): boolean;
}
