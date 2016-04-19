var url,
    errorSpan = document.getElementById('error'),
    timeForm = document.getElementById('timeForm'),
    dateTimeForm = document.getElementById('dateTimeForm'),
    timerTypeSelect = document.getElementById('timerType'),
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

switch (localStorage.getItem('mode')) {
    case 'in':
        timerTypeSelect.value = 'in';
        showIn();
        break;
    case 'on':
        timerTypeSelect.value = 'on';
        showOn();
        break;
    default:
        timerTypeSelect.value = 'in';
        showIn();
        break;
}

timerTypeSelect.addEventListener('change', e => {
    var timerType = timerTypeSelect.value;
    switch (timerType) {
        case 'in' :
            showIn();
            break;
        case 'on':
            showOn();
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
    var max = 40;
    var diff = url.length - max;
    if (url.length > max && diff > 3) {
        diff = Math.floor(diff / 2);
        var fHalf = url.substr(0, Math.floor(url.length / 2) - diff);
        var sHalf = url.substr(Math.floor(url.length / 2) + diff, url.length);
        if (!notification) {
            return (fHalf + '[&hellip;]' + sHalf);
        }
        else {
            return (fHalf + '[...]' + sHalf);
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
            updateTimerList(resp.timerList);
        }
        else {
            handleError(resp.error);
        }
    });
}

function removeTimer(id) {
    chrome.runtime.sendMessage({
        action: "removeTimer",
        data: {id: id}
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
    if (newTimerList != undefined) timerList = newTimerList;

    timerList.innerHTML = '';

    // while (timerList.firstChild) {
    //     timerList.removeChild(timerList.firstChild);
    // }

    timerList.forEach(timer => {
        var row = document.createElement('tr');

        var urlCol = document.createElement('td');
        urlCol.appendChild(document.createTextNode(cutUrl(timer.url, true)));

        var expireCol = document.createElement('td');
        expireCol.classList.add('expire');
        var secondsLeft = Math.floor((timer.expire - Date.now()) / 1000);
        var secondLeftNode = document.createTextNode(secondsLeft.toString());
        expireCol.appendChild(secondLeftNode);

        var dateCol = document.createElement('td');
        dateCol.appendChild(document.createTextNode(new Date(timer.expire).toLocaleString()));

        var actionCol = document.createElement('td');
        let del = document.createElement('span');
        let delText = document.createTextNode('D');
        del.addEventListener('click', e => {
            removeTimer(timer.id);
        });
        let open = document.createElement('span');
        let openText = document.createTextNode('O');
        open.addEventListener('click', e => {
            window.open(timer.url);
        });
        del.classList.add('pointerCursor');
        open.classList.add('pointerCursor');
        del.appendChild(delText);
        open.appendChild(openText);
        actionCol.appendChild(del);
        actionCol.appendChild(document.createTextNode(' | '));
        actionCol.appendChild(open);

        row.appendChild(urlCol);
        row.appendChild(expireCol);
        row.appendChild(dateCol);
        row.appendChild(actionCol);

        timerListEl.appendChild(row);
    });

    if (timerList.length > 0) {
        table.classList.remove('hidden');
        decrementTimersExpiration();
    }
    else {
        if (!table.classList.contains('hidden')) {
            table.classList.add('hidden');
        }
    }
}

function decrementTimersExpiration() {
    let expireCols = document.getElementsByClassName('expire');
    for (let i = 0; i < expireCols.length; i++) {
        let expire = expireCols[i];
        if (parseInt(expire.innerHTML) > 0) {
            setInterval(()=> {
                if (parseInt(expire.innerHTML) > 0) {
                    expire.innerHTML = parseInt(expire.innerHTML) - 1;
                }
                else {
                    expire.innerHTML = 'Expired';
                }
            }, 1000);
        }
        else {
            expire.innerHTML = 'Expired';
        }
    }
}

function saveTimerMode(mode) {
    localStorage.setItem('mode', mode);
}

function showIn() {
    timeForm.classList.remove('hidden');
    dateTimeForm.classList.add('hidden');
    saveTimerMode('in');
}

function showOn() {
    dateTimeForm.classList.remove('hidden');
    timeForm.classList.add('hidden');
    saveTimerMode('on');
}

function clearError() {
    errorSpan.innerHTML = '';
}

function handleError(error) {
    errorSpan.innerHTML = error.message;
}