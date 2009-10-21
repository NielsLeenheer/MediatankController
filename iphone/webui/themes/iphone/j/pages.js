

Contents = Class.create();
Contents.prototype = {
	initialize: function(application) {
		this.application = application;
		this.history = [];

		this.loading = { id: null };
	},
	
	activate: function(id) {
		this.application.storage.read('contentsHistory', function(history) {
			if (history.length == 0) {
				history.push('home');	
			}
			
			this.replace(history);
		}.bind(this), function() {
			this.replace(['home']);
		}.bind(this));
	},
	
	restore: function() {
		if (!this.history.length) {
			this.activate();
			return;
		}

		this.replace(this.history);
	},
	
	home: function() {
		var id = this.history[this.history.length - 1];

		if (id != 'home') {
			this.history = [];
			this.application.loader.clearHistory();
			this.application.loader.goto('home', true);
		}
	},

	refresh: function() {
		if (this.history.length) {
			var id = this.history[this.history.length - 1];
			Pages.list[id].refresh();
		}	
	},

	top: function() {
		if (!this.application.standalone) {
			window.scrollTo(0,0);
			return;
		}
		
		if (this.history.length) {
			var id = this.history[this.history.length - 1];
			Pages.list[id].top();
		}	
	},

	replace: function(history) {
		var pages = $A(history);
		
		function create(pages, t) {
			var id = pages.pop();
			
			
			if (!$(id)) {
				new Page(t, id, {
					onSuccess: function() {
						if (pages.length) {
							create(pages, t);
						} else {
							insert(t);
						}
					},
					onFailure: function() {
					}
				});
			} else {
				if (pages.length) {
					create(pages, t);
				} else {
					insert(t);
				}
			}
		}

		function insert(t) {
			this.application.loader.clearHistory();

			for (i = 0; i < history.length - 1; i++) {
				this.application.loader.insertIntoHistory($(history[i]));
			}

			var id = history.pop();
			t.history = history;

			this.application.loader.gotoWithoutAnimation(id);
		}
		
		create(pages, this);
	},

	goto: function(id, callback) {
		if (this.loading.id) {
			if (this.loading.id == id) {
				this.loading.callback();
				this.loading = { id: null };
				return;
			}

			callback();
			return;
		}

		this.loading = { id: id, callback: callback };

		if (!$(id)) {
			new Page(this, id, {
				onSuccess: 	
					function() {
						if (this.application.manager.current == 'contents' && this.loading.id == id) {
							this.application.loader.goto(id);
						}
						callback();
					}.bind(this),
				onFailure:	
					function() {
						callback();
					}.bind(this)
			});
		} else {
			if (this.application.manager.current == 'contents') {
				this.application.loader.goto(id);
			}
			
			callback();
		}
	},
	
	onPageChanged: function(id) {
		if (this.loading.id) {
			if (this.loading.id != id) {
				this.loading.callback();
			}

			this.loading = { id: null };
		}

		if (id == 'home' || id == 'services' || id.substr(0, 5) == 'upnp_' || id.substr(0, 10) == 'connector_' || id.substr(0, 11) == 'filesystem_') {
			for (i = this.history.length - 1; i >= 0; i--) {
				if (this.history[i] == id) {
					this.history.splice(i);
				}
			}
				
			this.history.push(id);
			
			if (this.history[0] != 'home') {
				this.history.unshift('home');
			}
	
			this.application.storage.write('contentsHistory', this.history);
		}
	}
};




