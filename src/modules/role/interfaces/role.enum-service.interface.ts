export interface IRoleEnumService {
    getAccessFor(): Promise<string[]>;
}
