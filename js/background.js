'use strict';
/////////////////////////////////////////////////////////////////////////
//////////////////////////////// CLASSES ////////////////////////////////
/////////////////////////////////////////////////////////////////////////
class TimerList extends Array {
    existTimer(id) {
        var timer;
        for (var i = 0; i < this.length; i++) {
            timer = timerList[i];
            if (timer.id === id) {
                return true;
            }
        }
        return false;
    }

    getTimer(id) {
        var timer;
        for (var i = 0; i < this.length; i++) {
            timer = timerList[i];
            if (timer.id = id) {
                return timer;
            }
        }
        return null;
    }

    removeTimer(id) {
        var timer;
        var self = this;
        for (var i = 0; i < this.length; i++) {
            timer = timerList[i];
            if (timer.id === id) {
                self = self.splice(i, 1);
                return true;
            }
        }
        return false;
    }
}

class Timer {
    /**
     * @param url {String} - Url to save
     * @param expire {int} - Timestamp of the end date
     */
    constructor(url, expire) {
        this.id = timerCount++;
        this.url = url;
        this.expire = expire;
        this.created = Date.now();
        this.edited = null;
        this.disabled = false;
        timerList.push(this);
    }

    update(url, expire) {
        this.url = url;
        this.expire = expire;
        this.edited = Date.now();
    }

    remove() {
        var self = this;
        timerList.removeTimer(self.id);
    }
}
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

//In milliseconds
const REFRESH_INTERVAL = 1000;

var timerList = new TimerList();
var timerCount = 0;

main();

var mainInterval = setInterval(() => {
    main();
}, REFRESH_INTERVAL);

function main() {
    console.log(timerList);
    checkForExpiredTimers();
}

function checkForExpiredTimers() {
    var now = Date.now();
    timerList.forEach(timer => {
        if (!timer.disabled && timer.expire < now) {
            timer.disabled = true;
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'img/icon128.png',
                title: 'Remind me Later!',
                message: 'You asked me to remind you ' + cutUrl(timer.url) + ' !',
                buttons: [{title: 'Open'}, {title: 'Ok'}]
            });
            chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
                if (buttonIndex == 0) {
                    window.open(timer.url);
                }
                timer.remove();
                updatePopupTimerList();
                chrome.notifications.clear(notificationId);
            })
        }
    });
}

function cutUrl(url) {
    var max = 38;
    if (url.length > max) {
        var diff = url.length - max;
        diff = Math.floor(diff / 2);
        var fHalf = url.substr(0, Math.floor(url.length / 2) - diff);
        var sHalf = url.substr(Math.floor(url.length / 2) + diff, url.length);
        return (fHalf + '[...]' + sHalf);
    }
    return url;
}

function verifyTimerData(url, expireDate) {
    if (!url) {
        return ERROR_INVALID_URL
    }
    if (expireDate < Date.now()) {
        return ERROR_BAD_DATE;
    }
    return true;
}

function verifyUpdateTimerData(id, url, expireDate) {
    var verification = verifyTimerData(url, expireDate);
    if (verification === true) {
        if (timerList.existTimer(id)) {
            return true;
        }
        else {
            return ERROR_NO_SUCH_TIMER;
        }
    }
    else {
        return verification;
    }
}

function updatePopupTimerList() {
    chrome.runtime.sendMessage({
        action: "updateTimerList",
        data: {timerList: timerList}
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(request);
    var verification;
    switch (request.action) {
        case 'newTimer':
            verification = verifyTimerData(request.data.url, request.data.expire);
            if (verification === true) {
                sendResponse({status: 'OK', timer: new Timer(request.data.url, request.data.expire)});
            } else {
                sendResponse({status: 'NOK', error: verification});
            }
            break;
        case 'getTimerList':
            sendResponse({status: 'OK', timerList: timerList});
            break;
        case 'updateTimer':
            verification = verifyUpdateTimerData(request.data.id, request.data.url, request.data.expire);
            if (verification === true) {
                var timer = timerList.getTimer(id);
                timer.update(request.data.url, request.data.expire);
                sendResponse({status: 'OK', timer: timer});
            }
            break;
        case 'removeTimer':
        {
            if (timerList.existTimer(request.data.id)) {
                timerList.removeTimer(request.data.id);
                sendResponse({status: 'OK', timerList: timerList});
            }
            else {
                sendResponse({status: 'NOK', error: ERROR_NO_SUCH_TIMER});
            }
        }
            break;
        case 'removeAllTimer':
            timerList = new TimerList();
            sendResponse({status: 'OK', timerList: timerList});
    }
});

const ERROR_INVALID_URL = {code: 1, message: 'URL is not valid.'};
const ERROR_BAD_DATE = {code: 2, message: 'Expire date must be in the future.'};
const ERROR_NO_SUCH_TIMER = {code: 3, message: 'The timer you wish to edit doesn\'t exists'};