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

        const end = length > 4 ? length - 4 : 1;
        const censorString = '*'.repeat(end > 10 ? 10 : end);
        const visibleString = value.substring(end, length);
        return `${censorString}${visibleString}`;
    }
}
