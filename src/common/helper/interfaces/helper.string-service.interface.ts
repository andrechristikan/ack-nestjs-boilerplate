import {
    IHelperStringCurrencyOptions,
    IHelperStringPasswordOptions,
} from 'src/common/helper/interfaces/helper.interface';

export interface IHelperStringService {
    randomReference(length: number): string;
    random(length: number): string;
    censor(text: string): string;
    checkEmail(email: string): boolean;
    checkPasswordStrength(
        password: string,
        options?: IHelperStringPasswordOptions
    ): boolean;
    checkSafeString(text: string): boolean;
    formatCurrency(num: number, options?: IHelperStringCurrencyOptions): string;
}
