import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';

const HelloDateResponseSchema = z.object({
    date: z.date().meta({
        description: 'Current server date as a Date object',
        example: faker.date.recent(),
    }),
    iso: z.string().meta({
        description: 'Current server date as an ISO-8601 string',
        example: '2022-08-10T07:22:17.231Z',
    }),
    timestamp: z.number().meta({
        description: 'Current server date as a Unix timestamp in milliseconds',
        example: 1660190937231,
    }),
});

const HelloAppResponseSchema = z.object({
    name: z.string().meta({
        description: 'Application name',
        example: 'Ack NestJS Boilerplate',
    }),
    env: z.enum(EnumAppEnvironment).meta({
        description: 'Runtime environment of the application',
        example: EnumAppEnvironment.development,
    }),
    timezone: z.string().meta({
        description: 'Timezone the application clock uses',
        example: 'UTC',
    }),
});

const HelloMessageResponseSchema = z.object({
    availableLanguage: z.array(z.enum(EnumMessageLanguage)).meta({
        description: 'Languages the application can serve messages in',
        example: Object.values(EnumMessageLanguage),
    }),
    defaultLanguage: z.enum(EnumMessageLanguage).meta({
        description: 'Default language for application messages',
        example: EnumMessageLanguage.en,
    }),
});

/** Response shape of the public hello endpoint. */
export const HelloResponseSchema = z.object({
    date: HelloDateResponseSchema.meta({
        description: 'Current server date in several representations',
        example: {
            date: faker.date.recent(),
            iso: '2022-08-10T07:22:17.231Z',
            timestamp: 1660190937231,
        },
    }),
    app: HelloAppResponseSchema.meta({
        description: 'Application identity and environment',
        example: {
            name: 'Ack NestJS Boilerplate',
            env: EnumAppEnvironment.development,
            timezone: 'UTC',
        },
    }),
    message: HelloMessageResponseSchema.meta({
        description: 'Message language configuration',
        example: {
            availableLanguage: Object.values(EnumMessageLanguage),
            defaultLanguage: EnumMessageLanguage.en,
        },
    }),
});

export type HelloResponseDto = z.infer<typeof HelloResponseSchema>;
