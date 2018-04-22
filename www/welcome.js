window.addEventListener("load", evt => {
    let video = document.getElementById('video');
    let canvas = document.querySelector("canvas");
    
    if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
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
    
    // Trigger photo take
    video.addEventListener("click", function () {
        // video.pause();
        video.classList.toggle("hidden");
        canvas.classList.toggle("hidden");
        canvas.height = 225;
        canvas.width = 300;
        let context = canvas.getContext('2d');
	context.drawImage(video, 0, 0, 640, 480, 0, 0, 300, 225);
    });
});
