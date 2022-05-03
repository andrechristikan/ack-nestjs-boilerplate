export interface IHelperJwtOptions {
    expiredIn?: string;
    notBefore?: string;
    secretKey?: string;
}

export interface IHelperStringRandomOptions {
    upperCase?: boolean;
    safe?: boolean;
    prefix?: string;
}
