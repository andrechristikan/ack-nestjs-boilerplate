import { Injectable } from '@nestjs/common';
import { faker } from '@faker-js/faker';
import { HelperDateService } from './helper.date.service';
import { IHelperStringRandomOptions } from 'src/common/helper/interfaces/helper.interface';
import { IHelperStringService } from 'src/common/helper/interfaces/helper.string-service.interface';

@Injectable()
export class HelperStringService implements IHelperStringService {
    constructor(private readonly helperDateService: HelperDateService) {}

    checkEmail(email: string): boolean {
        const regex = /\S+@\S+\.\S+/;
        return regex.test(email);
    }

    randomReference(length: number, prefix?: string): string {
        const timestamp = `${this.helperDateService.timestamp()}`;
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
                ? faker.internet.password(
                      length,
                      true,
                      /[A-Z]/,
                      options && options.prefix ? options.prefix : undefined
                  )
                : faker.internet.password(
                      length,
                      false,
                      /\w/,
                      options && options.prefix ? options.prefix : undefined
                  );

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

    checkSafeString(text: string): boolean {
        const regex = new RegExp('^[A-Za-z0-9_-]+$');
        return regex.test(text);
    }
}
