

Manager = Class.create();
Manager.prototype = {
	initialize: function(application, options) {
		this.application = application;
		this.options = options;
		this.buttons = [];

		this.current = null;
		this.element = null;
		
		if (this.options.parent) {
			this.options.parent = $(this.options.parent);
			
			if (this.options.areas) {
				for (var id in this.options.areas) {
					this.options.areas[id] = Object.extend({
						name: 'Untitled',
						value: 0
					}, this.options.areas[id]);
					
					var element = document.createElement('li');
					this.options.parent.appendChild(element);
					
					var link = document.createElement('a');
					link.target = 'ignore';
					link.rel = id;
					link.addEventListener('click', this.onClick.bindAsEventListener(this));
					element.appendChild(link);
					
					var status = document.createElement('div');
					if (this.options.areas[id].value) {
						status.title = this.options.areas[id].value;
					} else {
						status.style.display = 'none';
				}
					link.appendChild(status);
					
					var text = document.createTextNode(this.options.areas[id].name);
					link.appendChild(text);
					
					this.options.areas[id].link = link;
					this.options.areas[id].status = status;
				}
			}
		}
	},

	activate: function() {
		this.application.storage.read('managerCurrent', function(id) {
			if (this.application.loader.current == 'about') {
				return;
			}
									
			this.select(id);

			if (!this.current) {
				this.select(this.options.standard);
			}

			if (this.options.onActivate) {
				this.options.onActivate(this.current);
			}
		}.bind(this), function() {
			if (this.application.loader.current == 'about') {
				return;
			}
									
			this.select(this.options.standard);

			if (this.options.onActivate) {
				this.options.onActivate(this.current);
			}
		}.bind(this));
	},
	
	update: function(id, value) {
		if (this.options.areas[id]) {
			if (value) {
				this.options.areas[id].status.title = value;
				this.options.areas[id].status.style.display = 'block';
			} else {
				this.options.areas[id].status.title = '';
				this.options.areas[id].status.style.display = 'none';
			}
		}
	},
	
	select: function(id) {
		if (this.element) {
			Element.removeClassName(this.element, 'selected');
		}

		if (this.options.areas[id]) {
			this.element = this.options.areas[id].link;
			this.current = id;

			Element.addClassName(this.element, 'selected');
				this.application.storage.write('managerCurrent', this.current);
			}
	},
	
	onClick: function(event) {
		event.preventDefault();
		
		var element = event.target;
		while (element.tagName.toLowerCase() != 'a') {
			element = element.parentNode;
		}

		if (this.element != element) {
			if (this.element) {
				Element.removeClassName(this.element, 'selected');
			}
			
			this.element = element;
			this.current = this.element.rel;

			Element.addClassName(this.element, 'selected');
			this.application.storage.write('managerCurrent', this.current);
		
			if (this.options.onChange) {
				this.options.onChange(this.current, true);
			}
		} else {
			if (this.options.onHome) {
				this.options.onHome(this.current);	
			}
		}
	}
};


Refresh = Class.create();
Refresh.prototype = {
	initialize: function(application, element, options) {
		this.application = application;
		this.options = options;
		this.element = $(element);
		
		this.visible = true;
		
		this.element.style.webkitTransitionProperty = 'opacity';
		this.element.style.webkitTransitionDuration = '200ms';
		this.element.addEventListener('click', this.onClick.bindAsEventListener(this));
		this.element.addEventListener('gesturehold', this.onGestureHold.bindAsEventListener(this));
		
		document.addEventListener('offline', this.update.bindAsEventListener(this));
		document.addEventListener('online', this.update.bindAsEventListener(this));
	},
	
	hide: function() {
		this.visible = false;
		this.update();
	},
	
	show: function() {
		this.visible = true;
		this.update();
	},
	
	update: function() {
		if (this.visible && !this.application.offline) {
			this.element.style.opacity = 1;
		} else {
			this.element.style.opacity = 0;
		}
	},
	
	onClick: function(e) {
		e.preventDefault();
		
		if (e.ctrlKey) {
			if (this.options.onOption) {
				this.options.onOption();
			}
		} else {
			if (this.options.onClick) {
				this.options.onClick();
			}
		}
	},
	
	onGestureHold: function(e) {
		e.preventDefault();
		
		if (this.options.onOption) {
			this.options.onOption();
		}
	}
};

