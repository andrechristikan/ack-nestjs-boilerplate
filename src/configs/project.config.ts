import { registerAs } from '@nestjs/config';

export interface IConfigProject {
    slugPrefix: string;
    slugPattern: RegExp;
    slugMaxLength: number;
    slugMaxAttempts: number;
}

export default registerAs('project', (): IConfigProject => ({
    slugPrefix: 'p-',
    slugPattern: /^[0-9a-zA-Z-]+$/,
    slugMaxLength: 30,
    slugMaxAttempts: 5,
}));
