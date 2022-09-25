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
}

export interface IHelperJwtOptions extends IHelperJwtVerifyOptions {
    expiredIn: number | string;
    notBefore?: number | string;
}

// Helper String
export interface IHelperStringRandomOptions {
    upperCase?: boolean;
    safe?: boolean;
    prefix?: string;
}

// Helper Geo
export interface IHelperGeoCurrent {
    latitude: number;
    longitude: number;
}

export interface IHelperGeoRules extends IHelperGeoCurrent {
    radiusInMeters: number;
}

// Helper Date
export interface IHelperDateOptionsDiff {
    format?: ENUM_HELPER_DATE_DIFF;
}

export interface IHelperDateOptionsCreate {
    date?: string | number | Date;
}

export interface IHelperDateOptionsFormat {
    format?: ENUM_HELPER_DATE_FORMAT | string;
}

export interface IHelperDateOptionsForward {
    fromDate?: Date;
}

export type IHelperDateOptionsBackward = IHelperDateOptionsForward;

export interface IHelperDateOptionsMonth {
    year?: number;
}

// Helper File

export type IHelperFileExcelRows = Record<string, string | number>;
