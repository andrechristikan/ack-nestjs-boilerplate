import {
    ENUM_HELPER_DATE_DIFF,
    ENUM_HELPER_DATE_FORMAT,
} from './constants/helper.enum.constant';

// Helper Encryption
export interface IHelperJwtVerifyOptions {
    secretKey: string;
}

export interface IHelperJwtOptions {
    expiredIn: string;
    notBefore?: string;
    secretKey: string;
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
export interface IHelperDateOptions {
    timezone?: string;
}

export interface IHelperDateOptionsDiff extends IHelperDateOptions {
    format?: ENUM_HELPER_DATE_DIFF;
}

export interface IHelperDateOptionsCreate extends IHelperDateOptions {
    date?: string | number | Date;
}

export interface IHelperDateOptionsFormat extends IHelperDateOptions {
    format?: ENUM_HELPER_DATE_FORMAT | string;
}

export interface IHelperDateOptionsForward extends IHelperDateOptions {
    fromDate?: Date;
}

export type IHelperDateOptionsBackward = IHelperDateOptionsForward;

export interface IHelperDateOptionsMonth extends IHelperDateOptions {
    year?: number;
}

// Helper File

export type IHelperFileExcelRows = Record<string, string | number>;
