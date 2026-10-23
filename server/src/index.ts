import 'dotenv/config';

import { startServer } from './app.js';

const { url } = await startServer({ port: 4000 });

console.log(`🚀 Server ready at ${url}`);
