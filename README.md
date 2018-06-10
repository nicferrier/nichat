# nichat

nichat is a new chat system. It tries to use the browser as much as possible.


## dependencies

I try to keep nichat as free of dependencies as possible, but you do need:

* nodejs v8 or above
* a modern browser that does ES6 modules
* postgresql-10
    * If you're on Windows 10, or Ubuntu or RHEL 7 then we nichat will do
      it's best to find your Postgres binaries and then create it's own
      instance.


## build

just do:

```
npm install
```

## run it

just do:

```
node server.js
```


## links

Emoticons came from [here](https://unicode.org/emoji/charts/emoji-ordering.html)


## registration and people information

nichat separates the chat service from the *people* service. Each is
implemented as a single nodejs microservice, with it's own
database. The database is only accessible through the application
service.

Registration is part of the people service. The people service is:

`/nichat/welcome` - delivers the registration page, for non-logged in
users, a POST to this is supposed to create the user; usually this
will be a POST with an image for getting a picture of the user.

`/nichat/welcome/chat-authenticate` - receive an authorization request
from chat, allows sharing people data

`/nichat/welcome/auth-chat` - part of the chat authorization

`/nichat/people` - delivers a list of all the people, to facilitate invites

`/nichat/people/_` - sets the current session user on a special header
so it's visible by the browser

`/nichat/people/_/photo` - return the image of the current session user

`/nichat/people/{username}/photo` - return the image for the user {username}

`/nichat/people/{username}` - return the data about the user (not it's password)

One of the things that the chat server can do is to start a default
people server and then proxy the above urls to it. Users don't need to
orchestrate the starting of multiple servers therefore. This is good
for development.


## dev stuff

nichat is in development and needs people to hack on it, so here's
information about doing that.

### message storage and formats

The messages between people are collected with a rich text editor and
converted into a JSON representation of HTML.

An example:

```
[  {                                                                  
        "IMG": {
            "src": "/nichat/images/eec5d411eac53119f76a8b4a9b8e6023.png
            "width": null,
            "height": null
        }
    },
    " < this is a picture. good init."
]
```

### image and other artifact storage

Images are posted to the server and collected in files, but then moved
into Postgres. So the storage directories are very temporary.

#### attachments

nichat accepts pasted artifacts into the chat, the artifacts are
uploaded as images are and then referred to from the chat HTML (which
is encoded as JSON). No work is done to garbage collect images or
other artifacts that have been uploaded but not referred to.


### FIXMEs

* When we upload an artifact we need to handle filename clashes
* Refuse chat from someone not in it (in the chat POST)

