import { IHelperArrayService } from '@common/helper/interfaces/helper.array.service.interface';
import { Injectable } from '@nestjs/common';
import _ from 'lodash';

@Injectable()
export class HelperArrayService implements IHelperArrayService {
    unique<T>(array: T[]): T[] {
        return _.uniq(array);
    }

    shuffle<T>(array: T[]): T[] {
        return _.shuffle(array);
    }

    chunk<T>(a: T[], size: number): T[][] {
        return _.chunk<T>(a, size);
    }

    intersection<T>(a: T[], b: T[]): T[] {
        return _.intersection(a, b);
    }
}
