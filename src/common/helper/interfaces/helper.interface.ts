import { ENUM_HELPER_DATE_DAY_OF } from '@common/helper/enums/helper.enum';

export interface IHelperPasswordOptions {
    length: number;
}

export interface IHelperDateCreateOptions {
    dayOf?: ENUM_HELPER_DATE_DAY_OF;
}

export interface IHelperEmailValidation {
    validated: boolean;
    messagePath?: string;
}
