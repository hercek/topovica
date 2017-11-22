var DEBUG = true;
function debug(){
    if(DEBUG){
        console.log.apply(null, arguments);
    }
}

function stderr(e){
    debug(`Error: ${error}`);
}

function tabber(target){
    var q = browser.tabs.query({currentWindow:true});

    gototarget = function(tabs){
        target = target % tabs.length;
		tabs.forEach((t)=> { debug(t.index, t.title); });
        // because % is remainder operator, not modulo
        target = target<0?tabs.length+target:target;
        // returns a promise but we don't care
        browser.tabs.update(tabs[target].id, {active: true});
    };

    q.then(gototarget, stderr);
}

// copied from mozilla
function restoreMostRecent() {
	browser.sessions.getRecentlyClosed({maxResults:1}).then(function(sessionInfos){
		if(!sessionInfos.length) {
			debug("No sessions found")
			return;
		}
		let sessionInfo = sessionInfos[0];
		if (sessionInfo.tab) {
			browser.sessions.restore(sessionInfo.tab.sessionId);
		} else {
			browser.sessions.restore(sessionInfo.window.sessionId);
		}
	}, stderr);
}

function commands_receiver(cmd, sender, rsp){
    debug(cmd);
    debug(sender);

    var commands = {
        "gt": function(){ tabber(sender.tab.index+1); },
        "gT": function(){ tabber(sender.tab.index-1); },
        "g^": function(){ tabber(0); },
        "g$": function(){ tabber(-1); },
        "d": function(){ browser.tabs.remove(sender.tab.id); },
        "u": restoreMostRecent
    };
    if(cmd.command in commands){
        commands[cmd.command](cmd,sender,rsp);
    }
}

browser.runtime.onMessage.addListener(commands_receiver);
