import type { argon2 } from 'node:crypto';
import { EnumHelperDateDayOf } from '@common/helper/enums/helper.enum';

export interface IHelperDateCreateOptions {
    dayOf?: EnumHelperDateDayOf;
}

export type IHelperHashArgon2Parameters = Parameters<typeof argon2>[1];
