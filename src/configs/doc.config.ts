import { registerAs } from '@nestjs/config';

export interface IConfigDoc {
    name: string;
    description: string;
    prefix: string;
}

export default registerAs(
    'doc',
    (): IConfigDoc => ({
        name: `${process.env.APP_NAME ?? 'ACKNestJs'} APIs Specification`,
        description: 'Section for describe whole APIs',
        prefix: '/docs',
    })
);
