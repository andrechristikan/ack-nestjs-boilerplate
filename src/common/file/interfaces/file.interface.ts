import { IHelperFileRows } from 'src/common/helper/interfaces/helper.interface';

export interface IFile extends Omit<Express.Multer.File, 'filename'> {
    password?: string;
}

export type IFileExtract<T = any> = IFile & {
    extracts: IHelperFileRows<T>[];
};

export interface IFileMultipleField {
    field: string;
    maxFiles: number;
}

export interface IFileExtractOptions {
    password?: string;
}
