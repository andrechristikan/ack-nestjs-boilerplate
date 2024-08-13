import { faker } from '@faker-js/faker';
import { Injectable } from '@nestjs/common';
import {
    IHelperStringCurrencyOptions,
    IHelperStringPasswordOptions,
} from 'src/common/helper/interfaces/helper.interface';
import { IHelperStringService } from 'src/common/helper/interfaces/helper.string-service.interface';

@Injectable()
export class HelperStringService implements IHelperStringService {
    randomReference(length: number): string {
        const timestamp = `${new Date().getTime()}`;
        const randomString: string = this.random(length);

        return `${timestamp}${randomString}`.toUpperCase();
    }

    random(length: number): string {
        return faker.string.alphanumeric({
            length: { min: length, max: length },
        });
    }

    censor(text: string): string {
        if (text.length <= 3) {
            const stringCensor = '*'.repeat(2);
            return `${stringCensor}${text.slice(-1)}`;
        } else if (text.length <= 10) {
            const stringCensor = '*'.repeat(7);
            return `${stringCensor}${text.slice(-3)}`;
        }

        const stringCensor = '*'.repeat(10);
        return `${text.slice(0, 3)}${stringCensor}${text.slice(-4)}`;
    }

    checkEmail(email: string): boolean {
        const regex = new RegExp(/\S+@\S+\.\S+/);
        return regex.test(email);
    }

    checkPasswordStrength(
        password: string,
        options?: IHelperStringPasswordOptions
    ): boolean {
        const length = options?.length ?? 8;
        const regex = new RegExp(
            `^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{${length},}$`
        );

        return regex.test(password);
    }

    checkSafeString(text: string): boolean {
        const regex = new RegExp('^[A-Za-z0-9]+$');
        return regex.test(text);
    }

    formatCurrency(
        num: number,
        options?: IHelperStringCurrencyOptions
    ): string {
        return num.toLocaleString(options?.locale);
    }
}
