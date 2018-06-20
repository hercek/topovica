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

	var DEBUG = false;
	var modes = {"command":0,"insert":1}, mode = modes.command;

	// current search term
	var currfind = null;

	var focd = null;

	// current scroll element
	var scrollE = document.documentElement;

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
				hinters = {
					open: open_hinter(evt, options),
					tabnew: open_hinter(evt, options),
					buffer: buffer_hinter(evt, options),
					set: function(){
						edit_clear_options(options);
						options.enter = function(){
							exec_edit();
						};
					}
				},
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
		var styletmp = {fontSize: "11px", zIndex: "10000", backgroundColor:"white", bottom: "0", position:"fixed", width:"100%", "color":"red"};
		apply_style(btm, styletmp);
		document.body.appendChild(btm);

		// add rows container
		var hints = document.createElement("DIV");
		hints.id = "topovica_hints";
		btm.appendChild(hints);

		// add input element
		var input = document.createElement("INPUT");
		input.id = "topovica_input";
		var styletmp = {fontSize: "11px", outlineStyle:"none", width:"100%", "color":"red"};
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

	// this is inconsistent with the buffer stuff, but oh well
	function exec_edit(){
		var input = document.getElementById("topovica_input"), cmd="";
		if(input) cmd = input.value.replace(/^:/,"").split(" ");
		uninsert();
		unedit();
		// do something
		var colons = {
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

	// returns hinter for open and tabnew
	function open_hinter(evt, options){
		return function(cmd){
			// links should be an array where each element is an array containing [title, link]
			function gf(links){
				edit_clear_options(options);
				var hlinks = links.map(l => l.join(" "));	
				edit_fill_hints(hlinks);
				// called when user presses tab; switches between options
				options.tab = function(offset){
					var trueoffset = modulo(offset, links.length);
					edit_highlight_hint(trueoffset);
				};
				// called when user presses enter; if option is highlighted,
				// fill input value with highlighted option before calling exec_edit
				options.enter = function(offset){
					if(!options.highlighted) return exec_edit();
					var trueoffset = modulo(offset, links.length);
					evt.target.value = ":" + cmd[0] + " " + links[trueoffset][1];
					exec_edit()
				};
			}

			browser_command("open_hints", cmd.slice(1).join(" ")).then(gf);
		}
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
			browser_command("b").then(gf);
		}
	}
	// ":" functions end

	// movement function. "by" is an array specifying x and y offsets to scroll by
	function move(by){
		scrollE.scrollBy.apply(scrollE, by);
		return firstfn;
	}

	// navigate scrollE
	function change_scroll(backwards){
		var all_scrolls = [];
		populate_all_scrolls(document.documentElement, all_scrolls)
		debug(`all_scrolls length is ${all_scrolls.length}`)
		var i, nextscroll=null;
		for(i=0;i<all_scrolls.length;i++){
			if(scrollE==all_scrolls[i]){
				nextscroll = backwards?i-1:i+1;
				break
			}
		}
		if(nextscroll == null)
			scrollE = document.documentElement;
		else
			scrollE = all_scrolls[nextscroll];
		flash_scroll();
	}

	function populate_all_scrolls(e, all_scrolls){
		if(scrollable(e) || e == document.documentElement){
			all_scrolls.push(e);
		}
		var children = e.children, clen = children.length;
		for(var i=0;i<clen;i++){
			populate_all_scrolls(children[i], all_scrolls)
		}
	}

	function scrollable_style(e) {
		let { overflowX, overflowY } = window.getComputedStyle(e);
		return !(overflowX !== 'scroll' && overflowX !== 'auto' &&
			overflowY !== 'scroll' && overflowY !== 'auto');
	}

	function overflowed(e) {
		return e.scrollWidth > e.clientWidth ||
			e.scrollHeight > e.clientHeight;
	}
	
	function scrollable(e){
		return scrollable_style(e) && overflowed(e);
	}

	// flash scrollE for a sec
	function flash_scroll(){
		var oldcolor = scrollE.style.backgroundColor;
		scrollE.scrollIntoView({behavior:"auto",block:"center",inline:"center"});
		scrollE.style.backgroundColor = "yellow";
		window.setTimeout(()=>{ scrollE.style.backgroundColor = oldcolor; },500);
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
				rects = ln.getClientRects(),
				left = window.scrollX+rects[0].left,
				top = window.scrollY+rects[0].top,
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
		"g": function(){ scrollE.scrollTo(0,0); return firstfn; },
		"e": function(){ change_scroll(false); return firstfn; },
		"E": function(){ change_scroll(true); return firstfn; },
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
			"o": function(){ if(!controlled) edit(":open "); },
			"b": function(){ edit(":buffer "); }
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
		currfind.index = modulo(currfind.index, currfind.ranges.length);

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

	checkFocus(); // because refresh doesn't trigger focus event
	window.addEventListener("keydown", kd, true);
	window.addEventListener("keyup", ku, true);
	// if this window is focused we need to check if focus is on an input element
	window.addEventListener("focus", checkFocus);
	// on blur, we stop checking focus
	window.addEventListener("blur", function(){ if(fint!=null){ clearInterval(fint); fint=null; }});
})();

