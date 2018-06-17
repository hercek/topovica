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
		// because % is remainder operator, not modulo
		target = target<0?tabs.length+target:target;
		// returns a promise but we don't care
		browser.tabs.update(tabs[target].id, {active: true});
	};

	q.then(gototarget, stderr);
}

function tabnew(tabid, args){ common_opener(tabid, args, true); }
function opener(tabid, args){ common_opener(tabid, args, false); }

function common_opener(tabid, args, newtab){
	var validstarts = ["http://", "https://", "ftp://"],
		url = args[0];

	if(args.length<1) return;

	// case where we don't search
	if(args.length==1 && url.includes(".")){
		var addhttp = true;
		for(var i=0;i<validstarts.length;i++){
			if(url.startsWith(validstarts[i])){
				addhttp = false;
				break;
			}
		}
		if(addhttp) url = "http://"+url;
	}else{
		url = "https://google.com/search?q=" + args.join("+");
	}
	if(!newtab) browser.tabs.update(tabid, {url: url});
	else browser.tabs.create({active:true, openerTabId:tabid, url:url})
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

function get_buffers(cmd, sender, rsp){
	return browser.tabs.query({currentWindow:true}).then(tabs => {
		var retval = {};
		tabs.forEach(t => retval[t.index+1] = {title:t.title, id:t.id});
		return retval;
	});
}

function find(cmd){
	debug(`search term ${cmd.args[0]}`);
	return browser.find.find(cmd.args[0],{includeRangeData:true}).then(res => {
		browser.find.highlightResults();
		return res;
	});
}

function open_hints(cmd){
	// don't return results when there aren't search terms
	var searchterm = cmd.args[0];
	if(searchterm=="") return Promise.resolve([]);

	function nores(err){
		debug(`${err}`);
		return [];
	}

	function res(results){
		// please report me for ternary operator abuse
		return results.filter(e => ("url" in e)).map(e => [(("title" in e)?e.title:""), e.url]);
	}

	// look in bookmarks
	var p1 = browser.bookmarks.search(searchterm).then(res,nores);
	// look in history
	var p2 = browser.history.search({text:searchterm}).then(res, nores);

	return Promise.all([p1,p2]).then(function(results){
		var m = {};
		// remove duplicates
		results.forEach(arr => arr.forEach( e => { m[e[1]] = m[e[0]]; } ));
		return Object.keys(m).map(k => [m[k], k]);
	}, nores);

}

function commands_receiver(cmd, sender, rsp){
	debug(cmd);
	debug(sender);

	var commands = {
		"d": function(){ browser.tabs.remove(sender.tab.id); },
		"gt": function(){ tabber(sender.tab.index+1); },
		"gT": function(){ tabber(sender.tab.index-1); },
		"g^": function(){ tabber(0); },
		"g$": function(){ tabber(-1); },
		"open": function(){ opener(sender.tab.id, cmd.args); },
		"tabnew": function(){ tabnew(sender.tab.id, cmd.args); },
		"open_hints": open_hints,
		"tabto": function(cmd) { browser.tabs.update(cmd.args[0], {active:true}); },
		"debug": function(){ DEBUG=true; },
		"nodebug": function(){ DEBUG=false; },
		"b": get_buffers,
		"find": find,
		"unfind": function(){ browser.find.removeHighlighting(); },
		"u": restoreMostRecent
	};
	if(cmd.command in commands){
		return commands[cmd.command](cmd,sender,rsp);
	}
}

browser.runtime.onMessage.addListener(commands_receiver);
