/**
 * Specifies which boundary of a day to snap a date to during creation.
 * Used by date helper options to anchor a date to midnight (start) or 23:59:59.999 (end).
 */
export enum EnumHelperDateDayOf {
    start = 'start',
    end = 'end',
}
