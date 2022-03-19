import { Injectable } from '@nestjs/common';
import faker from '@faker-js/faker';

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

    random(length: number, options?: Record<string, any>): string {
        return options && options.safe
            ? faker.random.alpha({
                  count: length,
                  upcase: options && options.upperCase ? true : false,
              })
            : options && options.upperCase
            ? faker.random.alphaNumeric(length).toUpperCase()
            : faker.random.alphaNumeric(length);
    }

    censor(value: string) {
        const length = value.length;
        if (length === 1) {
            return value;
        }

        const end = length > 10 ? 6 : length > 5 ? length - 2 : length - 1;
        const censorString = '*'.repeat(end);
        const visibleString = value.substring(end, length > 10 ? 15 : length);
        return `${censorString}${visibleString}`;
    }
}
