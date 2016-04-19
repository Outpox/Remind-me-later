var url,
    errorSpan = document.getElementById('error'),
    timeForm = document.getElementById('timeForm'),
    dateTimeForm = document.getElementById('dateTimeForm'),
    timerTypeInput = document.getElementById('timerType'),
    inputTime = document.getElementById('inputTime'),
    inputDateTime = document.getElementById('inputDateTime'),
    timeSubmit = document.getElementById('timeSubmit'),
    dateTimeSubmit = document.getElementById('dateTimeSubmit'),
    table = document.getElementById('table'),
    timerList = [],
    timerListEl = document.getElementById('timerList');


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

main();

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
            updateTimerList(request.timerList);
            break;
    }
});

function main() {
    chrome.runtime.sendMessage({
        action: "getTimerList"
    }, resp => {
        console.log(resp);
        if (resp.status === 'OK') {
            updateTimerList(resp.timerList);
        }
        else {
            handleError(resp.error);
        }
    });
}

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
        // window.close();
    }, 50);
}

function updateTimerList(newTimerList) {
    if (newTimerList) timerList = newTimerList;
    timerList.forEach(timer => {
        var row = document.createElement('tr');

        var urlCol = document.createElement('td');
        urlCol.appendChild(document.createTextNode(cutUrl(timer.url, true)));

        var expireCol = document.createElement('td');
        var secondsLeft = Math.floor((timer.expire - Date.now()) / 1000);
        var secondLeftNode = document.createTextNode(secondsLeft.toString());
        setInterval(() => {
            secondLeftNode.innerHTML = Math.floor((timer.expire - Date.now()) / 1000);
        }, 1000);
        expireCol.appendChild(secondLeftNode);

        var dateCol = document.createElement('td');
        dateCol.appendChild(document.createTextNode(new Date(timer.expire).toLocaleString()));

        row.appendChild(urlCol);
        row.appendChild(expireCol);
        row.appendChild(dateCol);

        timerListEl.appendChild(row);
    });

    if (timerList.length > 0) {
        table.classList.remove('hidden');
    }
    else {
        if (!timerList.classList.contains('remove')) {
            table.classList.add('hidden');
        }
    }
}

function clearError() {
    errorSpan.innerHTML = '';
}

function handleError(error) {
    errorSpan.innerHTML = error.message;
}