function debug(){
	console.log.apply(null, arguments);
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

function get_buffers(cmd, sender, rsp){
	return browser.tabs.query({currentWindow:true}).then(tabs => {
		var retval = {};
		tabs.forEach(t => retval[t.index+1] = {title:t.title, id:t.id});
		return retval;
	});
}

function commands_receiver(cmd, sender, rsp){
	debug(cmd);
	debug(sender);
	var commands = {
		"open": function(){ opener(sender.tab.id, cmd.args); },
		"tabnew": function(){ tabnew(sender.tab.id, cmd.args); },
		"tabto": function(cmd) { browser.tabs.update(cmd.args[0], {active:true}); },
		"getTabs": get_buffers
	};
	if(cmd.command in commands){
		return commands[cmd.command](cmd,sender,rsp);
	}
}

browser.runtime.onMessage.addListener(commands_receiver);
