-- Read-only Phase 3 production preflight. This file must return zero duplicate
-- groups and zero rows requiring reconciliation before migration 0023 is run.
SELECT COUNT(*) AS total_claim_rows FROM daily_ghost_claims;

SELECT COUNT(*) AS duplicate_user_day_groups
FROM (
  SELECT user_id,claim_date
  FROM daily_ghost_claims
  GROUP BY user_id,claim_date
  HAVING COUNT(*) > 1
);

SELECT COALESCE(SUM(row_count - 1),0) AS rows_requiring_reconciliation
FROM (
  SELECT COUNT(*) AS row_count
  FROM daily_ghost_claims
  GROUP BY user_id,claim_date
  HAVING COUNT(*) > 1
);

SELECT
  c.user_id,
  c.claim_date,
  COUNT(*) AS claim_rows,
  SUM(c.reward_value) AS recorded_reward_value,
  GROUP_CONCAT(c.id) AS claim_ids
FROM daily_ghost_claims c
GROUP BY c.user_id,c.claim_date
HAVING COUNT(*) > 1
ORDER BY c.claim_date,c.user_id;

SELECT
  c.user_id,
  c.claim_date,
  c.id AS claim_id,
  c.reward_value,
  t.id AS ledger_id,
  t.amount AS ledger_amount,
  t.source
FROM daily_ghost_claims c
LEFT JOIN ghost_credit_transactions t
  ON t.user_id=c.user_id AND t.activity_id=c.id
WHERE EXISTS (
  SELECT 1
  FROM daily_ghost_claims d
  WHERE d.user_id=c.user_id AND d.claim_date=c.claim_date
  GROUP BY d.user_id,d.claim_date
  HAVING COUNT(*) > 1
)
ORDER BY c.claim_date,c.user_id,c.created_at,c.id;