Favorites = Class.create();
Favorites.prototype = {
	initialize: function(application, element) {
		this.application = application;
		this.element = $(element);

		/* Defaults */
		this.history = [];
		this.data = [];
		this.loading = { id: null };
		this.editing = false;

		/* Page events */
		document.addEventListener('onBeforePageChange', this.onBeforePageChange.bindAsEventListener(this));
		document.addEventListener('onAfterPageChange', this.onAfterPageChange.bindAsEventListener(this));

		/* Build basic page structure */
		this.content = document.createElement('div');
		this.content.className = 'content';
		this.element.appendChild(this.content);

		this.buttons = document.createElement('div');
		this.buttons.className = 'buttons';
		this.buttons.style.display = 'none';
		this.element.appendChild(this.buttons);
		
		this.editButton = document.createElement('a');
		this.editButton.className = 'toolbarButton';
		this.editButton.rel = 'startEditing';
		this.editButton.target = 'ignore';
		this.editButton.addEventListener('click', this.startEditing.bindAsEventListener(this));
		this.editButton.appendChild(document.createTextNode('Edit'));
		this.buttons.appendChild(this.editButton);
		new EnhancedClickHandler(this.editButton, { hold: true, className: 'focus', moveBack: true, prevent: true });

		this.doneButton = document.createElement('a');
		this.doneButton.className = 'toolbarButton blue';
		this.doneButton.style.display = 'none';
		this.doneButton.rel = 'stopEditing';
		this.doneButton.target = 'ignore';
		this.doneButton.addEventListener('click', this.stopEditing.bindAsEventListener(this));
		this.doneButton.appendChild(document.createTextNode('Done'));
		this.buttons.appendChild(this.doneButton);
		new EnhancedClickHandler(this.doneButton, { hold: true, className: 'focus', moveBack: true, prevent: true });

		/* Load data */
		this.application.storage.read('favorites', this.load.bind(this), this.update.bind(this));
	},

	activate: function() {
		this.application.storage.read('favoritesHistory', function(history) {
			if (history.length == 0) {
				history.push('favorites');	
			}
												 
			this.replace(history);
		}.bind(this), function() {
			this.replace(['favorites']);
		}.bind(this));
	},
	
	restore: function() {
		if (!this.history.length) {
			this.activate();
			return;
		}

		this.replace(this.history);
	},

	home: function() {
		var id = this.history[this.history.length - 1];

		if (id != 'favorites') {
			this.history = [];
			this.application.loader.clearHistory();
			this.application.loader.goto('favorites', true);
		}
	},

	refresh: function() {
		if (this.history.length) {
			var id = this.history[this.history.length - 1];

			if (id !== 'favorites') {
				Pages.list[id].refresh();
			}
		}	
	},
	
	top: function() {
		if (!this.application.standalone) {
			window.scrollTo(0,0);
			return;
		}
		
		if (this.history.length) {
			var id = this.history[this.history.length - 1];

			if (id == 'favorites') {
				if (this.scroll) {
					this.scroll.scrollTo(0);
				}
			} else {
				Pages.list[id].top();
			}
		}	
	},

	replace: function(history) {
		var pages = $A(history);
		
		function create(pages, t) {
			var id = pages.pop();
			
			
			if (!$(id)) {
				new Page(t, id, function() {
					if (pages.length) {
						create(pages, t);
					} else {
						insert(t);
					}
				});
			} else {
				if (pages.length) {
					create(pages, t);
				} else {
					insert(t);
				}
			}
		}

		function insert(t) {
			this.application.loader.clearHistory();

			for (i = 0; i < history.length - 1; i++) {
				this.application.loader.insertIntoHistory($(history[i]));
			}

			var id = history.pop();
			t.history = history;

			this.application.loader.gotoWithoutAnimation(id);
		}
		
		create(pages, this);
	},

	goto: function(id, callback) {
		if (this.loading.id) {
			if (this.loading.id == id) {
				this.loading.callback();
				this.loading = { id: null };
				return;
			}

			callback();
			return;
		}

		this.loading = { id: id, callback: callback };

		if (!$(id)) {
			new Page(this, id, {
				onSuccess: 	
					function() {
						if (this.application.manager.current == 'favorites' && this.loading.id == id) {
							this.application.loader.goto(id);
						}
						callback();
					}.bind(this),
				onFailure:	
					function() {
						callback();
					}.bind(this)
			});
		} else {
			if (this.application.manager.current == 'favorites') {
				this.application.loader.goto(id);
			}
			
			callback();
		}
	},
	
	onBeforePageChange: function(e) {
		if (e.from == 'favorites') {
			Effect.Fade(this.buttons);
		}

		if (e.to == 'favorites') {
			Effect.Appear(this.buttons);
		}
	},
	
	onAfterPageChange: function(e) {
		if (this.application.manager.current == 'favorites') {
			if (this.loading.id) {
				if (this.loading.id != e.to) {
					this.loading.callback();
				}

				this.loading = { id: null };
			}

			if (e.to == 'favorites' || e.to == 'services' || e.to.substr(0, 5) == 'upnp_' || e.to.substr(0, 10) == 'connector_' || e.to.substr(0, 11) == 'filesystem_') {
				for (i = this.history.length - 1; i >= 0; i--) {
					if (this.history[i] == e.to) {
						this.history.splice(i);
					}
				}
				
				this.history.push(e.to);
			
				if (this.history[0] != 'favorites') {
					this.history.unshift('favorites');
				}

				this.application.storage.write('favoritesHistory', this.history);
			}
		}
	},

	load: function(data) {
		this.data = data;
		this.update();
	},

	save: function() {
		this.application.storage.write('favorites', this.data);
	},

	startEditing: function(e) {
		e.preventDefault();

		Sortable.create(this.list, {
			hoverclass: 'hover',
			handle: 'handle',
			only: 'item'
		});		

		this.editing = true;
		Element.addClassName(this.element, 'editing');

		Element.hide(this.editButton);
		Element.show(this.doneButton);
	},

	stopEditing: function(e) {
		e.preventDefault();
		
		this.orderFavorites(Sortable.sequence(this.list));
		Sortable.destroy(this.list);
		
		this.editing = false;
		Element.removeClassName(this.element, 'editing');

		Element.show(this.editButton);
		Element.hide(this.doneButton);
	},

	orderFavorites: function(order) {
		var data = [];
		
		for (i = 0; i < order.length; i++){
			for (j = 0; j < this.data.length; j++) {
				if (this.data[j].uniqueid == order[i]) {
					data.push(this.data[j]);
					break;
				}
			}
		}
		
		this.data = data;
		this.save();
	},

	clear: function(data) {
		this.data = [];
		this.save();
		this.update();
	},

	add: function(item) {
		item.uniqueid = createUUID();
		this.data.unshift(item);
		this.save();
		this.update();
	},

	remove: function(item) {
		for (i = 0; i < this.data.length; i++) {
			if (this.data[i].id == item.id) {
				this.data.splice(i, 1);
				break;
			}
		}

		this.save();
		this.update();
	},

	showBalloon: function(e, d) {
		e.preventDefault();
		e.stopPropagation();

		var element = e.target;
		while (element.tagName.toLowerCase() != 'a') {
			element = element.parentNode;
		}

		var actions = [
			{ title: 'Remove', action: this.remove.bind(this) }
		];

		window.setTimeout(function() {
			new PopupBalloon(element, e.x, e.y, actions, d);
		}, 0);
	},
	
	goLocation: function(e, d) {
		if (d.type == 'dir' || d.type == 'root') {
			e.preventDefault();
			e.stopPropagation();
			
			var element = e.target;
			while (element.tagName.toLowerCase() != 'a') {
				element = element.parentNode;
			}
			
			element.setAttribute("selected", "progress");
			this.goto(d.id, function() {
				element.removeAttribute("selected");
			}.bind(this));
		}
	},

	onClick: function(e, d) {
		if (this.editing || PopupBalloon.active) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}
			
		this.goLocation(e, d);
	},
	
	onGestureHold: function(e, d) {
		if (this.editing || PopupBalloon.active) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		
		this.showBalloon(e, d);
	},
	
	update: function() {
		this.content.innerHTML = '';
		
		/* Create scrolling container for our buttons and list */
		this.container = document.createElement('div');
		this.container.className = 'container'
		this.content.appendChild(this.container);
		if (this.application.standalone) {
			this.scroll = new iScroll(this.container);
		} else {
			new EnhancedClickHandler(this.container, { hold: true, className: 'focus' });	
		}
		
		
		/* Explaination */
		if (this.data.length == 0) {
			var block = document.createElement("div");
			block.className = 'information';
			block.innerHTML = "<b>Please add some Favorites</b><br/>Go to the contents of your NMT and navigate to the folder or disk that contains the item you want to add. Hold down your finger on the item for at least half a second. Then release your finger and a popup balloon will appear. Now select <em>Add to favorites</em>.";
			this.container.appendChild(block);
		}


		/* Create the list with playlist items */
		this.list = document.createElement("ul");
		this.list.id = 'list_' + this.id;
		this.list.className = 'list';
		this.container.appendChild(this.list);  				

		for (i = 0; i < this.data.length; i++) {
			var item = document.createElement("li");
			item.id = 'item_' + this.data[i].uniqueid;
			item.className = this.data[i].icon != '' ? 'hasIcon item' : 'item';
			this.list.appendChild(item);
				
			var link = document.createElement("a");
			link.className = this.data[i].type;
			link.title = this.data[i].name;
			link.addEventListener('click', this.onClick.bindAsEventListener(this, this.data[i]));
			link.addEventListener('gesturehold', this.onGestureHold.bindAsEventListener(this, this.data[i]));
			item.appendChild(link);
				
			if (this.data[i].type == 'dir' || this.data[i].type == 'root') {
				link.href = '#' + this.data[i].id;
			} else {
				link.href = '../../index.php?action=play&' + this.data[i].type + '=' + encodeURIComponent(this.data[i].path);
			}
				
			if (this.data[i].icon != '') {
				var img = document.createElement("img");
				img.className = 'icon';
				img.src = 'i/l/icon-' + this.data[i].icon + '.png';
				link.appendChild(img);
			}
				
			var span = document.createElement("span");
			if (this.data[i].type == 'root') {
				span.className = 'title alternate';
			} else {
				span.className = 'title';
			}
				
			var text = document.createTextNode(' ' + this.data[i].name);
			span.appendChild(text);
			link.appendChild(span);

			var div = document.createElement("div");
			div.className = 'handle';
			item.appendChild(div);
		}		
	}
};



