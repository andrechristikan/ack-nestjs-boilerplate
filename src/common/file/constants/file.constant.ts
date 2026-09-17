import bytes from 'bytes';
import {
    EnumFileExtension,
    EnumFileExtensionTemplate,
} from '@common/file/enums/file.enum';

/**
 * Default maximum size of one uploaded file.
 * @public
 */
export const FileSizeInBytes: number = bytes('10mb') ?? 0;

/**
 * Default maximum number of files in one multiple-file upload.
 * @public
 */
export const FileMaxMultiple: number = 3;

/**
 * Sniffed file types accepted for each declared upload extension; an empty list marks an extension with no magic-byte signature.
 * @public
 */
export const FileExtensionSignatures: Readonly<
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
