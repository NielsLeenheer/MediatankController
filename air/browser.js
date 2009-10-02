Browser = Class.create({		
	initialize: function(path, options) {
		this.options = Object.extend({
			dropdown: 	null,
			list:		null,
			up:			null,
			queue:		null,
			loading:	null
		}, options || {});
	
		this.queue = [];			
		this.list = new BrowserList(this, this.options.list);
		this.dropdown = new BrowserDropdown(this, this.options.dropdown, this.options.up);
		
		Event.observe(this.options.queue, 'click', function() {
			air.trace('queueClick');
			if (this.queue.length) {
				mediatank.playQueue(this.queue);
			}			
		}.bind(this));
		
		this.openDirectory(path, 'Home');
	},
	
	openFile: function(path, type) {
		this.list.hide();
		Element.show(this.options.loading);
		
		window.setTimeout(function() {
			this.list.show();
			Element.hide(this.options.loading);
		}.bind(this), 6000);

		mediatank.playFile(path, type);
	},
	
	openDirectory: function(path, name) {
		this.dropdown.push(path, name);
		this.loadDirectory(path);
	},
	
	loadDirectory: function(path) {
		this.current = path;		
		Element.hide(this.options.queue);
		this.list.clear();
		
		mediatank.getDirectory(path, function(data) {
			if (this.current == path) {
				this.list.prepare();
				this.queue = [];
					
				for (var i = 0; i < data.length; i++) {
					if (data[i].type == 'directory' || mediatypes.isVisible(data[i].path)) {
						if (mediatypes.isHidden(data[i].path)) {
							continue;
						}
							
						var type = data[i].type;
						type = mediatypes.isAudio(data[i].path) ? 'audio' : type;
						type = mediatypes.isVideo(data[i].path) ? 'video' : type;
						type = mediatypes.isDVD(data[i].path) ? 'dvd' : type;
							
						this.list.add(data[i].path, data[i].name, type);

						if (type == 'audio') {
							this.queue.push(data[i]);
						}
					}
						
					if (this.queue.length) {
						Element.show(this.options.queue);
					}
				}
			}
		}.bind(this));
	}
});


BrowserDropdown = Class.create({
	initialize:	function(parent, dropdown, up) {
		this.parent = parent;
		this.queue = [];

		this.label = document.createElement('span');
		dropdown.appendChild(this.label);
		
		this.contextMenu = null;
		Event.observe(this.label, 'click', function(event) {
			event.preventDefault(); 
			var pos = Element.viewportOffset(this.label);
			this.contextMenu.display(window.nativeWindow.stage, pos[0], pos[1]+42); 
		}.bind(this));
		
		this.up = up;
		Event.observe(this.up, 'click', this.goBack.bind(this));
		this.up.disabled = true;
	},
	
	push: function(path, name) {
		this.queue.push({
			'name': name,
			'path': path
		});
		
		this.updateMenu();

		if (utf8.detect(name)) {
			name = utf8.decode(name);
		}

		this.label.update(name);
		this.up.disabled = false;
	},
	
	updateMenu: function() {
		this.contextMenu = new air.NativeMenu(); 
		
		var command = null;
		
		for (var i = 0; i < this.queue.length; i++) {
			var name = this.queue[i].name;
			
			if (utf8.detect(name)) {
				name = utf8.decode(name);
			}
			
		    command = this.contextMenu.addItem(new air.NativeMenuItem(name)); 
			command.addEventListener(air.Event.SELECT, function(i) {
				this.goItem(i);
			}.bind(this, i)); 
		}
		
		command.checked = true;
	},
	
	goItem: function(selection) {
		for (var i = this.queue.length - 1; i > selection; i--) {
			this.queue.splice(i, 1);
		}

		this.updateMenu();
		
		if (this.queue.length <= 1) {
			this.up.disabled = true;
		}
		
		var fresh = this.queue[this.queue.length - 1];

		if (utf8.detect(fresh.name)) {
			fresh.name = utf8.decode(fresh.name);
		}

		this.label.update(fresh.name);
		this.parent.loadDirectory(fresh.path);
	},
	
	goBack: function() {
		var stale = this.queue.pop();

		this.updateMenu();
		
		if (this.queue.length <= 1) {
			this.up.disabled = true;
		}
		
		var fresh = this.queue[this.queue.length - 1];

		if (utf8.detect(fresh.name)) {
			fresh.name = utf8.decode(fresh.name);
		}

		this.label.update(fresh.name);
		this.parent.loadDirectory(fresh.path);
	}
});


BrowserList = Class.create({
	initialize:	function(parent, list) {
		this.parent = parent;
		this.list = list;
	},
	
	hide: function() {
		Element.hide(this.list);
	},
	
	show: function() {
		Element.show(this.list);
	},
	
	clear: function() {
		list.update('');
		list.addClassName('loading');
	},
	
	prepare: function() {
		list.removeClassName('loading');
	},
	
	add: function(path, name, type) {
		var item = document.createElement('li');
		var link = document.createElement('a');
		
		var n = name;
		if (utf8.detect(n)) {
			n = utf8.decode(n);
		}		

		link.href = '#';
		link.className = type;
		link.update(n);
							
		Event.observe(link, 'click', function(path, name, type){
			if (type == 'directory') {
				this.parent.openDirectory(path + '/', name);
			} else {
				this.parent.openFile(path, type);
			}
		}.bind(this, path, name, type));
							
		item.appendChild(link);
		this.list.appendChild(item);
	}
});






var mediatypes = {
	isHidden: function (file) {
		if (file.lastIndexOf("/") != -1) {
			file = file.substr(file.lastIndexOf("/") + 1);
		}
  
		switch (file.toLowerCase()) {
			case 'network_browser':
			case 'lost+found':
			case 'audio_ts':
			case '_theme_':
			case '$recycle.bin':
				return true;
		}
				
		return false;
	},

	isVideo: function (file) {
		if (file.lastIndexOf(".") != -1) {
			switch(file.substr(file.lastIndexOf(".")).toLowerCase()) {
				case '.mkv':
				case '.avi':
				case '.asf':
				case '.wmv':
				case '.mov':
				case '.mp4':
				case '.m4v':
				case '.mpg':
				case '.ts':
				case '.vob':
				case '.dat':
				case '.mpeg':
				case '.m2ts':
				case '.divx':
					return true;
			}
		}
		if (mediatypes.isDVD(file)) {
			return true;
		}
				
		return false;
	},
			
	isDVD: function (file) {
		if (file.substr(-8).toLowerCase() == 'video_ts') {
			return true;
		}
		
		if (file.substr(-4).toLowerCase() == '.iso') {
			return true;
		}
		
		return false;
	},

	isAudio: function (file) {
		if (file.lastIndexOf(".") != -1) {
			switch (file.substr(file.lastIndexOf(".")).toLowerCase()) {
				case '.mp3':
				case '.m4a':
				case '.wma':
				case '.aac':
				case '.ac3':
				case '.dts':
				case '.wav':
				case '.pcm':
				case '.flac':
					return true;
			}
		}
		
		return false;
	},

	isVisible: function (file) {
		return mediatypes.isVideo(file) || mediatypes.isAudio(file);
	}
};
