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

	// current search term
	var currfind = null;

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
	//TODO convert this to the more self-contained style we use for buffers
	function unedit(){
		removeElementsByClass("topovicabtm");
	}
	
	function edit(v){
        // add container
		var btm = document.createElement("DIV");
		btm.className = "topovicabtm";
		var styletmp = {zIndex: "10000", bottom: "0", position:"fixed", width:"100%", display:"none", "color":"red"};
		apply_style(btm, styletmp);
		document.body.appendChild(btm);
		btm.style.display = "block";

        // add rows container
        var hints = document.createElement("DIV");
        hints.className = "topovicabtm_hints";
        btm.appendChild(hints);

        // add input element
		var input = document.createElement("INPUT");
		input.id = "tpvcinput";
		var styletmp = {fontSize: "11px", outlineStyle:"none", width:"100%", "color":"red"};
		apply_style(input, styletmp);
		input.addEventListener("focus", function(evt){
			evt.target.style.outline = "0px none black";
		});
		input.addEventListener("keydown", function(evt){
			var c = evt.key;
			if(c!="Enter") return;
			exec_edit();
		});
		//TODO: implement autocomplete maybe, sometime.
		input.addEventListener("change", function(evt){});
		btm.appendChild(input);

		input.focus();
		input.value = v;
		return firstfn;
	}

	function exec_edit(){
        var input = document.getElementById("tpvcinput"), cmd="";
        if(input) cmd = input.value.replace(/^:/,"").split(" ");
		uninsert();
		unedit();
		// do something
		var colons = {
			"o": opener,
			"open": opener,
			"tabnew": tabnew,
			"set": setter
		};
		if(!(cmd[0] in colons)) return;

		colons[cmd[0]].apply(null, cmd.slice(1, cmd.length));
	}

	function setter(){
		var settees = {
			"debug": function(){ DEBUG=true; browser_command("debug"); },
			"nodebug": function(){ DEBUG=false; browser_command("nodebug"); }
		}
		if(arguments[0] in settees){
			settees[arguments[0]]();
		}
	}
	
	function tabnew(){
		var args = ["tabnew"];
		for(var i=0;i<arguments.length;i++) args.push(arguments[i]);
		browser_command.apply(null, args);
	}

	function opener(){
		var args = ["open"];
		for(var i=0;i<arguments.length;i++) args.push(arguments[i]);
		browser_command.apply(null, args);
	}
	// ":" functions end

	// movement function. "by" is an array specifying x and y offsets to scroll by
	function move(by){
		window.scrollBy.apply(window, by);
		return firstfn;
	}

	function init_follower(newtab){
		var doclinks = document.getElementsByTagName("A"), llen = doclinks.length,
			links = {};

		// links only contain links that are in the viewport
		var count = 0;
		for(var i=0;i<llen;i++){
			var iv = link_in_viewport(doclinks[i]);
			if(!iv) continue;
			links[++count] = iv;
		}
		return follower("", links, newtab);
	}

	// follow function. creates and returns a function to follow links in current viewport
	function follower(currstr, links, newtab){
		// follow function
		function followcurrstr(cs){
			if(!(cs in links)) return firstfn;
			if(!newtab) browser_command.apply(null,["open",links[cs].href])
			else browser_command.apply(null, ["tabnew",links[cs].href])
			return firstfn;
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
				rect = ln.getBoundingClientRect(),
				left = window.scrollX+rect.left,
				top = window.scrollY+rect.top,
				e = document.createElement("SPAN");
			e.id = "follownum" + k;
			e.className = "follownum";
			var styletmp = {fontSize: "11px", zIndex: "10000", left: left+"px", top: top+"px", position:"absolute", backgroundColor: "yellow", "color":"red"};
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

			currstr = c=="Backspace"?currstr.substr(0,currstr.length-1):currstr+c;
			return follower(currstr, links, newtab);
		};
	}

	// delete bufferpicker div
	function delete_bufferpicker(){
		removeElementsByClass("topovica_bufferpicker");
	}

	function delete_finder(){
		if(currfind && currfind.highlighted){
			currfind.highlighted=false;
			browser_command("unfind");
		}
		removeElementsByClass("topovica_finder");
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
		// search functions
		"/": finder,
		"n": function() { return find_next(false); },
		"N": function() { return find_next(true); },
		// b: unlike in vimperator, this doesn't go into edit mode
		"b": function(){ return bufferpicker(); },
		// G
		"G": function(){
			var limit = Math.max( document.body.scrollHeight, document.body.offsetHeight, document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight) - window.innerHeight;
			return move([0,limit]);
		},
		// delete and undo, big down and big up
		"d": function(){
			if(controlled) return move([0,500]);
			browser_command("d"); return firstfn;
		},
		"u": function(){
			if(controlled) return move([0,-500]);
			browser_command("u"); return firstfn;
		},
		// back and forward
		"i": function(evt){
			if(controlled){
				window.history.forward();
			}
			return firstfn;
		},
		"o": function(evt){
			if(controlled){
				window.history.back();
			}
			return firstfn;
		},
		// link
		"f": function(){ return init_follower(false); },
		"F": function(){ return init_follower(true); },
		// copy
		"y": copy_address,
		// refresh
		"r": function(){ window.location.reload(true); return firstfn; },
		"R": function(){ window.location.reload(false); return firstfn; }
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
		console.log.apply(null, arguments);
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

		next = next(c, evt);
	}

	function reset(){
		debug(mode);
		if(mode==modes.insert){
			uninsert();
			unedit();
		}
		window.getSelection().removeAllRanges();
		unfollow();
		delete_bufferpicker();
		delete_finder();
		next = firstfn;
		kunext = null;
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
			":": function(){ edit(":"); },
			"o": function(){ if(!controlled) edit(":open "); }
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
		return firstfn;
	}

	// takes care of search
	function finder(){
		var fdiv = document.createElement("DIV");
		fdiv.className = "topovica_finder";
		fdiv.id = "topovica_finder";
		var styletmp = {fontSize: "11px", backgroundColor:"white", zIndex:"10000", bottom: "0", position:"fixed", width:"100%", "color":"red"};
		apply_style(fdiv, styletmp);
		document.body.appendChild(fdiv);

		var finput = document.createElement("INPUT");
		finput.className = "topovica_finder_input";
		finput.value = `/`;
		var styletmp = {fontSize: "11px", outlineStyle:"none", width:"100%", "color":"red"};
		apply_style(finput, styletmp);
		finput.onkeypress = function(evt){
			var c = evt.key;
			var iv = evt.target.value;
			if(!iv.startsWith("/")){
				currfind = null;
				reset();
				return;
			}
			if(c=="Enter"){
				browser_command("find", iv.substring(1,iv.length)).then(res => {
					currfind = {highlighted: true, ranges: []}
					for(var rd of res.rangeData){
						currfind.ranges.push(rd)
					}
					currfind.index = currfind.ranges.length-1;
					find_next(false);
				}, err => {
					debug(`error in find: ${err}`);
				});
				reset();
			}
		}
		fdiv.appendChild(finput);
		finput.focus();
		return firstfn;
	}

	// looks for next search result
	function find_next(backwards){
		if(!currfind.highlighted) return firstfn;
		currfind.index = backwards?currfind.index-1:currfind.index+1;
		currfind.index = currfind.index % currfind.ranges.length;
		// ugh. no real mod operator in js
		currfind.index = currfind.index<0?currfind.ranges.length+currfind.index:currfind.index;

		var rd = currfind.ranges[currfind.index], selection = window.getSelection(), range = document.createRange(),
			walker = document.createTreeWalker(document, window.NodeFilter.SHOW_TEXT,null,false),
			idx = 0;

		while(idx<=rd.endTextNodePos) {
			var n = walker.nextNode();
			if(n==null){
				reset();
				return firstfn;
			}

			if(idx==rd.startTextNodePos){
				range.setStart(n, rd.startOffset);
				var pe = n.parentElement;
				// scroll to selection
				if(pe) pe.scrollIntoView({behavior:"auto",block:"center",inline:"center"});
			}
			if(idx==rd.endTextNodePos) {
				range.setEnd(n, rd.endOffset);
				selection.removeAllRanges();
				selection.addRange(range);
				return firstfn;
			}
			idx++;
		}
	}

	// takes care of switching buffers
	function bufferpicker(){
		var tabs = {}, browcntr = null, bp = null, binput = null,
		searchstr = "", sortedkeys = [];
		// add bufferpicker 
		var add_bufferpicker = function(alltabs){
			tabs = alltabs;
			bp = document.createElement("DIV");
			bp.className = "topovica_bufferpicker";
			bp.id = "topovica_bufferpicker";
			var styletmp = {fontSize: "11px", backgroundColor:"white", zIndex:"10000", bottom: "0", position:"fixed", width:"100%", "color":"red"};
			apply_style(bp, styletmp);
			document.body.appendChild(bp);

			browcntr = document.createElement("DIV");
			browcntr.id = "topovica_bufferpicker_row_container";
			bp.appendChild(browcntr);
	
			add_brows();
			add_binput();
		};
	
		var add_brows = function(){
			sortedkeys = Object.keys(tabs).sort((a,b)=>parseInt(a)-parseInt(b));
	
			sortedkeys.forEach(k=>{
				var title = tabs[k].title,
					lowtitle = title.toLowerCase();
				if(!k.startsWith(searchstr) && !lowtitle.includes(searchstr)) return;
				var brow = document.createElement("DIV");
				brow.className = "topovica_bufferpicker_row";
				brow.innerHTML = `${k}: ${title}`;
				browcntr.appendChild(brow);
			})
		};

		var add_binput = function(){
			binput = document.createElement("INPUT");
			binput.className = "topovica_bufferpicker_input";
			binput.readOnly = true;
			binput.value = `:b ${searchstr}`;
			var styletmp = {fontSize: "11px", outlineStyle:"none", width:"100%", "color":"red"};
			apply_style(binput, styletmp);
			bp.appendChild(binput);
			binput.focus();
			binput.onkeypress = binputkeypress;
		}
	
		var del_brows = function(){
			removeElementsByClass("topovica_bufferpicker_row");
		}

		var firstmatch = function(){
			// prioritise index
			for(var i=0;i<sortedkeys.length;i++){
				var k = sortedkeys[i], id=tabs[k].id;
				if(k.startsWith(searchstr)){
					reset();
					browser_command("tabto", id);
					return;
				}
			}
			// search titles
			for(var i=0;i<sortedkeys.length;i++){
				var k = sortedkeys[i], lowtitle = tabs[k].title.toLowerCase(), id=tabs[k].id;
				if(lowtitle.includes(searchstr)){
					reset();
					browser_command("tabto", id);
					return;
				}
			}
		}

		var binputkeypress = function(evt){
			var c = evt.key;
			if(c=="Enter"){
				firstmatch();
			}
			searchstr = c=="Backspace"?searchstr.substr(0,searchstr.length-1):searchstr+c;
			binput.value = `:b ${searchstr}`;
			del_brows();
			add_brows();
		};
		browser_command("b").then(add_bufferpicker, reset);
	
		return firstfn;
	}

	checkFocus(); // because refresh doesn't trigger focus event
	window.addEventListener("keydown", kd, true);
	window.addEventListener("keyup", ku, true);
	// if this window is focused we need to check if focus is on an input element
	window.addEventListener("focus", checkFocus);
	// on blur, we stop checking focus
	window.addEventListener("blur", function(){ if(fint!=null){ clearInterval(fint); fint=null; }});
})();

