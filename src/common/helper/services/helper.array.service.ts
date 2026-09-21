import { Injectable } from '@nestjs/common';
import { chunk, intersection, shuffle, uniq } from 'lodash-es';

@Injectable()
export class HelperArrayService {
    unique<T>(array: T[]): T[] {
        return uniq(array);
    }

    shuffle<T>(array: T[]): T[] {
        return shuffle(array);
    }

    chunk<T>(a: T[], size: number): T[][] {
        return chunk<T>(a, size);
    }

    intersection<T>(a: T[], b: T[]): T[] {
        return intersection(a, b);
    }
}
