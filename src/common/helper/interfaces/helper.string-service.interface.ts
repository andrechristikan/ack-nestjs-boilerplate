import {
    IHelperEmailValidation,
    IHelperStringPasswordOptions,
} from '@common/helper/interfaces/helper.interface';

export interface IHelperStringService {
    randomReference(length: number): string;
    random(length: number): string;
    censor(text: string): string;
    checkPasswordStrength(
        password: string,
        options?: IHelperStringPasswordOptions
    ): boolean;
    formatCurrency(num: number, locale: string): string;
    checkCustomEmail(value: string): IHelperEmailValidation;
    checkWildcardUrl(url: string, patterns: string[]): boolean;
}
