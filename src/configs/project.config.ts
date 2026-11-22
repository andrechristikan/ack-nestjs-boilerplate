import { registerAs } from '@nestjs/config';

export interface IConfigProject {
    slugPrefix: string;
    slugRegex: RegExp;
    slugMaxLength: number;
    slugMaxAttempts: number;
    deletedSlugPattern: string;
}

export default registerAs('project', (): IConfigProject => ({
    slugPrefix: 'p-',
    slugRegex: /^[0-9a-z-]+$/,
    slugMaxLength: 30,
    slugMaxAttempts: 5,
    deletedSlugPattern: 'deleted-{id}',
}));
