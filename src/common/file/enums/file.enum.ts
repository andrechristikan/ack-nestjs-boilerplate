export enum ENUM_FILE_EXTENSION_IMAGE {
    jpg = 'jpg',
    jpeg = 'jpeg',
    png = 'png',
}

export enum ENUM_FILE_EXTENSION_DOCUMENT {
    pdf = 'pdf',
    hbs = 'hbs',
}

export enum ENUM_FILE_EXTENSION_EXCEL {
    xlsx = 'xlsx',
    csv = 'csv',
}

export enum ENUM_FILE_EXTENSION_AUDIO {
    mpeg = 'mpeg',
    m4a = 'm4a',
    mp3 = 'mp3',
}

export enum ENUM_FILE_EXTENSION_VIDEO {
    mp4 = 'mp4',
}

export const ENUM_FILE_EXTENSION = {
    ...ENUM_FILE_EXTENSION_IMAGE,
    ...ENUM_FILE_EXTENSION_DOCUMENT,
    ...ENUM_FILE_EXTENSION_EXCEL,
    ...ENUM_FILE_EXTENSION_AUDIO,
    ...ENUM_FILE_EXTENSION_VIDEO,
};

export type ENUM_FILE_EXTENSION =
    | ENUM_FILE_EXTENSION_IMAGE
    | ENUM_FILE_EXTENSION_DOCUMENT
    | ENUM_FILE_EXTENSION_EXCEL
    | ENUM_FILE_EXTENSION_AUDIO
    | ENUM_FILE_EXTENSION_VIDEO;
