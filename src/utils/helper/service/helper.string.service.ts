import { Injectable } from '@nestjs/common';
import faker from '@faker-js/faker';
import { IHelperStringRandomOptions } from '../helper.interface';

@Injectable()
export class HelperStringService {
    checkEmail(email: string): boolean {
        const regex = /\S+@\S+\.\S+/;
        return regex.test(email);
    }

    randomReference(length: number, prefix?: string): string {
        const timestamp = `${new Date().valueOf()}`;
        const randomString: string = this.random(length, {
            safe: true,
            upperCase: true,
        });

        return prefix
            ? `${prefix}-${timestamp}${randomString}`
            : `${timestamp}${randomString}`;
    }

    random(length: number, options?: IHelperStringRandomOptions): string {
        const rString =
            options && options.safe
                ? faker.internet.password(length, true, /[A-Z]/)
                : faker.internet.password(length, true, /[A-Za-z0-9]/);

        return options && options.upperCase ? rString.toUpperCase() : rString;
    }

    censor(value: string): string {
        const length = value.length;
        if (length === 1) {
            return value;
        }

        const end = length > 4 ? length - 4 : 1;
        const censorString = '*'.repeat(end > 10 ? 10 : end);
        const visibleString = value.substring(end, length);
        return `${censorString}${visibleString}`;
    }

    checkPasswordWeak(password: string, length?: number): boolean {
        const regex = new RegExp(
            `^(?=.*?[A-Z])(?=.*?[a-z]).{${length || 8},}$`
        );

        return regex.test(password);
    }

    checkPasswordMedium(password: string, length?: number): boolean {
        const regex = new RegExp(
            `^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{${length || 8},}$`
        );

        return regex.test(password);
    }

    checkPasswordStrong(password: string, length?: number): boolean {
        const regex = new RegExp(
            `^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{${
                length || 8
            },}$`
        );

        return regex.test(password);
    }
}
