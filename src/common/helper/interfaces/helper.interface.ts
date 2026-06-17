import { EnumHelperDateDayOf } from '@common/helper/enums/helper.enum';

export interface IHelperPasswordOptions {
    length: number;
}

export interface IHelperDateCreateOptions {
    dayOf?: EnumHelperDateDayOf;
}

export interface IHelperEmailValidation {
    validated: boolean;
    messagePath?: string;
}
