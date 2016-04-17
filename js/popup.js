var url,
    errorSpan = document.getElementById('error'),
    timeForm = document.getElementById('timeForm'),
    dateTimeForm = document.getElementById('dateTimeForm'),
    timerTypeInput = document.getElementById('timerType'),
    inputTime = document.getElementById('inputTime'),
    inputDateTime = document.getElementById('inputDateTime'),
    timeSubmit = document.getElementById('timeSubmit'),
    dateTimeSubmit = document.getElementById('dateTimeSubmit');


chrome.tabs.query({
        active: true,
        lastFocusedWindow: true
    },
    function (tabs) {
        url = tabs[0].url;
        document.getElementById('url').innerHTML = cutUrl(url);
        if (url.match(/^(chrome:\/\/).?[a-z0-9]*/i)) {
            timeSubmit.disabled = true;
            dateTimeSubmit.disabled = true;
            errorSpan.innerHTML = 'Error chrome:// links cannot be saved';
        }
    });

timerTypeInput.addEventListener('change', e => {
    var timerType = timerTypeInput.value;
    switch (timerType) {
        case 'in' :
            timeForm.classList.remove('hidden');
            dateTimeForm.classList.add('hidden');
            break;
        case 'on':
            dateTimeForm.classList.remove('hidden');
            timeForm.classList.add('hidden');
            break;
        default:
            break;
    }
});

timeForm.addEventListener('submit', e => {
    var expire = Date.now() + inputTime.value * 1000;
    newTimer(url, expire);
    e.preventDefault();
    //window.close();
});

dateTimeForm.addEventListener('submit', e => {
    var expire = inputDateTime.valueAsNumber;
    newTimer(url, expire);
    e.preventDefault();
    //window.close();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(request);
    switch (request.action) {
        case 'updateTimerList':
            timerList = request.timerList;
    }
});

function cutUrl(url, notification) {
    var max = 36;
    if (url.length > max) {
        var diff = url.length - max;
        diff = Math.floor(diff / 2);
        var fhalf = url.substr(0, Math.floor(url.length / 2) - diff);
        var shalf = url.substr(Math.floor(url.length / 2) + diff, url.length);
        if (!notification) {
            return (fhalf + '[&hellip;]' + shalf);
        }
        else {
            return (fhalf + '[...]' + shalf);
        }
    }
    return url;
}

function newTimer(url, expire) {
    chrome.runtime.sendMessage({
        action: "newTimer",
        data: {url: url, expire: expire}
    }, resp => {
        console.log(resp);
        if (resp.status === 'OK') {
            clearError();
            newTimerNotification(url, expire);
        }
        else {
            handleError(resp.error);
        }
    });
}

function newTimerNotification(url, expire) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'img/icon128.png',
        title: 'Remind me Later!',
        message: cutUrl(url, true) + ' will be reminded on ' + new Date(expire).toLocaleString()
    });

    setTimeout(()=> {
        window.close();
    }, 50);
}

function clearError() {
    errorSpan.innerHTML = '';
}

function handleError(error) {
    errorSpan.innerHTML = error.message;
}