/**
 * So how we are going to do this is, next will hold the next function to be executed.
 * All the chained functions should accept a keyCode argument and return next nextfn,
 * optionally executing an action along the way. Invalid combinations will reset firstfn
 * as next. Hope this approach isn't too inefficient.
 */
(function(){
	var DEBUG = true;
	var modes = {"command":0,"insert":1}, mode = modes.command;

	// focused element
	var focused = window;

    // movement function. "by" is an array specifying x and y offsets to scroll by
    function move(by){
        focused.scrollBy.apply(focused, by);
        return firstfn;
    }

    // start chain functions
    function firstfn(c){
        // actions map
        var actions = {
            // basic movements
            72: function(){ return move([-100,0]); },
            74: function(){ return move([0,50]); },
            75: function(){ return move([0,-50]); },
            76: function(){ return move([100,0]); },
            // gt, gT, g$, g^, gg
            71: function(){ return gunit; }
        }

        if(c in actions){
            return actions[c]();
        }
        return firstfn;
    }

    // function dealing with "g" possible completions are "^", "$", "g", "t" and "T"
    function gunit(c){
        debug("gunit");
        return firstfn;
    }

	// holds current command
	var next = firstfn;

	function debug(){
		if(!DEBUG) return;
		console.log.apply(undefined, arguments);
	}

	// keydown handler
	function kd(evt){
		debug(evt.keyCode);

		var c = evt.keyCode;

		// ESC resets immediately
		if(c==27){
            if(mode==modes.insert) mode = modes.command;
            next = firstfn;
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
