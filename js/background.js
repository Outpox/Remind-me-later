$(function() {
    var timers = [], id;

    /**
     * This function set the timer with setTimeout()
     * @param {String} url
     * @param {String} time
     * @returns nothing
     */
    function setTimer(url, time) {
        var timeHR = time / 1000 / 60;
        var idTimerString = saveTimer(url, timeHR);
        console.log(idTimerString);
        setTimeout(function() {
            var options = {
                type: "basic",
                title: "Remind me later !",
                message: ('You asked me to remind you :\n' + url + ' \n' + timeHR + ' minutes ago. Click to open it !'),
                iconUrl: 'img/icon.png'
            }
            chrome.notifications.create(idTimerString, options, function(cb) {
            });
        }, time);

    }

    /**
     * Save a timer object in the array of timers. It also assign an id wich is returned.
     * @param {String} url
     * @param {Number} time
     * @returns {Number} id
     */
    function saveTimer(url, time) {
//	id = (id === undefined) ? id = 0 : id++;
        if (id === undefined)
            id = 0;
        else
            id++;
        var timer = {id: id, url: url, time: time};
        timers[id] = timer;
        console.log('timer saved ' + id);
        return id.toString();
    }

    /**
     * Delete the given timer from the array.
     * @param {Number} idTimer
     */
    function deleteTimer(idTimer) {
        console.log('before timers');
        getCurrentTimers();
        if (typeof timers[idTimer] != "undefined")
            timers.splice(idTimer, 1);
        console.log('index deleted');
        getCurrentTimers();
    }

    /**
     * Returns all the active timers
     * @returns {Array timer}
     */
    function getCurrentTimers() {
        timers.forEach(function(i) {
            console.log(i);
        });
    }

    /**
     * Return the url from the given ID
     * @param {String} idTimer
     * @returns {String} url
     */
    function getURL(idTimer) {
        if (typeof timers[idTimer] != "undefined") {
            return timers[idTimer].url;
        } else {
            return "about:blank";
        }
    }

    chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
        if (request.action === 'setTimer') {
            var time;
            time = (request.time === null) ? '' : request.time;
            setTimer(request.url, time);
        }
        if (request.action === 'getAllTimers') {
            getCurrentTimers();
        }
    });

    chrome.notifications.onClicked.addListener(function(cb) {
        open(getURL(cb));
        chrome.notifications.clear(cb, function() {
            deleteTimer(cb);
        });
    });
});