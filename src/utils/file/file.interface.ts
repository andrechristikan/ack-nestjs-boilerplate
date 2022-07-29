import { ClassConstructor } from 'class-transformer';
import { ENUM_FILE_TYPE } from './file.constant';

export type IFile = Express.Multer.File;

export interface IFileOptions {
    type?: ENUM_FILE_TYPE;
    required?: boolean;
    extract?: boolean;
    dto?: ClassConstructor<any>;
}

export interface IFileImageOptions {
    required?: boolean;
}

export interface IFileExcelOptions {
    required?: boolean;
    extract?: boolean;
    dto?: ClassConstructor<any>;
}
