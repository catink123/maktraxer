function onFullyLoaded(callback) {
    if (document.readyState === 'complete') {
        // Already fully loaded
        callback();
    } else {
        window.addEventListener('load', callback);
    }
}

onFullyLoaded(() => {
    document.querySelector('.loading').classList.add('loaded');
});

let currentPage = q1;

function setDisplay(el, display) {
    el.style.display = display ? "" : "none";
}

function goto(el) {
    setDisplay(currentPage, false);
    setDisplay(el, true);
    currentPage = el;
}

setDisplay(currentPage, true);