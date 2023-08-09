import { registerAs } from '@nestjs/config';

export default registerAs(
    'graphql',
    (): Record<string, any> => ({
        debug: `${process.env.ENABLE_DEBUG}`,
        schemaDestination: `${process.env.SCHEMA_DESTINATION}`,
        sortSchema: `${process.env.SORT_SCHEMA}`,

    })
);
