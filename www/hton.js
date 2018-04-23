let api = {
    htonChildrenToDoc: function(children) {
        let arr = Array.from(children);
        if (arr.length == 1 && !(arr[0] instanceof HTMLElement)) {
            return arr[0].textContent;
        }
        return arr.map(e => {
            // console.log("e element", e);
            if (e instanceof HTMLElement) {
                let tag = e.tagName;
                let htonObj = {};
                if (tag == "A") {
                    htonObj[tag] = { 
                        "href": e.getAttribute("href"),
                        "_": api.htonChildrenToDoc(e.childNodes)
                    };
                }
		else if (tag == "IMG") {
		    htonObj[tag] = {
			"src": e.getAttribute("src"),
			"width": e.getAttribute("width"),
			"height": e.getAttribute("height")
		    };
		}
                else if (e.children.length == 0) {
                    htonObj[tag] = e.textContent;
                }
                else {
                    htonObj[tag] = api.htonChildrenToDoc(e.childNodes);
                }
                return htonObj;
            }
            else {
                return e.textContent;
            }
        });
    },

    hton: function(element) {
        //console.log("children", element.children);
        let htonDoc = api.htonChildrenToDoc(element.childNodes);
        if (typeof(htonDoc) === "string") {
            return [htonDoc];
        }
        return htonDoc;
    },

    htonStringify: function (element) {
	return JSON.stringify(api.hton(element), null, 2);
    },

    consoleHton: function (element) {
	console.log("hton>", api.htonStringify(element));
    },

    hton2Dom: function (htonJson, domNode) {
        htonJson.forEach (e => {
            // console.log("e is", e);
            if (typeof e === "string") {
                // console.log("e is a string", e);
                let textNode = document.createTextNode(e);
                domNode.appendChild(textNode);
            }
            else {
	        var elementKeys = Object.keys(e);
	        elementKeys.forEach (k => {
                    // console.log("k is", k, e[k], Array.isArray(e[k]));
	            var element = document.createElement(k);
                    if (Array.isArray(e[k])) {
                        api.hton2Dom(e[k], element);
                    }
                    else if (typeof e[k] === "object") {
                        Object.keys(e[k]).forEach(n => {
                            if (n == "_") {
                                api.hton2Dom([e[k][n]], element);
                            }
                            else {
                                element.setAttribute(n, e[k][n]);
                            }
                        });
                    }
                    else  {
	                element.innerText = e[k];
	                document.importNode(element, true);
                    }
	            domNode.appendChild(element);
	        });
            }
        });
    }
}

export default api;

// end
