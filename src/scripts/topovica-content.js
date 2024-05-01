/**
 * activeFn holds the function to be executed at the nearest key-down event.
 * All the chained functions should accept a keyCode argument and return the next activeFn,
 * optionally executing an action along the way. Invalid combinations will reset activeFn
 * to firstFn.
 */
(function(){
	if(window.hasRun) return;
	window.hasRun = true;

	function debug(){
		console.log.apply(null, arguments);
	}

	// keystroke lexer entry point
	var firstFn = null;
	// current keystroke lexer state
	var activeFn = null;

	var modes = {"command":0,"insert":1}, mode = modes.command;

	var focusedElement = null;
	var focusIntervalId = null;
	function checkFocus(){
		var inserttags = {"SELECT":true, "TEXTAREA":true, "INPUT":true};
		// idempotence ftw.
		if(focusIntervalId){
			clearInterval(focusIntervalId);
		}
		focusIntervalId = window.setInterval(function(){
			var curr = document.activeElement;
			if(focusedElement==curr) return;
			focusedElement = curr;
			if(focusedElement.tagName in inserttags) mode = modes.insert;
		}, 20);
	}

	function unedit(){
		removeElementsByClass("topovicabtm");
	}

	function edit_fill_hints(li){
		removeElementsByClass("topovica_hint");
		var hints = document.getElementById("topovica_hints"), e, i, row;
		if(!hints) return;
		for(i=0;i<li.length;i++){
			row = document.createElement("DIV");
			row.className = "topovica_hint";
			row.id = "topovica_hint" + i;
			row.innerHTML = li[i];
			hints.appendChild(row);
		}
	}
	
	function edit_highlight_hint(offset){
		var all_hints = document.getElementsByClassName("topovica_hint"),
			l = all_hints.length,
			e;
		for(var i=0;i<l;i++){
			e = all_hints[i];
			e.style.backgroundColor = "white";
		}
		e = document.getElementById("topovica_hint"+offset);
		e.style.backgroundColor = "yellow";
	}

	// options contain the following attributes: highlighted, enter and tab
	// it is the responsibility of each command's hinter to 
	// 1) obtain its hints,
	// 2) call edit_clear_options
	// 3) fill in its hints
	// 4) provide behaviour for tabbing
	// 5) provide behaviour for when enter is pressed
	function edit_change(options){
		return function(evt){
			var input = evt.target,
				cmd = input.value.replace(/^:/,"").split(" "),
				hinters = { buffer: buffer_hinter(evt, options) },
				defaulthinter = function(cmd){
					var commands = Object.keys(hinters).filter(e => e.startsWith(cmd[0]))
					edit_clear_options(options);
					edit_fill_hints(commands);
					options.tab = function(offset){
						var trueoffset = modulo(offset, commands.length);
						edit_highlight_hint(trueoffset);
					};
					options.enter = function(offset){
						var trueoffset = modulo(offset, commands.length);
						input.value = ":" + commands[trueoffset] + " ";
						// clear existing hints
						removeElementsByClass("topovica_hint");
						var chevt = document.createEvent("HTMLEvents");
						chevt.initEvent("change", false, true);
						input.dispatchEvent(chevt);
					};
				},
				hinter = defaulthinter;

			if(cmd[0] in hinters) hinter = hinters[cmd[0]];

			hinter(cmd);
		}
	}

	function edit_clear_options(options){
		options.offset = 0;
		options.tab = null;
		options.highlighted = false;
		options.enter = null;
	}
	
	function edit(v){
		// add container
		var btm = document.createElement("DIV");
		btm.className = "topovicabtm";
		var styletmp = {fontSize: "16px", zIndex: "10000", backgroundColor:"white", bottom: "0", position:"fixed", width:"100%", "color":"red"};
		apply_style(btm, styletmp);
		document.body.appendChild(btm);

		// add rows container
		var hints = document.createElement("DIV");
		hints.id = "topovica_hints";
		btm.appendChild(hints);

		// add input element
		var input = document.createElement("INPUT");
		input.id = "topovica_input";
		var styletmp = {fontSize: "16px", outlineStyle:"none", width:"100%", "color":"red"};
		apply_style(input, styletmp);
		var options = {offset:0, highlighted: false, tab:null, enter:null};
		input.addEventListener("focus", function(evt){
			evt.target.style.outline = "0px none black";
		});

		// handles when user presses Enter or Tab
		input.addEventListener("keydown", function(evt){
			var c = evt.key;
			if(c=="Enter"){
				if(!options.enter) return;
				options.enter(options.offset);
			}

			if(c=="Tab"){
				evt.preventDefault();
				evt.stopPropagation();
				evt.stopImmediatePropagation();
				if(options.tab==null) return;
				if(options.highlighted){
					options.offset = shifted?options.offset-1:options.offset+1;
				}
				options.highlighted = true;
				options.tab(options.offset);
			}
		});

		// create the change handler, which populates the hinter
		var chfn = edit_change(options);
		var oldval = v;
		// since "change" only triggers when the input loses focus, we need to use
		// keyup event instead
		input.addEventListener("keyup", evt => {
			if(input.value==oldval) return;
			oldval = input.value;
			chfn(evt)
		});
		btm.appendChild(input);

		input.focus();
		input.value = v;

		// handle initial value
		chfn({target:input});
	}

	// returns buffer command's hinter
	function buffer_hinter(evt, options){
		return function(cmd){
			function gf(alltabs){
				edit_clear_options(options);
				var tabs = {}, searchstr = cmd.slice(1).join(" ");
				// fill tabs with only relevant results
				Object.keys(alltabs).filter(k => k.startsWith(searchstr) || alltabs[k].title.toLowerCase().includes(searchstr)).forEach(k => tabs[k] = alltabs[k]);

				var sortedkeys = Object.keys(tabs).sort((a,b)=>parseInt(a)-parseInt(b));
				var displayed = sortedkeys.map(k => `${k}: ${tabs[k].title}`);

				var firstmatch = function(){
					// prioritise index
					for(var i=0;i<sortedkeys.length;i++){
						var k = sortedkeys[i], id=tabs[k].id;
						if(k.startsWith(searchstr)){
							return id;
						}
					}
					// search titles
					for(var i=0;i<sortedkeys.length;i++){
						var k = sortedkeys[i], lowtitle = tabs[k].title.toLowerCase(), id=tabs[k].id;
						if(lowtitle.includes(searchstr)){
							return id;
						}
					}
				}();

				edit_fill_hints(displayed);
				// called when user presses tab; switches between options
				options.tab = function(offset){
					if(sortedkeys.length<1) return;
					var trueoffset = modulo(offset, sortedkeys.length);
					edit_highlight_hint(trueoffset);
				};
				// called when user presses enter; if option is highlighted,
				// fill input value with highlighted option before calling exec_edit
				options.enter = function(offset){
					if(sortedkeys.length<1) return;
					if(!options.highlighted){
						reset();
						browser_command("tabto", firstmatch);
						return;
					}

					var trueoffset = modulo(offset, sortedkeys.length);
					reset();
					browser_command("tabto", tabs[sortedkeys[trueoffset]].id)
					return;
				};
			}
			browser_command("getTabs").then(gf);
		}
	}
	// ":" functions end

	function init_follower(newtab){
		function generateKey(i){
			if(i<=0) return "A";
			var c = String.fromCharCode(65+i%26);
			i = Math.floor(i/26);
			if(i<=0) return c;
			return generateKey(i) + c;
		}
		var doclinks = document.getElementsByTagName("A"), llen = doclinks.length,
			links = {};

		// links only contain links that are in the viewport
		var count = -1;
		for(var i=0;i<llen;i++){
			var iv = link_in_viewport(doclinks[i]);
			if(!iv) continue;
			var key = generateKey(++count);
			links[key] = iv;
		}
		return follower("", links, newtab);
	}

	// follow function. creates and returns a function to follow links in current viewport
	function follower(currstr, links, newtab){
		// follow function
		function followcurrstr(cs){
			if(!(cs in links)) return firstFn;
			if(!newtab) browser_command.apply(null,["open",links[cs].href])
			else browser_command.apply(null, ["tabnew",links[cs].href])
			return firstFn;
		}
		// unpaint
		unfollow();
		// get list of links that will be visible
		var vislinks = Object.keys(links).filter(k => k.startsWith(currstr));
		// either no more matches or matched
		if(vislinks.length<2) return followcurrstr(currstr);
		// paint
		vislinks.forEach(k => {
			var ln = links[k], display = k.substr(currstr.length),
				rects = ln.getClientRects(),
				left = window.scrollX+rects[0].left,
				top = window.scrollY+rects[0].top,
				e = document.createElement("SPAN");
			e.id = "follownum" + k;
			e.className = "follownum";
			var styletmp = {fontSize: "12px", zIndex: "10000", left: left+"px", top: top+"px", position:"absolute", backgroundColor: "yellow", "color":"red"};
			apply_style(e, styletmp);
			document.body.appendChild(e);
			e.innerHTML = display;
		});
		return function(c, evt){
			// just follow current match
			if(c=="Enter"){
				unfollow();
				return followcurrstr(currstr);
			}

			currstr = c=="Backspace"?currstr.substr(0,currstr.length-1):currstr+c.toUpperCase();
			return follower(currstr, links, newtab);
		};
	}

	function unfollow(){
		removeElementsByClass("follownum");
	}

	// send message to background script
	function browser_command(){
		var cmd = {"command": arguments[0], "args":null},
			args = Array.prototype.slice.call(arguments);
		if(args.length>1) cmd.args = args.slice(1);
		return browser.runtime.sendMessage(cmd);
	}

	var shifted = false,
		altered = false,
		controlled = false;

	// create a chain function
	function chainlink(actions){
		return function(c, evt){
			try{
				if(c in actions){
					evt.preventDefault();
					evt.stopPropagation();
					evt.stopImmediatePropagation();
					return actions[c](evt);
				}
			} catch(e) {}
			return firstFn;
		};
	}

	firstFn = chainlink({
		"Pause": function(){ return init_follower(shifted); },
		"PrintScreen": function(){ return shifted?copy_address():edit(":buffer "); },
	});

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
			reset();
			return;
		}

		// handle modifier keys
		if(c in mods){
			mods[c]();
			return;
		}

		// we only react if we're in command mode
		if(mode!=modes.command) return;

		activeFn = activeFn(c, evt);
	}

	function reset(){
		debug(mode);
		if(mode==modes.insert){
			uninsert();
			unedit();
		}
		window.getSelection().removeAllRanges();
		unfollow();
		activeFn = firstFn;
	}

	function runku(evt, c, fn){
		debug(c + " released");
		evt.preventDefault();
		evt.stopPropagation();
		evt.stopImmediatePropagation();
		fn();
	}

	// keyup handler
	function ku(evt){
		var c = evt.key;
		var mods = {
			// end input commands
			"Shift": function(){ shifted = false; },
			"Alt": function(){ altered = false; },
			"Control": function(){ controlled = false; }
		};
		var enteredits = {
			// input commands need to be here cos if we use keydown, the character will be output
			// into the input box when it keyups, i.e. we will end up with "::"
			"PrintScreen": function(){ if (!shifted) edit(":buffer "); }
		};

		if(c in mods){
			runku(evt, c, mods[c]);
		}

		if(mode==modes.command && c in enteredits){
			runku(evt, c, enteredits[c]);
		}
	}

	// helpers
	// if e is not in current viewport, return false
	// otherwise, return an object with the href and its bounding rectangle
	function link_in_viewport(e) {
		var box = e.getBoundingClientRect();
		var inside = box.width && box.height &&
			box.top>=0 && box.left>=0 &&
			box.right<=document.documentElement.clientWidth &&
			box.bottom<=document.documentElement.clientHeight;
		if(!inside) return inside;
		return e;
	}

	function removeElementsByClass(className){
		var elements = document.getElementsByClassName(className);
		while(elements.length>0) elements[0].remove();
	}

	// our own modulo function
	function modulo(a,b){
		var r = a % b;
		return r<0?b+r:r;
	}

	function apply_style(e, styler){
		for(var s in styler) e.style[s] = styler[s];
	}

	function copy_address(){
		var e = document.createElement("INPUT"),
			loc = window.location.href,
			styletmp = {display:"none", left: "-9999", position:"absolute"},
			focused = document.activeElement;

		e.value = loc;
		e.setAttribute("readonly", "");
		document.body.appendChild(e);
		e.select();
		document.execCommand("copy");
		e.remove();
		focused.select();
		return firstFn;
	}

	activeFn = firstFn;
	checkFocus(); // because refresh doesn't trigger focus event
	window.addEventListener("keydown", kd, true);
	window.addEventListener("keyup", ku, true);
	// if this window is focused we need to check if focus is on an input element
	window.addEventListener("focus", checkFocus);
	// we stop checking focus when this windows has lost focus (blur)
	window.addEventListener("blur", function(){
		if(focusIntervalId!=null){ clearInterval(focusIntervalId); focusIntervalId=null; }});
})();

