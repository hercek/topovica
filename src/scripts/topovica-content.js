(function(){
	var DEBUG = true;
	var modes = {"command":0,"insert":1}, mode = modes.command;
	// movement map
	var movements = {
		72: function(){ focused.scrollBy(-100,0); },
		74: function(){ focused.scrollBy(0,50); },
		75: function(){ focused.scrollBy(0,-50); },
		76: function(){ focused.scrollBy(100,0); }
	}

	// holds current command
	var cmdbuffer = Array();

	// focused element
	var focused = window;

	function debug(){
		if(!DEBUG) return;
		console.log.apply(undefined, arguments);
	}

	function clearbuf(){
		cmdbuffer.splice(0,cmdbuffer.length)
	}

	// if buffer is in this state, execute command
	function dispatch(){
		// check for movements
		if(cmdbuffer.length==1 && (cmdbuffer in movements)){
			movements[cmdbuffer[0]]();
			clearbuf();
			return;
		}
	}

	function toggle_mode(){
		mode = mode==modes.command?modes.insert:modes.command;
	}

	// keydown handler
	function kd(evt){
		debug(evt.keyCode);
		// we only react if we're in command mode
		if(mode!=modes.command) return;

		var c = evt.keyCode;

		// ESC clears buffer immediately
		if(c==27){
			clearbuf()
			return;
		}

		cmdbuffer.push(c);
		debug(cmdbuffer);
		dispatch();
	}

	window.addEventListener("keydown", kd)
	
})();
