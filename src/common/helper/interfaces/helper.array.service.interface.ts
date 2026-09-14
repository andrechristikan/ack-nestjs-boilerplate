export interface IHelperArrayService {
    unique<T>(array: T[]): T[];
    shuffle<T>(array: T[]): T[];
    chunk<T>(a: T[], size: number): T[][];
    intersection<T>(a: T[], b: T[]): T[];
}
