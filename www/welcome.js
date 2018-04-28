window.addEventListener("load", evt => {
    let video = document.getElementById('video');
    let canvas = document.querySelector("canvas");
    let doVideo = true; // we can stop it while doing dev
    if(doVideo
       && navigator.mediaDevices
       && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
            .getUserMedia({video: {
                /// this is for screen sharing but doesn't work.
                /// just use true instead of the object for normal camera
                mediaSource: "screen" 
            }})
            .then(stream => {
                video.src = window.URL.createObjectURL(stream);
                video.play();
            });
    }

    document.querySelector("body button")
        .addEventListener("click", evt => {
            document.querySelector("body .join").classList.toggle("hidden");
            document.querySelector("body .login").classList.toggle("hidden");
            document.querySelector("body").classList.toggle("right");
        });

    canvas.addEventListener("click", function () {
        canvas.classList.toggle("hidden");
        video.classList.toggle("hidden");
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
            
            if (canvas.classList.contains("hidden")) {
                snap();

                let formData = new FormData(evt.target);
                let img = await new Promise((resolve, reject) => {
                    canvas.toBlob(blob => { resolve(blob); });
                }, "image/png");
                formData.append("photo", img, "image.png");

                let response = await fetch(evt.target.action, {
                    method: "POST",
                    body: formData
                });
                if (response.url) {
                    document.location = response.url;
                }
            }
        });
});

// welcome.js ends here
