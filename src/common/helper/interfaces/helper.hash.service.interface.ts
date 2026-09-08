export interface IHelperHashService {
    bcryptGenerateSalt(length: number): string;
    bcryptHash(passwordString: string, salt: string): string;
    bcryptCompare(passwordString: string, passwordHashed: string): boolean;
    sha256Hash(string: string): string;
    sha256Compare(hashOne: string, hashTwo: string): boolean;
    md5Hash(string: string): string;
    md5Compare(hashOne: string, hashTwo: string): boolean;
}
