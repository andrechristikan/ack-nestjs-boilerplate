export enum ENUM_USER_STATUS_CODE_ERROR {
    USER_NOT_FOUND_ERROR = 5400,
    USER_EXISTS_ERROR = 5401,
    USER_IS_INACTIVE_ERROR = 5402,
    USER_EMAIL_EXIST_ERROR = 5403,
    USER_MOBILE_NUMBER_EXIST_ERROR = 5404,
    USER_ACTIVE_ERROR = 5405,
}

export const USER_ACTIVE_META_KEY = 'UserActiveMetaKey';
export const USER_DEFAULT_PAGE = 1;
export const USER_DEFAULT_PER_PAGE = 10;
export const USER_DEFAULT_SORT = 'name@asc';
export const USER_DEFAULT_AVAILABLE_SORT = [
    'firstName',
    'lastName',
    'email',
    'mobileNumber',
    'createdAt',
];
export const USER_DEFAULT_AVAILABLE_SEARCH = [
    'firstName',
    'lastName',
    'email',
    'mobileNumber',
];
