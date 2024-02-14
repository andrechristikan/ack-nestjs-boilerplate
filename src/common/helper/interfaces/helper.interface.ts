import {
    ENUM_HELPER_DATE_DIFF,
    ENUM_HELPER_DATE_FORMAT,
} from 'src/common/helper/constants/helper.enum.constant';

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
export interface IHelperStringRandomOptions {
    upperCase?: boolean;
    safe?: boolean;
}

export interface IHelperStringCurrencyOptions {
    locale?: string;
}

export interface IHelperStringPasswordOptions {
    length: number;
}

// Helper Date
export interface IHelperDateSetTimeOptions {
    hour?: number;
    minute?: number;
    second?: number;
    millisecond?: number;
}

export interface IHelperDateDiffOptions {
    format?: ENUM_HELPER_DATE_DIFF;
}

export interface IHelperDateCreateOptions {
    startOfDay?: boolean;
}

export interface IHelperDateFormatOptions {
    format?: ENUM_HELPER_DATE_FORMAT | string;
}

export interface IHelperDateForwardOptions {
    fromDate?: Date;
}

export type IHelperDateBackwardOptions = IHelperDateForwardOptions;

export interface IHelperDateRoundDownOptions {
    hour: boolean;
    minute: boolean;
    second: boolean;
    millisecond: boolean;
}

// Helper File

export interface IHelperFileRows<T = any> {
    data: T[];
    sheetName?: string;
}

export interface IHelperFileReadOptions {
    password?: string;
}

// Helper google

export interface IHelperGooglePayload {
    email: string;
}

export interface IHelperGoogleRefresh {
    accessToken: string;
}
