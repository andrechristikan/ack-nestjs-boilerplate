export type IFile = Express.Multer.File;

export interface IFileRows<T = any> {
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
