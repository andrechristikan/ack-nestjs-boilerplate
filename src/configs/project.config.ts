import { registerAs } from '@nestjs/config';

export interface IConfigProject {
    slugPrefix: string;
    slugMaxLength: number;
    slugMaxAttempts: number;
    deletedSlugPattern: string;
    delete: {
        chunkSize: number;
    };
}

export default registerAs('project', (): IConfigProject => ({
    slugPrefix: 'p-',
    slugMaxLength: 30,
    slugMaxAttempts: 5,
    deletedSlugPattern: 'deleted-{id}',
    delete: {
        chunkSize: 100,
    },
}));
