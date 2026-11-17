import '@instrument';

const { bootstrapApplication, bootstrapFailed } = await import('@bootstrap');

bootstrapApplication().catch(bootstrapFailed);
