export interface IAuthEnumService {
    getAccessFor(): Promise<string[]>;
}
