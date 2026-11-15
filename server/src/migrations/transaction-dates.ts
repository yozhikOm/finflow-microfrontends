import { calendarDayIn } from '../calendar-day.js';
import { TransactionModel } from '../modules/transactions/transaction.model.js';

/**
 * Переводит даты транзакций, сохранённые моментом UTC (`Date`), в календарный
 * день `YYYY-MM-DD` так, как его видел пользователь в поясе `timeZone`
 * (ADR-0003). Записи, где дата уже строка, не трогает, поэтому повторный
 * запуск безопасен. Возвращает число переведённых записей.
 *
 * Работает с коллекцией напрямую: схема Mongoose уже объявляет `date` строкой
 * и привела бы старое значение к строке по-своему.
 */
export const migrateTransactionDates = async ({
  timeZone,
}: {
  timeZone: string;
}): Promise<number> => {
  const collection = TransactionModel.collection;
  const legacy = await collection
    .find({ date: { $type: 'date' } }, { projection: { date: 1 } })
    .toArray();

  if (legacy.length === 0) return 0;

  const result = await collection.bulkWrite(
    legacy.map(({ _id, date }) => ({
      updateOne: {
        // Условие на тип ещё раз: параллельный запуск не перепишет запись дважды.
        filter: { _id, date: { $type: 'date' } },
        update: { $set: { date: calendarDayIn(date, timeZone) } },
      },
    })),
  );

  return result.modifiedCount;
};
