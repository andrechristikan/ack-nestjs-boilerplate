/**
 * Image file extensions the kit accepts.
 * @public
 */
export enum EnumFileExtensionImage {
    jpg = 'jpg',
    jpeg = 'jpeg',
    png = 'png',
}

/**
 * Document file extensions the kit accepts.
 * @public
 */
export enum EnumFileExtensionDocument {
    pdf = 'pdf',
    csv = 'csv',
}

/**
 * Template file extensions the kit accepts.
 * @public
 */
export enum EnumFileExtensionTemplate {
    hbs = 'hbs',
}

/**
 * Audio file extensions the kit accepts.
 * @public
 */
export enum EnumFileExtensionAudio {
    mpeg = 'mpeg',
    m4a = 'm4a',
    mp3 = 'mp3',
}

/**
 * Video file extensions the kit accepts.
 * @public
 */
export enum EnumFileExtensionVideo {
    mp4 = 'mp4',
}

/**
 * Every file extension the kit accepts, merged from the per-kind enums.
 * @public
 */
export const EnumFileExtension = {
    ...EnumFileExtensionImage,
    ...EnumFileExtensionDocument,
    ...EnumFileExtensionAudio,
    ...EnumFileExtensionVideo,
    ...EnumFileExtensionTemplate,
};

/**
 * Union of every file extension value the kit accepts.
 * @public
 */
export type EnumFileExtension =
    | EnumFileExtensionImage
    | EnumFileExtensionDocument
    | EnumFileExtensionAudio
    | EnumFileExtensionVideo
    | EnumFileExtensionTemplate;
