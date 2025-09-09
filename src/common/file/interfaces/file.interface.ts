export type IFile = Express.Multer.File;

export interface IFileSheet<T> {
    data: T[];
    sheetName?: string;
}

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
    prefix?: string;
    mime: string;
    randomLength?: number;
}
