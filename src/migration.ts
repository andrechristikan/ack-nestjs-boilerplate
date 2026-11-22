import '@instrument';

const { bootstrapMigration, bootstrapFailed } = await import('@bootstrap');

bootstrapMigration().catch(bootstrapFailed);