Pages = Class.create();
Pages.list = {};


Page = Class.create();
Page.prototype = {
	initialize: function(parent, id, options) {
		Pages.list[id] = this;

		this.id = id;
		this.parent = parent;
		this.options = options;

		this.element = null;
		this.scroll = null;

		this.parent.application.storage.read(id, 
			function(data) {
				this.element = document.createElement("div");
				this.element.id = id;

				this.content = document.createElement('div');
				this.content.className = 'content';
				this.element.appendChild(this.content);

				var loading = document.createElement("div");
				loading.className = 'loading';
				this.content.appendChild(loading);
				
				$('pages').appendChild(this.element);  				
				
				this.create(data)
			}.bind(this), 
			function () {
				if (this.parent.application.offline) {
					if (this.options.onFailure) {
						this.options.onFailure();
					}
					return;	
				}
				
				this.element = document.createElement("div");
				this.element.id = id;
				
				this.content = document.createElement('div');
				this.content.className = 'content';
				this.element.appendChild(this.content);

				var loading = document.createElement("div");
				loading.className = 'loading';
				this.content.appendChild(loading);
				
				$('pages').appendChild(this.element);  				
				
				this.retrieve(id, this.create.bind(this), this.createFailure.bind(this));
			}.bind(this)
		);
	},

	top: function() {
		if (this.scroll) {
			this.scroll.scrollTo(0);
		}
	},

	refresh: function() {
		this.retrieve(this.id, this.replace.bind(this), this.replaceFailure.bind(this));
	},

	retrieve: function(id, success, failure) {
		try {
		var req = new XMLHttpRequest();
		
		req.onerror = function() {
			if (failure) {
				failure();
			}
		};

		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				if (req.status == 200) {
					var data = req.responseText.evalJSON();
					this.parent.application.storage.write(id, data);
	
					if (success) {
						success(data);
					}
				} else {
					if (failure) {
						failure();
					}
				}
			}
		}.bind(this);
 
		req.open("GET", "../../index.php?action=retrieve&id=" + id, true);
		req.send(null);
		} catch(e) {
			alert("Retrieve error: " + e);
			return;
		}					
	},

	create: function(data) {
		this.content.innerHTML = '';
		this.updateTitle(data.title);
		this.build(data);

		if (this.options.onSuccess) {
			this.options.onSuccess();
		}
	},

	createFailure: function() {
		alert('Could not retrieve data from your NMT');

		if (this.options.onFailure) {
			this.options.onFailure();
		}
	},

	replace: function(data) {
		this.content.innerHTML = '';
		this.build(data);
	},

	replaceFailure: function() {
		alert('Could not retrieve data from your NMT');
	},

	updateTitle: function(title) {
		this.element.title = title;
		this.parent.application.loader.updateTitle();
	},
	
	showBalloon: function(e, d) {
		e.preventDefault();
		e.stopPropagation();

		var element = e.target;
		while (element.tagName.toLowerCase() != 'a') {
			element = element.parentNode;
		}

		var actions = [
			{ title: 'Add to favorites', action: this.parent.application.favorites.add.bind(this.parent.application.favorites) }
		];

		if (d.type == 'dir' || d.type == 'root') {
			if (!this.parent.application.offline && d.id.substr(0, 11) == 'filesystem_') {
				if (this.parent.application.watchfolder.folder != d.path) {
					actions.push({ title: 'Set Watchfolder', action: this.parent.application.watchfolder.change.bind(this.parent.application.watchfolder) });
				} else {
					actions.push({ title: 'Clear Watchfolder', action: this.parent.application.watchfolder.clear.bind(this.parent.application.watchfolder) });
				}
			}
		} 
		
		window.setTimeout(function() {
			new PopupBalloon(element, e.x, e.y, actions, d);
		}, 0);
	},
	
	goLocation: function(e, d) {
		if (d.type == 'upnp' || d.type == 'dir' || d.type == 'root') {
			e.preventDefault();
			e.stopPropagation();
			
			var element = e.target;
			while (element.tagName.toLowerCase() != 'a') {
				element = element.parentNode;
			}
			
			element.setAttribute("selected", "progress");
			this.parent.goto(d.id, function() {
				element.removeAttribute("selected");
			}.bind(this));
		}
	},

	onClick: function(e, d) {
		if (PopupBalloon.active) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		
		if (e.ctrlKey) {
			this.showBalloon(e, d);
			return;
		}
		
		this.goLocation(e, d);
	},
	
	onGestureHold: function(e, d) {
		if (PopupBalloon.active) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		
		this.showBalloon(e, d);
	},
	
	build: function(data) {
		/* Create scrolling container for our buttons and list */
		this.container = document.createElement('div');
		this.container.className = 'container'
		this.content.appendChild(this.container);
		if (this.parent.application.standalone) {
			this.scroll = new iScroll(this.container);
		} else {
			new EnhancedClickHandler(this.container, { hold: true, className: 'focus' });	
		}
		
		
		/* Create inline header for our buttons */
		this.header = document.createElement("ul");
		this.header.className = 'buttons';
		this.container.appendChild(this.header); 

		var audioDetected = [];
		for (i = 0; i < data.files.length; i++) {
			if (data.files[i].icon == 'audio') {
				audioDetected.push('files[' + encodeURI(data.files[i].name) + ']=' + encodeURIComponent(data.files[i].path));	
			}
		}
			
		if (audioDetected.length) {
			var item = document.createElement("li");
			item.className = 'buttons';
			this.header.appendChild(item);

			var link = document.createElement("a");
			link.appendChild(document.createTextNode('Play all music'));
			link.href = '../../index.php?action=play&' + audioDetected.join('&');
			item.appendChild(link);
		}


		/* Create the list with playlist items */
		var list = document.createElement("ul");
		list.className = 'list';
		this.container.appendChild(list);  				

		for (i = 0; i < data.files.length; i++) {
			var item = document.createElement("li");
			item.className = data.files[i].icon != '' ? 'hasIcon' : '';
				
			var link = document.createElement("a");
			link.className = data.files[i].type;
			link.title = data.files[i].name;
			link.addEventListener('click', this.onClick.bindAsEventListener(this, data.files[i]));
			link.addEventListener('gesturehold', this.onGestureHold.bindAsEventListener(this, data.files[i]));
			
			if (data.files[i].type == 'upnp' || data.files[i].type == 'dir' || data.files[i].type == 'root') {
				link.href = '#' + data.files[i].id;
			} else {
				link.href = '../../index.php?action=play&' + data.files[i].type + '=' + encodeURIComponent(data.files[i].path);
			}

			if (data.files[i].icon != '') {
				var img = document.createElement("img");
				img.className = 'icon';
				img.src = 'i/l/icon-' + data.files[i].icon + '.png';
				link.appendChild(img);
			}
				
				
			var span = document.createElement("span");
			if (data.files[i].type == 'root') {
				span.className = 'title alternate';
			} else {
				span.className = 'title';
			}
				
			var text = document.createTextNode(' ' + data.files[i].name);
			span.appendChild(text);
			link.appendChild(span);
			item.appendChild(link);
			list.appendChild(item);
		}
	}
};


