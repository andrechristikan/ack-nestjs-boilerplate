export enum EnumFileExtensionImage {
    jpg = 'jpg',
    jpeg = 'jpeg',
    png = 'png',
}

export enum EnumFileExtensionDocument {
    pdf = 'pdf',
    csv = 'csv',
}

export enum EnumFileExtensionTemplate {
    hbs = 'hbs',
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
    ...EnumFileExtensionAudio,
    ...EnumFileExtensionVideo,
    ...EnumFileExtensionTemplate,
};

export type ENUM_FILE_EXTENSION =
    | EnumFileExtensionImage
    | EnumFileExtensionDocument
    | EnumFileExtensionAudio
    | EnumFileExtensionVideo
    | EnumFileExtensionTemplate;
