import { z } from 'zod';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';

/** @public */
export const HelloResponseSchema = z.object({
    date: z
        .object({
            iso: z.string().meta({
                description: 'Current server date as an ISO-8601 string',
                example: '2022-08-10T07:22:17.231Z',
            }),
        })
        .meta({
            description: 'Current server date in several representations',
            example: {
                iso: '2022-08-10T07:22:17.231Z',
            },
        }),
    app: z
        .object({
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
        })
        .meta({
            description: 'Application identity and environment',
            example: {
                name: 'Ack NestJS Boilerplate',
                env: EnumAppEnvironment.development,
                timezone: 'UTC',
            },
        }),
    message: z
        .object({
            availableLanguage: z.array(z.enum(EnumMessageLanguage)).meta({
                description: 'Languages the application can serve messages in',
                example: Object.values(EnumMessageLanguage),
            }),
            defaultLanguage: z.enum(EnumMessageLanguage).meta({
                description: 'Default language for application messages',
                example: EnumMessageLanguage.en,
            }),
        })
        .meta({
            description: 'Message language configuration',
            example: {
                availableLanguage: Object.values(EnumMessageLanguage),
                defaultLanguage: EnumMessageLanguage.en,
            },
        }),
});

/** @public */
export type HelloResponseDto = z.infer<typeof HelloResponseSchema>;
