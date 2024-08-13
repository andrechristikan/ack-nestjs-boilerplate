export enum ENUM_FILE_TYPE {
    AUDIO = 'audio',
    IMAGE = 'image',
    EXCEL = 'excel',
    VIDEO = 'video',
}

export enum ENUM_FILE_MIME_IMAGE {
    JPG = 'image/jpg',
    JPEG = 'image/jpeg',
    PNG = 'image/png',
}

export enum ENUM_FILE_MIME_DOCUMENT {
    PDF = 'application/pdf',
}

export enum ENUM_FILE_MIME_EXCEL {
    XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    CSV = 'text/csv',
}

export enum ENUM_FILE_MIME_AUDIO {
    MPEG = 'audio/mpeg',
    MP3 = 'audio/mp3',
}

export enum ENUM_FILE_MIME_VIDEO {
    M4A = 'audio/x-m4a',
    MP4 = 'video/mp4',
}

export const ENUM_FILE_MIME = {
    ...ENUM_FILE_MIME_IMAGE,
    ...ENUM_FILE_MIME_DOCUMENT,
    ...ENUM_FILE_MIME_EXCEL,
    ...ENUM_FILE_MIME_AUDIO,
    ...ENUM_FILE_MIME_VIDEO,
};

export type ENUM_FILE_MIME =
    | ENUM_FILE_MIME_IMAGE
    | ENUM_FILE_MIME_DOCUMENT
    | ENUM_FILE_MIME_EXCEL
    | ENUM_FILE_MIME_AUDIO
    | ENUM_FILE_MIME_VIDEO;
