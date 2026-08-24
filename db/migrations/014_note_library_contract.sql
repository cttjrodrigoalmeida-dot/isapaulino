-- Notas da biblioteca podem ser vinculadas a um projeto (contrato) de cliente.
ALTER TABLE note_library ADD COLUMN contract_id TEXT;
