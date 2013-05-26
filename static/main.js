// Top-level Javascript. Pulls in rest
"use strict"
$(document).ready(function() {
    goplay.init();
    playground({
        'outputEl':   '#output',
        'fmtEl':      '#fmt',
        'saveEl':     '#save',
        'saveLocEl':  '#saveLoc',
        'loadLocEl':  '#loadLoc',
        'enableHistory': true
    });

    $('#code').linedtextarea();
    $('#code').unbind('keydown').bind('keydown', goplay.keyHandler);

    var aboutEl = $('#about');
    var settingsEl = $('#playsettings');

    aboutEl.click(function(e) {
        if ($(e.target).is('a')) {
            return;
        }
        aboutEl.hide();
    });
    $('#aboutButton').click(function() { goplay.onAbout(true); })
    $('#settingsButton').click(function() { goplay.onSettings(true); })
    $('#save').click(function() {
	goplay.showCodeTab();
        goplay.onSave();
    })
    $('#fmt').click(function() {
        goplay.onFormat();
    })
    $('#tabSetting').focusout(function() {
        goplay.onTabSetting();
    })
    $('#websocket').click(function() {
        goplay.onWSButton();
    })
    $("#errors").click(function(event){
	goplay.onJumpToErrorPos(event);
    });
    $('#settingsUpdate').click(function() { goplay.onSettingsUpdate(); })
    if (goplay.haveFileSupport()) {
        document.getElementById('load').addEventListener('change', goplay.onFileLoad,
							 false);
        goplay.showCodeTab();
    } else {
        load.hide();
    }
    var close = document.getElementById('clearbutton');
    close.innerHTML="Clear";
    close.hidden = true;
    close.addEventListener('click', goplay.onClearOutput, false);
    var kill = document.getElementById('killbutton');
    kill.innerHTML="Kill";
    kill.hidden = true;
    kill.addEventListener('click', goplay.onWSKill, false);
    var run = document.getElementById('runbutton');
    run.addEventListener('click', goplay.onRun, false);
    run.innerHTML="Run";
    run.hidden = false;
    close.addEventListener('click', goplay.onWSKill, false);
});
