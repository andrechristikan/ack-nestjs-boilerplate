import { IHelperArrayRemove } from 'src/common/helper/interfaces/helper.interface';

export interface IHelperArrayService {
    getLeftByIndex<T>(array: T[], index: number): T;

    getRightByIndex<T>(array: T[], index: number): T;

    getLeftByLength<T>(array: T[], length: number): T[];

    getRightByLength<T>(array: T[], length: number): T[];

    getLast<T>(array: T[]): T;

    getFirst<T>(array: T[]): T;

    getFirstIndexByValue<T>(array: T[], value: T): number;

    getLastIndexByValue<T>(array: T[], value: T): number;

    removeByValue<T>(array: T[], value: T): IHelperArrayRemove<T>;

    removeLeftByLength<T>(array: T[], length: number): T[];

    removeRightByLength<T>(array: Array<T>, length: number): T[];

    joinToString<T>(array: Array<T>, delimiter: string): string;

    reverse<T>(array: T[]): T[];

    unique<T>(array: T[]): T[];

    shuffle<T>(array: T[]): T[];

    merge<T>(a: T[], b: T[]): T[];

    mergeUnique<T>(a: T[], b: T[]): T[];

    filterIncludeByValue<T>(array: T[], value: T): T[];

    filterNotIncludeByValue<T>(array: T[], value: T): T[];

    filterNotIncludeUniqueByArray<T>(a: T[], b: T[]): T[];

    filterIncludeUniqueByArray<T>(a: T[], b: T[]): T[];

    equals<T>(a: T[], b: T[]): boolean;

    notEquals<T>(a: T[], b: T[]): boolean;

    in<T>(a: T[], b: T[]): boolean;

    notIn<T>(a: T[], b: T[]): boolean;

    includes<T>(a: T[], b: T): boolean;

    chunk<T>(a: T[], size: number): T[][];
}
