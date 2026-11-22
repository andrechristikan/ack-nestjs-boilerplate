import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';

@Injectable()
export class HelperNumberService {
    checkString(number: string): boolean {
        const regex = /^-?\d+$/;
        return regex.test(number);
    }

    randomDigits(length: number): string {
        const value = this.randomInRange(10 ** (length - 1), 10 ** length);

        return value.toString();
    }

    randomInRange(min: number, max: number): number {
        return randomInt(Math.ceil(min), Math.floor(max));
    }

    calculatePercent(value: number, total: number): number {
        let tValue = value / total;
        if (Number.isNaN(tValue) || !Number.isFinite(tValue)) {
            tValue = 0;
        }

        return Number.parseFloat((tValue * 100).toFixed(2));
    }

    percent(part: number, total: number): number {
        return total === 0 ? 0 : (part / total) * 100;
    }
}
