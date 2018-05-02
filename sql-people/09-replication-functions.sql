-- Replication functions


-- Function to do replication, called from a trigger

CREATE OR REPLACE FUNCTION rtrigger() RETURNS trigger AS $$
begin
    CREATE TABLE IF NOT EXISTS rlog ("id" SERIAL,
                                     "date" TIMESTAMP WITH TIME ZONE,
                                     "table" TEXT,
                                     "event" TEXT,
                                     "rec" JSON);
    INSERT INTO rlog ("date", "table", "event", "rec")
    VALUES (now(),
            TG_TABLE_NAME,
            TG_OP,
            row_to_json(NEW, true));
    RETURN NULL;
end;
$$ LANGUAGE plpgsql;


-- Create or replace replication trigger for 'tablename'
CREATE OR REPLACE FUNCTION create_or_replace_replication_trigger(tablename text)
RETURNS void AS $$
begin
    PERFORM tgname FROM pg_trigger WHERE tgname = 'repl_' || tablename;
    if NOT FOUND then
        EXECUTE 'CREATE TRIGGER repl_' || quote_ident(tablename) || ' '
        || 'AFTER INSERT OR UPDATE OR DELETE '
        || 'ON ' || quote_ident(tablename) || ' '
        || 'FOR EACH ROW EXECUTE PROCEDURE rtrigger()';
    end if;
end;
$$ LANGUAGE plpgsql;

-- end
