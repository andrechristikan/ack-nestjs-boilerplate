import { EnumHelperDateDayOf } from '@common/helper/enums/helper.enum';

/**
 * Options for password strength validation.
 */
export interface IHelperPasswordOptions {
    /**
     * Minimum required character length for the password.
     */
    length: number;
}

/**
 * Options for date creation helpers that support day-boundary snapping.
 */
export interface IHelperDateCreateOptions {
    /**
     * When provided, snaps the resulting date to the start or end of the day.
     * Omitting this field leaves the time component unchanged.
     */
    dayOf?: EnumHelperDateDayOf;
}

/**
 * Result returned by email address validation helpers.
 */
export interface IHelperEmailValidation {
    /**
     * True when the email address passed all validation checks.
     */
    validated: boolean;

    /**
     * i18n message path describing the specific validation failure.
     * Only present when `validated` is `false`.
     */
    messagePath?: string;
}
