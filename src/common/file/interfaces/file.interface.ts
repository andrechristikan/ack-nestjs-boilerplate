export type IFile = Express.Multer.File;

export interface IFileRows<T = any> {
    data: T[];
    sheetName?: string;
}

export interface IFileReadOptions {
    password?: string;
}

export interface IFileUploadSingle {
    field: string;
    fileSize: number;
}

export interface IFileUploadMultiple extends IFileUploadSingle {
    maxFiles: number;
}

export interface IFileUploadMultipleField
    extends Omit<IFileUploadMultiple, 'fileSize'> {}

export interface IFileUploadMultipleFieldOptions
    extends Pick<IFileUploadSingle, 'fileSize'> {}
