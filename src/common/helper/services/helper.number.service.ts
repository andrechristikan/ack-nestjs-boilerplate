import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';

@Injectable()
export class HelperNumberService {
    checkString(number: string): boolean {
        const regex = /^-?\d+$/;
        return regex.test(number);
    }

    /** An n-digit decimal string with a non-zero first digit; valid for 1 to 14 digits. */
    randomDigits(length: number): string {
        return this.randomInRange(10 ** (length - 1), 10 ** length).toString();
    }

    /** Integer in [ceil(min), floor(max)); throws RangeError when the range is empty or reaches 2^48. */
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
}
