export interface IHelperArrayService {
    getLeftByIndex<T>(array: T[], index: number): T;

    getRightByIndex<T>(array: T[], index: number): T;

    getLeftByLength<T>(array: T[], length: number): T[];

    getRightByLength<T>(array: T[], length: number): T[];

    getLast<T>(array: T[]): T;

    getFirst<T>(array: T[]): T;

    getFirstIndexByValue<T>(array: T[], value: T): number;

    getLastIndexByValue<T>(array: T[], value: T): number;

    removeByValue<T>(array: T[], value: T): T[];

    removeLeftByLength<T>(array: T[], length: number): T[];

    removeRightByLength<T>(array: T[], length: number): T[];

    joinToString<T>(array: T[], delimiter: string): string;

    reverse<T>(array: T[]): T[];

    unique<T>(array: T[]): T[];

    shuffle<T>(array: T[]): T[];

    merge<T>(a: T[], b: T[]): T[];

    mergeUnique<T>(a: T[], b: T[]): T[];

    filterNotIncludeByValue<T>(array: T[], value: T): T[];

    filterNotIncludeByArray<T>(a: T[], b: T[]): T[];

    filterIncludeByArray<T>(a: T[], b: T[]): T[];

    equals<T>(a: T[], b: T[]): boolean;

    notEquals<T>(a: T[], b: T[]): boolean;

    in<T>(a: T[], b: T[]): boolean;

    includes<T>(a: T[], b: T): boolean;

    split<T>(a: T[], size: number): T[][];

    getKeys(a: Record<string, any>): string[];

    getValues<T>(a: Record<string, any>): T[];
}
