import { Injectable } from '@nestjs/common';
import RandExp from 'randexp';
import {
    IHelperStringCurrencyOptions,
    IHelperStringPasswordOptions,
    IHelperStringRandomOptions,
} from 'src/common/helper/interfaces/helper.interface';
import { IHelperStringService } from 'src/common/helper/interfaces/helper.string-service.interface';

@Injectable()
export class HelperStringService implements IHelperStringService {
    randomReference(length: number): string {
        const timestamp = `${new Date().getTime()}`;
        const randomString: string = this.random(length, {
            safe: true,
            upperCase: true,
        });

        return `${timestamp}${randomString}`;
    }

    random(length: number, options?: IHelperStringRandomOptions): string {
        const rString = options?.safe
            ? new RandExp(`[A-Z]{${length},${length}}`)
            : new RandExp(`\\w{${length},${length}}`);

        return options?.upperCase ? rString.gen().toUpperCase() : rString.gen();
    }

    censor(text: string): string {
        if (text.length <= 3) {
            const stringCensor = '*'.repeat(2);
            return `${stringCensor}${text.slice(-1)}`;
        } else if (text.length <= 10) {
            const stringCensor = '*'.repeat(7);
            return `${stringCensor}${text.slice(-3)}`;
        } else if (text.length <= 25) {
            const lengthExplicit = Math.ceil((text.length / 100) * 30);
            const lengthCensor = Math.ceil((text.length / 100) * 50);
            const stringCensor = '*'.repeat(lengthCensor);
            return `${stringCensor}${text.slice(-lengthExplicit)}`;
        }

        const stringCensor = '*'.repeat(10);
        const lengthExplicit = Math.ceil((text.length / 100) * 30);
        return `${text.slice(0, 3)}${stringCensor}${text.slice(-lengthExplicit)}`;
    }

    checkEmail(email: string): boolean {
        const regex = new RegExp(/\S+@\S+\.\S+/);
        return regex.test(email);
    }

    checkPasswordWeak(
        password: string,
        options?: IHelperStringPasswordOptions
    ): boolean {
        const length = options?.length ?? 6;
        const regex = new RegExp(`^(?=.*?[A-Z])(?=.*?[a-z]).{${length},}$`);

        return regex.test(password);
    }

    checkPasswordMedium(
        password: string,
        options?: IHelperStringPasswordOptions
    ): boolean {
        const length = options?.length ?? 6;
        const regex = new RegExp(
            `^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{${length},}$`
        );

        return regex.test(password);
    }

    checkPasswordStrong(
        password: string,
        options?: IHelperStringPasswordOptions
    ): boolean {
        const length = options?.length ?? 6;
        const regex = new RegExp(
            `^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{${length},}$`
        );

        return regex.test(password);
    }

    checkSafeString(text: string): boolean {
        const regex = new RegExp('^[A-Za-z0-9_-]+$');
        return regex.test(text);
    }

    formatCurrency(
        num: number,
        options?: IHelperStringCurrencyOptions
    ): string {
        return num.toLocaleString(options?.locale);
    }
}
