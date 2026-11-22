/** @public */
export enum EnumFileExtensionImage {
    jpg = 'jpg',
    jpeg = 'jpeg',
    png = 'png',
}

/** @public */
export enum EnumFileExtensionDocument {
    pdf = 'pdf',
    csv = 'csv',
}

/** @public */
export enum EnumFileExtensionTemplate {
    hbs = 'hbs',
}

/** @public */
export enum EnumFileExtensionAudio {
    mpeg = 'mpeg',
    m4a = 'm4a',
    mp3 = 'mp3',
}

/** @public */
export enum EnumFileExtensionVideo {
    mp4 = 'mp4',
}

/** @public */
export const EnumFileExtension = {
    ...EnumFileExtensionImage,
    ...EnumFileExtensionDocument,
    ...EnumFileExtensionAudio,
    ...EnumFileExtensionVideo,
    ...EnumFileExtensionTemplate,
};

/** @public */
export type EnumFileExtension =
    | EnumFileExtensionImage
    | EnumFileExtensionDocument
    | EnumFileExtensionAudio
    | EnumFileExtensionVideo
    | EnumFileExtensionTemplate;
