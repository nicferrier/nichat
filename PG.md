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


## Using postgresql without docker

I had some troubles with an experimental build of Windows and Docker
and so had to do this.

Presuming ubuntu:

```
sudo apt-get install postgresql-10
## installs a "main" cluster
sudo -u postgres createuser -s nichat
sudo -u postgres createdb -O nichat nichat
sudo -u postgres sed -i -e 's/md5/trust/' /etc/postgresql/10/main/pg_hba.conf
sudo -u postgres pg_ctlcluster 10 main stop
sudo -u postgres pg_ctlcluster 10 main start
```


## making tables

All the table and other creation is done at start up by reading tables.


## services

nichat is microservices. Each service has it's own db.


