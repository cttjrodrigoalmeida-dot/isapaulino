-- Checklist manual de ambientes no "Meu apoio" do editor de briefing (admin).
-- JSON: [{ "id": "...", "label": "COZINHA", "done": false }, ...]
ALTER TABLE briefings ADD COLUMN editor_checklist TEXT;
