# How we use PG

We use a docker. We could start the docker from JS like this:

```
// docker pull postgres to get postgres docker
dockerCommand = "docker run -d -v nichat-pgdata:/var/lib/postgresql/data -e POSTGRES_USER=nichat -p 5432:5432 postgres";
```

## the docker

* volume nichat-pgdata
* no need for much security right now
 * we could use docker compose as an eventual solution
 

## making tables

All the table and other creation is done at start up by reading tables.


## services

nichat is microservices. Each service has it's own db.

