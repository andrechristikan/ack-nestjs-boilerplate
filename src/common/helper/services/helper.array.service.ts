import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import { IHelperArrayService } from 'src/common/helper/interfaces/helper.array-service.interface';

@Injectable()
export class HelperArrayService implements IHelperArrayService {
    getLeftByIndex<T>(array: T[], index: number): T {
        return _.nth(array, index);
    }

    getRightByIndex<T>(array: T[], index: number): T {
        return _.nth(array, -Math.abs(index));
    }

    getLeftByLength(array: Array<any>, length: number): Array<any> {
        return _.take(array, length);
    }

    getRightByLength(array: Array<any>, length: number): Array<any> {
        return _.takeRight(array, length);
    }

    getLast<T>(array: T[]): T {
        return _.last(array);
    }

    getFirst<T>(array: T[]): T {
        return _.head(array);
    }

    getFirstIndexByValue<T>(array: T[], value: T): number {
        return _.indexOf(array, value);
    }

    getLastIndexByValue<T>(array: T[], value: T): number {
        return _.lastIndexOf(array, value);
    }

    removeByValue<T>(array: T[], value: T): T[] {
        return _.remove(array, function (n) {
            return n === value;
        });
    }

    removeLeftByLength(array: Array<any>, length: number) {
        return _.drop(array, length);
    }

    removeRightByLength(array: Array<any>, length: number) {
        return _.dropRight(array, length);
    }

    joinToString(array: Array<any>, delimiter: string): string {
        return _.join(array, delimiter);
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

    filterNotIncludeByValue<T>(array: T[], value: T): T[] {
        return _.without(array, value);
    }

    filterNotIncludeByArray<T>(a: T[], b: T[]): T[] {
        return _.xor(a, b);
    }

    filterIncludeByArray<T>(a: T[], b: T[]): T[] {
        return _.intersection(a, b);
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

    includes<T>(a: T[], b: T): boolean {
        return _.includes(a, b);
    }

    chunk<T>(a: T[], size: number): Array<T[]> {
        return _.chunk(a, size);
    }
}
