a new chat system,

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


## Links

Emoticons came from [here](https://unicode.org/emoji/charts/emoji-ordering.html)



# Bits of working out

people and chats

## auth

authenticate to people
but we need your userid in chat

one time password generation

stick it on the session

if chat authenticates to people with it then give it something


## people 

* you register and authenticate - maybe this is proxied

* search people
 * parameters
  * pattern
 * result
  * description of who matched the search


## chats

* call people for the list of people
 * merge the list of chats


## chat creation

invite

POST members -> chatservice -> makeChat - db insert





