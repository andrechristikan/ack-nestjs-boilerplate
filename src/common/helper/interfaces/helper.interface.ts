import { ENUM_HELPER_DATE_DAY_OF } from 'src/common/helper/enums/helper.enum';

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

export interface IHelperStringPasswordOptions {
    length: number;
}

export interface IHelperDateCreateOptions {
    dayOf?: ENUM_HELPER_DATE_DAY_OF;
}

export interface IHelperEmailValidation {
    validated: boolean;
    message?: string;
}