WatchFolder = Class.create();
WatchFolder.prototype = {
	initialize: function(application, element) {
		this.application = application;
		this.element = $(element);
		
		this.content = document.createElement('div');
		this.content.className = 'content';
		this.element.appendChild(this.content);
		
		this.data = [];
		this.folder = '';
		this.interval = 5 * 60 * 1000;
		this.timer = window.setInterval(this.ping.bind(this), this.interval + 20000);
		window.setTimeout(this.ping.bind(this), 20000);

		this.application.storage.read('watchfolder', this.load.bind(this), this.update.bind(this));
	},
	
	activate: function() {
		this.application.loader.clearHistory();
		this.application.loader.gotoWithoutAnimation(this.element.id);
	},
	
	restore: function() {
		this.activate();
	},

	refresh: function() {
		window.clearInterval(this.timer);
		this.timer = window.setInterval(this.ping.bind(this), this.interval);
		
		this.fetch();
	},
	
	top: function() {
		if (!this.application.standalone) {
			window.scrollTo(0,0);
			return;
		}
		
		if (this.scroll) {
			this.scroll.scrollTo(0);
		}
	},

	load: function(data) {
		this.folder = data.folder;
		this.data = data.data;
		this.update();
		this.updateCounter();
	},

	save: function() {
		this.application.storage.write('watchfolder', {
			'folder': this.folder,
			'data':	this.data			  
		});
	},
	
	clear: function() {
		this.folder = '';
		this.data = [];

		this.save();
		this.update();
		this.updateCounter();
	},
	
	change: function(item) {
		this.folder = item.path;
		this.data = [];

		this.save();
		this.update();
		this.updateCounter();

		window.clearInterval(this.timer);
		this.timer = window.setInterval(this.ping.bind(this), this.interval);
		
		this.fetch(true);
	},
	
	markAsNew: function(item) {
		for (var i = 0; i < this.data.length; i++) {
			if (this.data[i].id == item.id) {
				Element.removeClassName(this.list.childNodes[i], 'marked');
				this.data[i].state = 0;
				break;
			}
		}

		this.save();
		this.updateCounter();
		
		// Notify NMT of removal...
		var req = new XMLHttpRequest();
		req.open("GET", "../../index.php?action=watchfolder&file=" + encodeURIComponent(item.path) + "&command=unmark", true);
		req.send(null);
	},
	
	markAsWatched: function(item) {
		for (var i = 0; i < this.data.length; i++) {
			if (this.data[i].id == item.id) {
				Element.addClassName(this.list.childNodes[i], 'marked');
				this.data[i].state = 1;
				break;
			}
		}

		this.save();
		this.updateCounter();
		
		// Notify NMT of removal...
		var req = new XMLHttpRequest();
		req.open("GET", "../../index.php?action=watchfolder&file=" + encodeURIComponent(item.path) + "&command=mark", true);
		req.send(null);
	},
	
	markAllAsWatched: function() {
		for (var i = 0; i < this.data.length; i++) {
			Element.addClassName(this.list.childNodes[i], 'marked');
			this.data[i].state = 1;
		}

		this.save();
		this.updateCounter();
		
		// Notify NMT of removal...
		var req = new XMLHttpRequest();
		req.open("GET", "../../index.php?action=watchfolder&file=*&command=mark", true);
		req.send(null);
	},
	
	remove: function() {
		for (var i = this.data.length - 1; i >= 0; i--) {
			if (this.data[i].state == 1) {
				Element.remove(this.list.childNodes[i]);
				this.data.splice(i, 1);
			}
		}
		
		this.save();
		this.updateCounter();
		
		// Notify NMT of removal...
		var req = new XMLHttpRequest();
		req.open("GET", "../../index.php?action=watchfolder&command=removeMarked", true);
		req.send(null);
	},
	
	ping: function() {
		this.fetch();
	},
	
	fetch: function(clear) {
		if (this.application.offline) {
			return;
		}
		
		if (this.folder != '') {
			var req = new XMLHttpRequest();
			
			req.onreadystatechange = function() {
				if (req.readyState == 4) {
					var data = req.responseText.evalJSON();
					
					this.data = data;
					this.save();
					this.update();
					this.updateCounter();
				}
			}.bind(this);
	 
			req.open("GET", "../../index.php?action=watchfolder&directory=" + encodeURIComponent(this.folder) + (clear ? '&reset=true' : ''), true);
			req.send(null);
		}
	},

	showBalloon: function(e, d) {
		e.preventDefault();
		e.stopPropagation();

		var element = e.target;
		while (element.tagName.toLowerCase() != 'a') {
			element = element.parentNode;
		}

		if (d.state == 0) {
			var actions = [
				{ title: 'Mark as watched', action: this.markAsWatched.bind(this) }
			];
		}
					
		if (d.state == 1) {
			var actions = [
				{ title: 'Mark as new', action: this.markAsNew.bind(this) }
			];
		}

		window.setTimeout(function() {
			new PopupBalloon(element, e.x, e.y, actions, d);
		}, 0);
	},
	
	onClick: function(e, d) {
		if (PopupBalloon.active) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		
		if (this.application.offline) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}

		if (e.ctrlKey) {
			this.showBalloon(e, d);
			return;
		}
		
		this.markAsWatched(d);	
	},
	
	onGestureHold: function(e, d) {
		if (PopupBalloon.active) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		
		this.showBalloon(e, d);
	},
	
	update: function() {
		this.content.innerHTML = '';
		
		/* Create scrolling container for our buttons and list */
		this.container = document.createElement('div');
		this.container.className = 'container'
		this.content.appendChild(this.container);
		if (this.application.standalone) {
			this.scroll = new iScroll(this.container);
		} else {
			new EnhancedClickHandler(this.container, { hold: true, className: 'focus' });	
		}
		
		
		/* Create inline header for our buttons */
		this.header = document.createElement("ul");
		this.header.className = 'buttons';
		this.container.appendChild(this.header); 

		var item = document.createElement("li");
		this.header.appendChild(item);

		var link = document.createElement("a");
		link.appendChild(document.createTextNode('Mark all watched'));
		link.target = 'ignore'; 
		link.addEventListener('click', function(event, data) {
			if (!this.application.offline && this.folder != '') {
				this.markAllAsWatched();	
			}
		}.bindAsEventListener(this, this.data[i]));
		item.appendChild(link);

		if (this.data.length == 0) {
			Element.addClassName(item, 'disabled'); 
		}

		var item = document.createElement("li");
		this.header.appendChild(item);

		var link = document.createElement("a");
		link.appendChild(document.createTextNode('Remove watched'));
		link.target = 'ignore'; 
		link.addEventListener('click', function(event, data) {
			if (!this.application.offline && this.folder != '') {
				this.remove();	
			}
		}.bindAsEventListener(this, this.data[i]));
		item.appendChild(link);

		if (this.folder == '') {
			Element.addClassName(item, 'disabled'); 
		}


		/* Explaination */
		if (this.folder == '') {
			var block = document.createElement("div");
			block.className = 'information';
			block.innerHTML = "<b>Please assign a Watchfolder</b><br/>Go to the contents of your NMT and navigate to the folder or disk that contains the folder you want to assign. Hold down your finger on the folder for at least half a second. Then release your finger and a popup balloon will appear. Now select <em>Watch Folder</em>.";
			this.container.appendChild(block);
		}
		

		/* Create the list with watchfolder items */
		this.list = document.createElement("ul");
		this.list.className = 'list';
		this.container.appendChild(this.list); 

		for (i = 0; i < this.data.length; i++) {
			var item = document.createElement("li");
			item.className = 'hasMark';
			if (this.data[i].state == 1) {
				Element.addClassName(item, 'marked');
			}

			if (this.data[i].icon != '') {
				Element.addClassName(item, 'hasIcon');
			}
			
			var link = document.createElement("a");
			link.className = this.data[i].type;
			link.title = this.data[i].name;
			link.href = '../../index.php?action=play&' + this.data[i].type + '=' + encodeURIComponent(this.data[i].path);
			link.addEventListener('click', this.onClick.bindAsEventListener(this, this.data[i]));
			link.addEventListener('gesturehold', this.onGestureHold.bindAsEventListener(this, this.data[i]));

			var span = document.createElement("span");
			span.className = 'mark';
			link.appendChild(span);

			if (this.data[i].icon != '') {
				var img = document.createElement("img");
				img.className = 'icon';
				img.src = 'i/l/icon-' + this.data[i].icon + '.png';
				link.appendChild(img);
			}
				
			var span = document.createElement("span");
			span.className = 'title';
			var text = document.createTextNode(' ' + this.data[i].name);
			span.appendChild(text);
			link.appendChild(span);

	
			var path = this.data[i].path.replace(this.folder, '').replace(this.data[i].name, '');
			if (path != '') {
				if (path.substr(-1) == '/') {
					path = path.substr(0, path.length - 1);
				}

				var span = document.createElement("span");
				span.className = 'path';
				var text = document.createTextNode(path);
				span.appendChild(text);
				link.appendChild(span);
			}

			item.appendChild(link);
			this.list.appendChild(item);
		}		
	},
	
	updateCounter: function() {
		var counter = 0;
		
		for (i = 0; i < this.data.length; i++) {
			if (this.data[i].state == 0) {
				counter++;	
			}
		}
		
		this.application.manager.update('watchfolder', counter);
	}
}


