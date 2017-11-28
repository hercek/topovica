/**
 * So how we are going to do this is, next will hold the next function to be executed.
 * All the chained functions should accept a keyCode argument and return next nextfn,
 * optionally executing an action along the way. Invalid combinations will reset firstfn
 * as next. Hope this approach isn't too inefficient.
 */
(function(){
	if(window.hasRun) return;
	window.hasRun = true;

	// declare chain functions
	var firstfn = null,
		gunit = null;

	var DEBUG = true;
	var modes = {"command":0,"insert":1}, mode = modes.command;
	//
	// ":" variables
	var btm_elem = null,
		btm_input = null;

	var focd = null;

	var fint = null;

	function checkFocus(){
		var inserttags = {"SELECT":true, "TEXTAREA":true, "INPUT":true};
		// idempotence ftw.
		if(fint){
			clearInterval(fint);
		}
		fint = window.setInterval(function(){
			var curr = document.activeElement;
			if(focd==curr) return;
			focd = curr;
			if(focd.tagName in inserttags) mode = modes.insert;
		}, 20);
	}

	// ":" functions begin
	function unedit(){
		btm_input.value = "";
		btm_elem.style.display = "none";
	}
	
	function edit(){
		add_btm();
		btm_elem.style.display = "block";
		btm_input.focus();
		return firstfn;
	}

	function exec_edit(){
		var cmd = btm_input.value.replace(/^:/,"").split(" ");
		uninsert();
		unedit();
		// do something
		var colons = {
			"o": opener,
			"open": opener,
		};
		if(!(cmd[0] in colons)) return;

		colons[cmd[0]].apply(null, cmd.slice(1, cmd.length));
	}

	function opener(){
		window.location.href = Array.prototype.slice.call(arguments).join(arguments);
	}
	// ":" functions end

	// movement function. "by" is an array specifying x and y offsets to scroll by
	function move(by){
		window.scrollBy.apply(window, by);
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
		// input commands
		":": function(){ return edit(":"); },
		// basic movements
		"h": function(){ return move([-100,0]); }, // left
		"j": function(){ return move([0,50]); }, // down
		"k": function(){ return move([0,-50]); }, // up
		"l": function(){ return move([100,0]); }, // right
		// gt, gT, g$, g^, gg
		"g": function(){ return gunit; },
		// G
		"G": function(){
			var limit = Math.max( document.body.scrollHeight, document.body.offsetHeight, document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight) - window.innerHeight;
			return move([0,limit]);
		},
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

	// goes back to command mode
	function uninsert(){
		mode = modes.command;
		// blur from insert element
		el = document.activeElement;
		el.blur();
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
			debug(mode);
			if(mode==modes.insert){
				uninsert();
				unedit();
			}
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

	// add topovicabtm div
	function add_btm(){
		if(document.getElementById("topovicabtm")) return;
		btm_elem = document.createElement("DIV");
		btm_elem.id = "topovicabtm";
		var styletmp = {zIndex: "10000", bottom: "0", position:"fixed", width:"100%", display:"none", "color":"red"};
		for(var k in styletmp) btm_elem.style[k] = styletmp[k];
		document.getElementsByTagName("body")[0].appendChild(btm_elem);
		add_btm_input();
	}

	// add bottom input
	function add_btm_input(){
		// add the input element to topovicabtm
		btm_input = document.createElement("INPUT");
		btm_input.id = "tpvcbtm_input";
		styletmp = {outlineStyle:"none", width:"100%", "color":"red"};
		for(var k in styletmp) btm_input.style[k] = styletmp[k];
		btm_input.addEventListener("focus", function(evt){
			evt.target.style.outline = "0px none black";
		});
		btm_input.addEventListener("keydown", function(evt){
			var c = evt.key;
			if(c!="Enter") return;
			exec_edit();
		});
		//TODO: implement autocomplete maybe, sometime.
		btm_input.addEventListener("change", function(evt){});
		btm_elem.appendChild(btm_input);
	}

	checkFocus(); // because refresh doesn't trigger focus event
	window.addEventListener("keydown", kd);
	window.addEventListener("keyup", ku);
	// if this window is focused we need to check if focus is on an input element
	window.addEventListener("focus", checkFocus);
	// on blur, we stop checking focus
	window.addEventListener("blur", function(){ if(fint!=null){ clearInterval(fint); fint=null; }});
})();
