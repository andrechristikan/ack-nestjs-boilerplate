import bytes from 'bytes';
import {
    EnumFileExtension,
    EnumFileExtensionTemplate,
} from '@common/file/enums/file.enum';

export const FileSizeInBytes: number = bytes('10mb') ?? 0;

export const FileMaxMultiple: number = 3;

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
