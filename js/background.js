'use strict';
/////////////////////////////////////////////////////////////////////////
//////////////////////////////// CLASSES ////////////////////////////////
/////////////////////////////////////////////////////////////////////////
class TimerList extends Array {
    existTimer(id) {
        let timer;
        for (let i = 0; i < this.length; i++) {
            timer = timerList[i];
            if (timer.id === id) {
                return true;
            }
        }
        return false;
    }

    getTimer(id) {
        let timer;
        for (let i = 0; i < this.length; i++) {
            timer = timerList[i];
            if (timer.id = id) {
                return timer;
            }
        }
        return null;
    }

    removeTimer(id) {
        let timer;
        let self = this;
        for (let i = 0; i < this.length; i++) {
            timer = timerList[i];
            if (timer.id === id) {
                self = self.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    static copy(newTimerList) {
        let ntl = new TimerList();
        for (let i = 0; i < newTimerList.length; i++) {
            ntl.push(newTimerList[i]);
        }
        return ntl;
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
}
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

//In milliseconds
const REFRESH_INTERVAL = 1000;

var timerList = new TimerList();
var timerCount = 0;

initTimerList();

main();

var mainInterval = setInterval(() => {
    main();
}, REFRESH_INTERVAL);

function main() {
    // console.log(timerList);
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
                removeTimer(timer);
                updatePopupTimerList();
                chrome.notifications.clear(notificationId);
            });
            saveTimerList();
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

function initTimerList() {
    chrome.storage.sync.get('timerList', response => {
        if (response.timerList !== undefined) {
            timerList = TimerList.copy(response.timerList);
        }
    });
    chrome.storage.sync.get('timerCount', response => {
        if (response.timerCount !== undefined) {
            timerCount = response.timerCount;
        }
    })
}

function saveTimerList() {
    chrome.storage.sync.set({timerList: timerList}, () => {
        console.log('timerList synced');
    });
    chrome.storage.sync.set({timerCount: timerCount}, () => {
        console.log('timerCount synced');
    })
}

function updatePopupTimerList() {
    chrome.runtime.sendMessage({
        action: "updateTimerList",
        data: {timerList: timerList}
    });
}

function updateTimer(timer, url, expire) {
    timer.url = url;
    timer.expire = expire;
    timer.edited = Date.now();
}

function removeTimer(timer) {
    timerList.removeTimer(timer.id);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(request);
    let verification;
    switch (request.action) {
        case 'newTimer':
            verification = verifyTimerData(request.data.url, request.data.expire);
            if (verification === true) {
                new Timer(request.data.url, request.data.expire);
                sendResponse({status: 'OK', timerList: timerList});
                saveTimerList();
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
                saveTimerList();
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

chrome.storage.onChanged.addListener((changes, namespace) => {
    for (let key in changes) {
        let storageChange = changes[key];
        if (key === 'timerList') {
            timerList = TimerList.copy(storageChange.newValue);
        }
        if (key === 'timerCount') {
            timerCount = storageChange.newValue;
        }
    }
});

const ERROR_INVALID_URL = {code: 1, message: 'URL is not valid.'};
const ERROR_BAD_DATE = {code: 2, message: 'Expire date must be in the future.'};
const ERROR_NO_SUCH_TIMER = {code: 3, message: 'The timer you wish to edit doesn\'t exists'};