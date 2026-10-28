import { EnumFileExtension } from '@common/file/enums/file.enum';
import type { IFileExtensionContracts } from '@common/file/interfaces/file.interface';

/**
 * Sniffed file types accepted for each declared upload extension; an empty list marks an extension with no magic-byte signature.
 * @public
 */
export const FileExtensionContract: IFileExtensionContracts = {
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
