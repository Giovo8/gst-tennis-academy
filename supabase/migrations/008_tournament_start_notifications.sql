-- Funzione per notificare quando un torneo inizia
CREATE OR REPLACE FUNCTION notify_tournament_start()
RETURNS TRIGGER AS $$
DECLARE
  participant_record RECORD;
BEGIN
  -- Se lo status cambia in "In corso" o "In Corso"
  IF NEW.status IN ('In corso', 'In Corso') AND (OLD.status IS NULL OR OLD.status != NEW.status) THEN
    -- Crea notifiche per tutti i partecipanti
    FOR participant_record IN 
      SELECT user_id 
      FROM tournament_participants 
      WHERE tournament_id = NEW.id
    LOOP
      INSERT INTO notifications (user_id, type, title, message, link, is_read)
      VALUES (
        participant_record.user_id,
        'tournament',
        'Il torneo è iniziato!',
        'Il torneo "' || NEW.title || '" è ora in corso. Controlla il tabellone per vedere i tuoi match.',
        '/tornei/' || NEW.id,
        false
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crea il trigger
DROP TRIGGER IF EXISTS tournament_status_change_trigger ON tournaments;
CREATE TRIGGER tournament_status_change_trigger
  AFTER UPDATE OF status ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION notify_tournament_start();
