export enum EnumFileExtensionImage {
    jpg = 'jpg',
    jpeg = 'jpeg',
    png = 'png',
}

export enum EnumFileExtensionDocument {
    pdf = 'pdf',
    hbs = 'hbs',
}

export enum EnumFileExtensionExcel {
    xlsx = 'xlsx',
    csv = 'csv',
}

export enum EnumFileExtensionAudio {
    mpeg = 'mpeg',
    m4a = 'm4a',
    mp3 = 'mp3',
}

export enum EnumFileExtensionVideo {
    mp4 = 'mp4',
}

export const ENUM_FILE_EXTENSION = {
    ...EnumFileExtensionImage,
    ...EnumFileExtensionDocument,
    ...EnumFileExtensionExcel,
    ...EnumFileExtensionAudio,
    ...EnumFileExtensionVideo,
};

export type ENUM_FILE_EXTENSION =
    | EnumFileExtensionImage
    | EnumFileExtensionDocument
    | EnumFileExtensionExcel
    | EnumFileExtensionAudio
    | EnumFileExtensionVideo;
