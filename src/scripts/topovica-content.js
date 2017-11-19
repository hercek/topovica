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

	// start chain functions
	firstfn = chainlink({
		// basic movements
		"h": function(){ return move([-100,0]); }, // left
		"j": function(){ return move([0,50]); }, // down
		"k": function(){ return move([0,-50]); }, // up
		"l": function(){ return move([100,0]); }, // right
		// gt, gT, g$, g^, gg
		"g": function(){ return gunit; }
	});

	// function dealing with "g" possible completions are "^", "$", "g", "t" and "T"
	gunit = chainlink({
		"g": function(){ window.scrollTo(0,0); return firstfn; },
		"Shift": function(){ return gunit; }
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

		// ESC resets immediately
		if(c=="Escape"){
			if(mode==modes.insert) mode = modes.command;
			next = firstfn;
			kunext = null;
			return;
		}

		// we only react if we're in command mode
		if(mode!=modes.command) return;

		next = next(c);
	}

	// keyup handler
	function ku(evt){ }

	window.addEventListener("keydown", kd)
	window.addEventListener("keyup", ku)
})();
