let bitchuteBase = "https://www.bitchute.com";
let bitchuteLink = bitchuteBase + "/search?q=";
let channelCache = {};

/**
 * Update BitChute searching link
 * BitChute has a special search application (search.bitchute.com) with a token in the Url
 * You can also access it by using the /search endpoint on BitChute.com.
 * However, the search endpoint alters the query string's punctuation
 * and capitilization. We want to avoid the query string being changed, so we
 * have to use the search application directly. However, we also need to get a good token,
 * so we just use the search endpoint to get the search application URL (it will contain a token).
 */
function updateBitChuteLink() {
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() { 
        if (xhr.readyState == 4 && xhr.status == 200) {
            bitchuteLink = xhr.responseURL;
        }
    }
    xhr.open("GET", bitchuteLink, true);
    xhr.send(null);
}

updateBitChuteLink();

// Listen for requests to fetch data from BitChute
chrome.runtime.onMessage.addListener( function(request, sender, sendResponse) {

    let url = bitchuteLink + request.title + "&fqc&fqa.kind=video";
    url = encodeURI(url);

    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() { 
        if (xhr.readyState == 4 && xhr.status == 200) {
            // Create a template that we can navigate using JavaScript
            let template = document.createElement("template");
            template.innerHTML = xhr.responseText;
            let links = template.content.querySelectorAll(".osscmnrdr > a");
            let responseObject = { index: request.index, title: request.title };
            if( links ) {

                // We will favor the first match
                // It would be nice if we could favor matches for matching creators, but unforntuantely
                // BitChute doesn't list creators on their search results
                for(var i=links.length-1; i>=0; i--) {

                    let link = links[i];
                    let title = link.innerText; // We only allow exact matches (If the YouTube video title is "Apple", we only want 
                    // BitChute videos whose title is exactly "Apple")
                    // It may be good to tiebreak on author of the video too.
                    if( title.replace(/\s/g,"") == request.title.replace(/\s/g,"") ) {
                        responseObject.link = link.getAttribute("href");
                        responseObject.status = "success";
                    }
                }
                if( !responseObject.link ) {
                    responseObject.status = "failure";
                }

            }
            else {
                responseObject.status = "failure";
            }
            sendResponse();
            // We'll send a message instead of a response to allow for async
            chrome.tabs.sendMessage(sender.tab.id, responseObject);
        }
    }
    xhr.open("GET", url, true);
    xhr.send(null);
} );