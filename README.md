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


## Security

* accept the register password in the clear
* crypt the password with a random salt
* save in the user_password table



# separations

people and chats

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


where does the binding between you and your chats get stored?

