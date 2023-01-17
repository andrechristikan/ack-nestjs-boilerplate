export interface IHelperNumberService {
    check(number: string): boolean;

    create(number: string): number;

    random(length: number): number;

    randomInRange(min: number, max: number): number;

    percent(value: number, total: number): number;
}
