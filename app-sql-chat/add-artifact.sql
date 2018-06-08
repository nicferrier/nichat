-- Insert a new artifact, like a photo

INSERT INTO artifact (
  id, filename, data, created
)
VALUES (
  nextval('artifact_id'),
  $1,
  $2,
  now()
)
RETURNING filename;

-- Ends here
