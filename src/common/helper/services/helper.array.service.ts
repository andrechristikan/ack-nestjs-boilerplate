import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import { IHelperArrayService } from 'src/common/helper/interfaces/helper.array-service.interface';

@Injectable()
export class HelperArrayService implements IHelperArrayService {
    getCombinations<T>(
        list: T[][],
        start = 0,
        result: T[][] = [],
        current: T[] = []
    ): T[][] {
        if (start === list.length) result.push(current);
        else
            list[start].forEach((item) =>
                this.getCombinations(list, start + 1, result, [
                    ...current,
                    item,
                ])
            );

        return result;
    }

    getLast<T>(array: T[]): T {
        return _.last(array);
    }

    getFirst<T>(array: T[]): T {
        return _.first(array);
    }

    getFirstByIndex<T>(array: T[], index: number): T {
        return _.nth(array, index);
    }

    getLastByIndex<T>(array: T[], index: number): T {
        return _.nth(array, -Math.abs(index));
    }

    takeFirst<T>(array: T[], length: number): T[] {
        return _.take(array, length);
    }

    takeLast<T>(array: T[], length: number): T[] {
        return _.takeRight(array, length);
    }

    indexOf<T>(array: T[], value: T): number {
        return _.indexOf(array, value);
    }

    lastIndexOf<T>(array: T[], value: T): number {
        return _.lastIndexOf(array, value);
    }

    remove<T>(array: T[], value: T): T[] {
        return _.remove(array, function (n) {
            return n === value;
        });
    }

    removeFromLeft<T>(array: T[], length: number): T[] {
        return _.drop(array, length);
    }

    removeFromRight<T>(array: Array<T>, length: number): T[] {
        return _.dropRight(array, length);
    }

    join<T>(array: Array<T>, delimiter: string): string {
        return _.join(array, delimiter);
    }

    split(str: string, delimiter: string): string[] {
        return _.split(str, delimiter);
    }

    reverse<T>(array: T[]): T[] {
        return _.reverse(array);
    }

    unique<T>(array: T[]): T[] {
        return _.uniq(array);
    }

    shuffle<T>(array: T[]): T[] {
        return _.shuffle(array);
    }

    merge<T>(a: T[], b: T[]): T[] {
        return _.concat(a, b);
    }

    mergeUnique<T>(a: T[], b: T[]): T[] {
        return _.union(a, b);
    }

    equals<T>(a: T[], b: T[]): boolean {
        return _.isEqual(a, b);
    }

    notEquals<T>(a: T[], b: T[]): boolean {
        return !_.isEqual(a, b);
    }

    in<T>(a: T[], b: T[]): boolean {
        return _.intersection(a, b).length > 0;
    }

    notIn<T>(a: T[], b: T[]): boolean {
        return _.intersection(a, b).length === 0;
    }

    intersection<T>(a: T[], b: T[]): T[] {
        return _.intersection(a, b);
    }

    difference<T>(a: T[], b: T[]): T[] {
        return _.difference(a, b);
    }

    includes<T>(a: T[], b: T): boolean {
        return _.includes(a, b);
    }

    chunk<T>(a: T[], size: number): T[][] {
        return _.chunk<T>(a, size);
    }
}