Keyboard = Class.create();
Keyboard.prototype = {
	initialize: function(element, cb) {
		this.callback = cb;
		this.parent = $(element);

		this.field = document.createElement('input');
		this.field.type = 'text';
		this.field.style.position = 'absolute';
		this.field.style.top = 0;
		this.field.style.left = 0;
		this.field.style.opacity = 0;
		this.field.style.margin = 0;
		this.field.style.padding = 0;
		this.field.addEventListener('focus', this.onFocus.bindAsEventListener(this));
		this.field.addEventListener('blur', this.onBlur.bindAsEventListener(this));
		this.field.addEventListener('keypress', this.onKeypress.bindAsEventListener(this));
		this.field.addEventListener('keydown', this.onKeydown.bindAsEventListener(this));
		this.parent.appendChild(this.field);
		
		this.refresh();
	},
	
	refresh: function() {
		window.setTimeout(function() {
			this.update();
	  	}.bind(this), 0);
	},
	
	update: function() {
		var width = this.parent.offsetWidth;
		var height = this.parent.offsetHeight;
		this.field.style.width = width + 'px';
		this.field.style.height = height + 'px';
	},
	
	onKeydown: function(event) {
		if (this.callback) {
			if (event.keyCode == 8) {
				this.callback(event.keyCode);
			}
		}
	},
	
	onKeypress: function(event) {
		if (this.callback) {
			if (event.keyCode == 10) {
				this.callback(13);
				return;
			}
		
			this.callback(event.keyCode);
		}
	},
	
	onFocus: function(event) {
		this.field.style.left = '-2000px';
		Element.addClassName(this.parent, 'enabled');

		window.setTimeout(function() {
			this.field.select();
		}.bind(this), 50);
	},
	
	onBlur: function(event) {
		this.field.style.left = 0;
		this.field.value = ' ';
		
		Element.removeClassName(this.parent, 'enabled');
	}
};
		

PopupBalloon = Class.create();
PopupBalloon.active = false;
PopupBalloon.prototype = {
	initialize: function(el, x, y, options, data) {
		this.element = el;
		this.balloon = null;
		this.options = options;
		this.data = data;
		this.x = x;
		this.y = y;
		
		// Semaphore
		PopupBalloon.active = true;

		// Setup global events
		if (window.Touch) addEventListener('touchstart', this, true);
		addEventListener('click', this, true);

		// Create balloon
		this.balloon = document.createElement('div');
		this.balloon.id = 'balloon';
		this.balloon.className = 'balloon down';
		this.balloon.style.top = '160px';
		this.balloon.style.left = '160px';
		this.balloon.style.opacity = 0;
		this.balloon.style.webkitTransitionProperty = 'opacity';
		this.balloon.style.webkitTransitionDuration = '500ms';
		
		var tip = document.createElement('div');
		this.balloon.appendChild(tip);
		
		var list = document.createElement('ul');
		this.balloon.appendChild(list);
		
		for (i = 0; i < this.options.length; i++) {
			var item = document.createElement('li');
			list.appendChild(item);
			
			var link = document.createElement('a');
			link.target = 'ignore';
			link.href = '#';
			
			link.addEventListener('click', function(event, action) {
				event.preventDefault();
				event.stopPropagation();
				action(this.data);
				this.close();
			}.bindAsEventListener(this, this.options[i].action), true);
			
			item.appendChild(link);
			
			var text = document.createTextNode(this.options[i].title);
			link.appendChild(text);
		}

		var tip = document.createElement('div');
		this.balloon.appendChild(tip);
		document.body.appendChild(this.balloon);
		
		// Position balloon
		var width = this.balloon.offsetWidth;
		var left = (this.x - Math.round(width / 2));
		left = Math.max(20, Math.min(window.innerWidth - width - 20, left));
		this.balloon.style.top = (this.y - 50) + 'px';
		this.balloon.style.left = left + 'px';
		this.balloon.style.opacity = 1;

		// Select the list item
		Element.addClassName(this.element, 'selection');

		// Add improved click handler
		new EnhancedClickHandler(this.balloon, { className: 'focus', prevent: true, moveBack: true });	
	},
	
	handleEvent: function(e) {
		switch(e.type) {
			case 'touchstart': this.onTouchStart(e); break;
			case 'click': this.onClick(e); break;
		}
	},
	
	onTouchStart: function(e) {
		if (!this.isBalloon(e.target)) {
			window.setTimeout(function() {
				this.close();
			}.bind(this), 0);
		}
	},
	
	onClick: function(e) {
		if (!this.isBalloon(e.target)) {
			window.setTimeout(function() {
				this.close();
			}.bind(this), 0);
		}
	},
	
	isBalloon: function(element) {
		if (element.nodeType == 3) element = element.parentNode;
		while (element.tagName.toLowerCase() != 'html') {
			if (element == this.balloon) {
				return true;	
			}
			
			element = element.parentNode;
		}
		
		return false;
	},
	
	close: function() {
		if (window.Touch) removeEventListener('touchstart', this, true);
		removeEventListener('click', this, true);

		Element.removeClassName(this.element, 'selection');

		window.setTimeout(function() {
			// Semaphore
			PopupBalloon.active = false;
			
			if (this.balloon) {
				this.balloon.addEventListener('webkitTransitionEnd', this.remove.bind(this), false);
				this.balloon.style.opacity = 0;
			}
	   	}.bind(this), 100);
	},

	remove: function() {
		if (this.balloon) {
			// Remove
			this.balloon.parentNode.removeChild(this.balloon);	

		}
	}
};



