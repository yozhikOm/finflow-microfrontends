// Одноразовая миграция дат транзакций в календарный день (ADR-0003):
// `npm run migrate:transaction-dates`. Повторный запуск безопасен.
// Пояс берётся из USER_TIME_ZONE, тот же, в котором server считает «сегодня».
import 'dotenv/config';

import { userTimeZone } from '../config.js';
import { connectToDatabase, disconnectFromDatabase } from '../db/connection.js';
import { migrateTransactionDates } from './transaction-dates.js';

const timeZone = userTimeZone();

await connectToDatabase();

try {
  const migrated = await migrateTransactionDates({ timeZone });

  console.log(`Migrated ${migrated} transaction dates to ${timeZone} days`);
} finally {
  await disconnectFromDatabase();
}
