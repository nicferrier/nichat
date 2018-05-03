# This is how to start postgres with the postgres docker
# you can get the postgres docker like this:
#
#   docker pull postgres

docker run -d \
       -v nichat-pgdata:/var/lib/postgresql/data \
       -e POSTGRES_USER=nichat \
       -p 5432:5432 postgres

# Once it starts you should be able to connect to port 5432 with the
#  user nichat and the db nichat

# If you install postgres client tools you can:
#
#    psql -h localhost -p 5432 nichat nichat

# End
