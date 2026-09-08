import { registerAs } from '@nestjs/config';

export interface IConfigProject {
    slugPrefix: string;
    slugRegex: RegExp;
    slugMaxLength: number;
    slugMaxAttempts: number;
}

export default registerAs('project', (): IConfigProject => ({
    slugPrefix: 'p-',
    slugRegex: /^[0-9a-zA-Z-]+$/,
    slugMaxLength: 30,
    slugMaxAttempts: 5,
}));
