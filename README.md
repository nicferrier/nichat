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


## Message storage and formats

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

## Image and other artifact storage

Images are posted to the server and collected in files, but then moved
into Postgres. So the storage directories are very temporary.

### Attachments

nichat accepts pasted artifacts into the chat, the artifacts are
uploaded as images are and then referred to from the chat HTML (which
is encoded as JSON). No work is done to garbage collect images or
other artifacts that have been uploaded but not referred to.


## FIXMEs

* When we upload an artifact we need to handle filename clashes
* Refuse chat from someone not in it (in the chat POST)

