/**
 * So how we are going to do this is, next will hold the next function to be executed.
 * All the chained functions should accept a keyCode argument and return next nextfn,
 * optionally executing an action along the way. Invalid combinations will reset firstfn
 * as next. Hope this approach isn't too inefficient.
 */
(function(){
	if(window.hasRun) return;
	window.hasRun = true;

	var DEBUG = true;
	var modes = {"command":0,"insert":1}, mode = modes.command;

	// focused element
	var focused = window;

	// movement function. "by" is an array specifying x and y offsets to scroll by
	function move(by){
		focused.scrollBy.apply(focused, by);
		return firstfn;
	}

	// send message to background script
	function browser_command(){
		var cmd = {"command": arguments[0], "args":null};
		if(arguments.length>1) cmd.args = arguments[1];
		setTimeout(browser.runtime.sendMessage, 1, cmd);
	}

	var shifted = false,
		altered = false,
		controlled = false;

	// start chain functions
	var firstfn = null,
		gunit = null;
	// create a chain function
	function chainlink(actions){
		return function(c){
			try{
				if(c in actions){
					return actions[c]();
				}
			} catch(e) {}
			return firstfn;
		};
	}

	firstfn = chainlink({
		// basic movements
		"h": function(){ return move([-100,0]); }, // left
		"j": function(){ return move([0,50]); }, // down
		"k": function(){ return move([0,-50]); }, // up
		"l": function(){ return move([100,0]); }, // right
		// gt, gT, g$, g^, gg
		"g": function(){ return gunit; },
		// delete and undo
		"d": function(){ browser_command("d"); return firstfn; },
		"u": function(){ browser_command("u"); return firstfn; }
	});

	// function dealing with "g" possible completions are "^", "$", "g", "t" and "T"
	gunit = chainlink({
		"g": function(){ window.scrollTo(0,0); return firstfn; },
		"t": function(){ browser_command("gt"); return firstfn; },
		"T": function(){ browser_command("gT"); return firstfn; },
		"^": function(){ browser_command("g^"); return firstfn; },
		"$": function(){ browser_command("g$"); return firstfn; }
	});
	// end chain functions

	// holds current command
	var next = firstfn;

	// holds undo for current keydown mod
	var kunext = null;

	function debug(){
		if(!DEBUG) return;
		console.log.apply(undefined, arguments);
	}

	// keydown handler
	function kd(evt){
		debug(evt.key);

		var c = evt.key;
		var mods = {
			"Shift": function(){ shifted = true; },
			"Alt": function(){ altered = true; },
			"Control": function(){ controlled = true; }
		};

		// ESC resets immediately
		if(c=="Escape"){
			if(mode==modes.insert) mode = modes.command;
			next = firstfn;
			kunext = null;
			return;
		}

		// handle modifier keys
		if(c in mods){
			mods[c]();
			return;
		}

		// we only react if we're in command mode
		if(mode!=modes.command) return;

		next = next(c);
	}

	// keyup handler
	function ku(evt){
		var c = evt.key;
		var mods = {
			"Shift": function(){ shifted = false; },
			"Alt": function(){ altered = false; },
			"Control": function(){ controlled = false; }
		};
		if(c in mods){
			debug(c + " released");
			mods[c]();
		}
	}

	window.addEventListener("keydown", kd)
	window.addEventListener("keyup", ku)
})();
