import { IHelperFileRows } from 'src/common/helper/interfaces/helper.interface';

export type IFile = Omit<Express.Multer.File, 'filename'>;

export type IFileExtract<T> = IFile & {
    extract: IHelperFileRows[];
    dto?: T[];
};

export type IFileExtractAllSheets<T> = IFile & {
    extracts: IHelperFileRows[][];
    dto?: T[][];
};
