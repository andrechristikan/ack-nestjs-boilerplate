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

export interface IGeoCurrent {
    latitude: number;
    longitude: number;
}

export interface IGeoRules extends IGeoCurrent {
    inRadius: number;
}
