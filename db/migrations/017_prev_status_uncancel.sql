-- 017 — Reverter cancelamento.
-- Guarda o status que o documento tinha ANTES de ser cancelado, para que o
-- "Reverter cancelamento" devolva o projeto exatamente ao ponto onde parou
-- (proposta publicada volta publicada, contrato assinado volta assinado…).
-- NULL = cancelado antes desta migração (o reverter cai no padrão sensato).
ALTER TABLE proposals ADD COLUMN prev_status TEXT;
ALTER TABLE briefings ADD COLUMN prev_status TEXT;
ALTER TABLE contracts ADD COLUMN prev_status TEXT;
