
DebugLogger = Class.create({		
	initialize: function() {
		this.active = false;
		this.list = null;
		this.window = null;
	},
	
	start: function() {
		var init = new air.NativeWindowInitOptions();
		var bounds = new air.Rectangle((air.Capabilities.screenResolutionX - 325) / 2, (air.Capabilities.screenResolutionY - 300) / 2, 450, 510);
					
		init.minimizable = true;
		init.maximizable = true;
		init.resizable = true;
					
		this.window = air.HTMLLoader.createRootWindow(true, init, false, bounds);
		this.window.load(new air.URLRequest(air.File.applicationDirectory.resolvePath('debug.html').url));
		this.window.window.debug = this;
		this.window.window.nativeWindow.addEventListener(air.Event.CLOSING, function() {
			this.active = false;
			this.window = null;
		}.bind(this));
	},
	
	stop: function() {
		if (this.active) {
			this.active = false;
			this.window.window.nativeWindow.close();
		}
	},
	
	activate: function(list) {
		this.list = list;
		this.active = true;
	},
	
	log: function(description) {
		if (this.active) {
			var item = document.createElement('li');
			var desc = document.createElement('span');
			
			desc.update(description);
			
			item.appendChild(desc);
			this.list.appendChild(item);
			this.list.scrollTop = Math.max(0, this.list.scrollHeight - this.list.offsetHeight);
		}
	},
	
	logData: function(description, data) {
		if (this.active) {
			var item = document.createElement('li');
			var desc = document.createElement('span');
			var raw = document.createElement('pre');
			
			desc.update(description);
			raw.update(data);
			
			item.appendChild(desc);
			item.appendChild(raw);
			this.list.appendChild(item);
			this.list.scrollTop = Math.max(0, this.list.scrollHeight - this.list.offsetHeight);
		}
	}
});
	