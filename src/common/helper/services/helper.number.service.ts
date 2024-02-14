import { Injectable } from '@nestjs/common';
import { IHelperNumberService } from 'src/common/helper/interfaces/helper.number-service.interface';

@Injectable()
export class HelperNumberService implements IHelperNumberService {
    check(number: string): boolean {
        const regex = /^-?\d+$/;
        return regex.test(number);
    }

    random(length: number): number {
        const min: number = Number.parseInt(`1`.padEnd(length, '0'));
        const max: number = Number.parseInt(`9`.padEnd(length, '9'));
        return this.randomInRange(min, max);
    }

    randomInRange(min: number, max: number): number {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min) + min);
    }

    percent(value: number, total: number): number {
        let tValue = value / total;
        if (Number.isNaN(tValue) || !Number.isFinite(tValue)) {
            tValue = 0;
        }
        return Number.parseFloat((tValue * 100).toFixed(2));
    }
}
