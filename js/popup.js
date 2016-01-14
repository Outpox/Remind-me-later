var url;
chrome.tabs.query({
        active: true,
        lastFocusedWindow: true
    },
    function (tabs) {
        url = tabs[0].url;
        $("#url").html(cutUrl(url));
        if (url.match(/^(chrome:\/\/).?[a-z0-9]*/i)) {
            $('#submit').attr('disabled', 'disabled');
            $('#error').html('Error <pre>chrome://</pre> links cannot be saved');
        }
    });


function cutUrl(url) {
    var max = 36;
    if (url.length > max) {
        var diff = url.length - max;
        diff = Math.floor(diff / 2);
        var fhalf = url.substr(0, Math.floor(url.length / 2) - diff);
        var shalf = url.substr(Math.floor(url.length / 2) + diff, url.length);
        return (fhalf + '&hellip;' + shalf);
    }
    return url;
}


$('#formin').submit(function (e) {
    var timein = $('#timein').val();
    var time = timein * 1000 * 60;
    chrome.extension.sendRequest({action: "setTimer", time: time, url: url});
    e.preventDefault();
    window.close();
});

chrome.extension.sendRequest({action: "getCurrentTimers"}, function (response) {
});

function newTimer(url, date) {
    chrome.runtime.sendMessage({
        action: "newTimer",
        data: {url: url, date: date, created: Date.now()}
    }, function (response) {
    });
}