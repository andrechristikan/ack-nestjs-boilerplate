export interface IHelperNumberService {
    checkString(number: string): boolean;
    randomDigits(length: number): string;
    randomInRange(min: number, max: number): number;
    calculatePercent(value: number, total: number): number;
}