Remote = Class.create();
Remote.prototype = {
	initialize: function(application, element) {
		this.application = application;
		this.element = $(element);
		
		new EnhancedClickHandler('keyboard', { hold: true, className: 'focus' });
		this.keyboard = new Keyboard('keyboard', function(keycode) {
			var req = new XMLHttpRequest();
			req.open("GET", "../../index.php?action=sendCommand&command=custom&key=" + keycode, true);
			req.send(null);
		});

		new EnhancedClickHandler('playback', { highlight: true, prevent: this.application.standalone, moveBack: true });
		
		if (this.application.standalone) {
			this.scroll = new iScroll($('buttons'));
		} else {
			new EnhancedClickHandler('buttons', { hold: true, className: 'focus' });	
		}
		
		$('remoteTitle').addEventListener('click', function() {
			this.top();
		}.bind(this));
	},
	
	activate: function() {
		this.keyboard.refresh();
		
		this.application.loader.clearHistory();
		this.application.loader.gotoWithoutAnimation(this.element.id);
	},
	
	restore: function() {
		this.activate();	
	},

	top: function() {
		if (!this.application.standalone) {
			window.scrollTo(0,0);
			return;
		}
		
		if (this.scroll) {
			this.scroll.scrollTo(0);
		}
	}
};


About = Class.create();
About.prototype = {
	initialize: function(application, element) {
		this.application = application;
		this.element = $(element);
		
		if (this.application.standalone) {
			this.scroll = new iScroll(document.getElementById('aboutScroller'));
		}
	},

	activate: function() {
		this.application.loader.clearHistory();
		this.application.loader.gotoWithoutAnimation(this.element.id);
	},

	top: function() {
		if (!this.application.standalone) {
			window.scrollTo(0,0);
			return;
		}
		
		if (this.scroll) {
			this.scroll.scrollTo(0);
		}
	}
};


