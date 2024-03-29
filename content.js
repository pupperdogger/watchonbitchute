// Get all the video links on the page

// Videos that have already been processed
let doneVideoLinks = [];
// Elements that link to videos
let videoLinks = [];
// The number of videos fetched
let fetchedCount = 0;
// If links are currently being loaded
let loadingLinks = false;

/**
 * Load BitChute links onto the page
 */
function loadBitChuteLinks() {
    // If the function is locked, return
    if(loadingLinks) {
        return;
    }

    loadingLinks = true; // lock the function

    videoLinks = Array.from(document.querySelectorAll("#info-contents .title, a#video-title, a #video-title"));
    fetchedCount = 0;

    // Create a new done video links containing only the video links we find on the page
    // to prevent done video links from getting too big, since YouTube is a SPA
    let newDoneVideoLinks = [];
    for( var i=videoLinks.length-1; i>=0; i-- ) {
        if( doneVideoLinks.includes(videoLinks[i]) ) {
            newDoneVideoLinks.push( videoLinks[i] ); // The video link we've already looked at is still on the page
            videoLinks.splice(i, 1);
        }
    }
    // There are no videos to load
    if( !videoLinks.length ) {
        loadingLinks = false; // unlock the function
        return;
    }

    // For each link, see if we can find it on Bitchute and add a link to BitChute
    for(let i=0; i<videoLinks.length; i++) {
        newDoneVideoLinks.push(videoLinks[i]);

        let title = getTitle(videoLinks[i]);

        // Ask the background process to search BitChute
        chrome.runtime.sendMessage({title: title, index: i});
    }

    doneVideoLinks = newDoneVideoLinks;  
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener( function(request, sender, sendResponse) {
    // If we get a response and the element is still there with the same title
    if( request.link && document.body.contains(videoLinks[request.index]) 
        && getTitle(videoLinks[request.index]) == request.title) {
        // Add a link to BitChute
        let button = document.createElement("a");
        button.setAttribute("href", request.link);
        button.setAttribute("class", "wiobc-button");
        button.setAttribute("target", "_blank");
        button.innerText = "Watch on BitChute";
        button.onclick = function(e) { e.stopPropagation(); };
        insertAfter( button, videoLinks[request.index] );
    }
    fetchedCount ++;
    if( fetchedCount == videoLinks.length ) {
        loadingLinks = false; // unlock the function
    }
    sendResponse();
} );

/**
 * Get the title of an element
 * @param {HTMLElement} element - the element to get the title of
 */
function getTitle(element) {
    // Get the title of the video
    let title = element.getAttribute("title");
    // This is for a video page
    if( !title ) {
        title = element.innerText;
    }
    return title;
}

/**
 * Insert an element after another element
 * Taken from here: https://plainjs.com/javascript/manipulation/insert-an-element-after-or-before-another-32/
 * @param {HTMLElement} element - the element to insert
 * @param {HTMLElement} referenceNode - the node to insert 'element' after
 */
function insertAfter(element, referenceNode) {
    referenceNode.parentNode.insertBefore(element, referenceNode.nextSibling);
}

// Load BitChute links
loadBitChuteLinks();
let interval = setInterval(loadBitChuteLinks, 500);

// Listen for page reloads
document.body.addEventListener("yt-navigate-finish", function(event) {
    // Remove current buttons
    let buttons = document.querySelectorAll(".wiobc-button");
    for(let i=0; i<buttons.length;i++) {
        buttons[i].parentElement.removeChild(buttons[i]);
    }
    doneVideoLinks = [];

    setTimeout(loadBitChuteLinks, 250); // Add a little delay since the event might not have everything loaded (wait for ajax requests to finish)

    // After 250s milliseconds resume interval 
    setTimeout(function(e) {
        interval = setInterval(loadBitChuteLinks, 500);
    }, 250);
});

// Listen for starting page reloads
document.body.addEventListener("yt-navigate-start", function(e) {
    // Once we're reloading, stop the interval looking for links
    clearInterval(interval);
});

