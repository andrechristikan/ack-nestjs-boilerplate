import { Injectable } from '@nestjs/common';
import { faker } from '@faker-js/faker';

@Injectable()
export class HelperNumberService {
    check(number: string): boolean {
        const regex = /^-?\d+$/;
        return regex.test(number);
    }

    createFromString(number: string): number {
        return Number(number);
    }

    random(length: number): number {
        const min: number = Number.parseInt(`1`.padEnd(length, '0'));
        const max: number = Number.parseInt(`9`.padEnd(length, '9'));
        return this.randomInRange(min, max);
    }

    randomInRange(min: number, max: number): number {
        return faker.datatype.number({ min, max });
    }
}
