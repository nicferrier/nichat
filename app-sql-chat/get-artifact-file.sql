-- Get a file that we stored

SELECT data
FROM artifact
WHERE filename = $1
LIMIT 1;

-- Ends here
