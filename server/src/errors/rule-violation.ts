import { GraphQLError } from 'graphql';

// Значения `enum RuleViolation` (ADR-0015): из этого списка строится enum
// схемы. Новое правило добавляется сюда и в тест поведения.
export const RULE_VIOLATIONS = [
  'AMOUNT_NOT_POSITIVE',
  'DATE_IN_FUTURE',
  'CATEGORY_REQUIRED',
  'CATEGORY_NOT_ALLOWED',
  'TARGET_ACCOUNT_REQUIRED',
  'TARGET_ACCOUNT_NOT_ALLOWED',
  'SAME_ACCOUNT',
  'TYPE_IMMUTABLE',
  'TARGET_AMOUNT_REQUIRED',
  'TARGET_AMOUNT_NOT_ALLOWED',
  'TARGET_AMOUNT_MISMATCH',
  'ACCOUNT_NAME_TAKEN',
  'NOT_FOUND',
] as const;

export type RuleViolation = (typeof RULE_VIOLATIONS)[number];

// Отказ по доменному правилу, а не сбой (ADR-0014, ADR-0015): клиент отличает
// его по `extensions.code`, а текст для пользователя пишет сам по `rule`.
// `field` — имя поля input-типа схемы, к которому относится отказ.
export const ruleViolation = (
  rule: RuleViolation,
  message: string,
  field?: string,
) =>
  new GraphQLError(message, {
    extensions: { code: 'RULE_VIOLATION', rule, ...(field && { field }) },
  });
