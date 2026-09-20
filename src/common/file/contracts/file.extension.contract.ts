import {
    EnumFileExtension,
    EnumFileExtensionTemplate,
} from '@common/file/enums/file.enum';

/**
 * Sniffed file types accepted for each declared upload extension; an empty list marks an extension with no magic-byte signature.
 * @public
 */
export const FileExtensionContract: Readonly<
    Record<
        Exclude<EnumFileExtension, EnumFileExtensionTemplate>,
        readonly string[]
    >
> = {
    [EnumFileExtension.jpg]: ['jpg'],
    [EnumFileExtension.jpeg]: ['jpg'],
    [EnumFileExtension.png]: ['png'],
    [EnumFileExtension.pdf]: ['pdf'],
    [EnumFileExtension.mp3]: ['mp3'],
    [EnumFileExtension.m4a]: ['m4a'],
    [EnumFileExtension.mp4]: ['mp4'],
    [EnumFileExtension.mpeg]: ['mp3'],
    [EnumFileExtension.csv]: [],
};
