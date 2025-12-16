import { EnumFileExtension } from '@common/file/enums/file.enum';

export type IFile = Express.Multer.File;

export interface IFileUploadSingle {
    field: string;
    fileSize: number;
}

export interface IFileUploadMultiple extends IFileUploadSingle {
    maxFiles: number;
}

export type IFileUploadMultipleField = Omit<IFileUploadMultiple, 'fileSize'>;

export type IFileUploadMultipleFieldOptions = Pick<
    IFileUploadSingle,
    'fileSize'
>;

export type IFileInput = IFile | IFile[];

export interface IFileRandomFilenameOptions {
    path?: string;
    prefix?: string;
    extension: EnumFileExtension;
    randomLength?: number;
}
