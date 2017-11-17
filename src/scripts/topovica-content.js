(function(){
	var modes = {"command":0,"insert":1}, mode = modes.command;

	function toggle_mode(){
		mode = mode==modes.command?modes.insert:modes.command;
	}
})();
