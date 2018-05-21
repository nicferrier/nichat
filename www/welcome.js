// Copyright (C) 2018 by Nic Ferrier

async function defaults() {
    let words = await fetch("/nichat/welcome/name");
    if (words.status == 200) {
        let wordsJson = await words.json();
        let { word1, word2 } = wordsJson;
        let name = `${word1}@${word2}.com`;
        let password = `secret${word1}`;
        document.forms["register"]["email"].value = name;
        document.forms["register"]["password"].value = password;
    }
    return [];
}


window.addEventListener("load", evt => {
    let video = document.getElementById('video');
    let canvas = document.querySelector("canvas");

    defaults();
    
    document.querySelector("body button[accesskey='l']")
        .addEventListener("click", evt => {
            document.querySelector("body .join").classList.toggle("hidden");
            document.querySelector("body .login").classList.toggle("hidden");
            document.querySelector("body").classList.toggle("right");
            video.pause();
        });

    document.querySelector("button[accesskey='v']")
        .addEventListener("click", evt => {
            evt.preventDefault();
            document.querySelector("video").classList.toggle("hidden");
            document.querySelector("div#imgSelect").classList.toggle("hidden");
            if(navigator.mediaDevices
               && navigator.mediaDevices.getUserMedia) {
                navigator
                    .mediaDevices
                    .getUserMedia({video: true})
                    .then(stream => {
                        video.src = window.URL.createObjectURL(stream);
                        // video.play();
                    });
            }
        });
    
    canvas.addEventListener("click", function () {
        if (document.querySelector("div#imgSelect").classList.contains("hidden")) {
            canvas.classList.toggle("hidden");
            video.classList.toggle("hidden");
        }
    });

    video.onfocus = function (evt) {
        document.querySelector("form div").classList.toggle("hidden");
    };

    video.onblur = function (evt) {
        document.querySelector("form div").classList.toggle("hidden");
    };

    let snap = function () {
        video.classList.toggle("hidden");
        canvas.classList.toggle("hidden");
        canvas.height = 225;
        canvas.width = 300;
        let context = canvas.getContext('2d');
	context.drawImage(video, 0, 0, 640, 480, 0, 0, 300, 225);
    };
    
    // Trigger photo take
    video.addEventListener("click", snap);

    document.querySelector("section.join form")
        .addEventListener("submit", async evt => {
            evt.preventDefault();
            
            if (canvas.classList.contains("hidden")
                && (document.querySelector("div#imgSelect")
                    .classList.contains("hidden"))) {
                snap();
            }

            let formData = new FormData(evt.target);
            let img = await new Promise((resolve, reject) => {
                canvas.toBlob(blob => { resolve(blob); });
            }, "image/png");
            formData.append("photo", img, "image.png");
            
            let response = await fetch(evt.target.action, {
                method: "POST",
                credentials: "include",
                body: formData
            });
            if (response.url) {
                document.location = response.url;
            }
        });
});

// welcome.js ends here
