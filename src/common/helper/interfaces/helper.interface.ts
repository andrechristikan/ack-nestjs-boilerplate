import { ENUM_HELPER_DATE_DAY_OF } from 'src/common/helper/enums/helper.enum';

// Helper Encryption
export interface IHelperJwtVerifyOptions {
    audience: string;
    issuer: string;
    subject: string;
    secretKey: string;
    ignoreExpiration?: boolean;
}

export interface IHelperJwtOptions
    extends Omit<IHelperJwtVerifyOptions, 'ignoreExpiration'> {
    expiredIn: number | string;
    notBefore?: number | string;
}

// Helper String

export interface IHelperStringPasswordOptions {
    length: number;
}

// Helper Date
export interface IHelperDateCreateOptions {
    dayOf?: ENUM_HELPER_DATE_DAY_OF;
}

export interface IHelperDateRoundDownOptions {
    hour: boolean;
    minute: boolean;
    second: boolean;
    millisecond: boolean;
}
