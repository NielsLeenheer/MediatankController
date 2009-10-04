(function() {
	var timestamp = new Date().getTime();

	function checkResume() {
		var current = new Date().getTime();
		if (current - timestamp > 4000) {
			var event = document.createEvent("Events"); 
			event.initEvent("resume", true, true); 
			document.dispatchEvent(event); 
		}
		timestamp = current;
	}
	
	window.setInterval(checkResume, 1000);
})();	
	
	
	
Ping = Class.create();
Ping.prototype = {
	initialize: function(application) {
		this.application = application
		this.interval = window.setInterval(this.ping.bind(this), 30 * 1000);
	},
	
	ping: function() {
		var req = new XMLHttpRequest();

		req.onerror = function() {
			this.application.offline = true;
		}.bind(this);

		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				this.application.offline = false;
			}
		}.bind(this);

		req.open("GET", "../../index.php?action=ping", true);
		req.send(null);
	}
};



Storage = Class.create();
Storage.prototype = {
	initialize: function(options) {
		this.options = options;
		this.database = null;
		
		try {
			if (window.openDatabase) {
				this.database = openDatabase(this.options.shortName, '1.0', this.options.displayName, 65536);
				
				if (this.database) {
					this.database.transaction(function (transaction) {
						transaction.executeSql('CREATE TABLE IF NOT EXISTS storage (key TEXT PRIMARY KEY NOT NULL DEFAULT "", data TEXT NOT NULL DEFAULT "");');
					});        			
				}
			}
		} catch(e) {
		}					
	},
		
	read: function(key, success, fallback) {
		if (!this.database) {
			fallback();
			return;
		}					
			
		this.database.transaction(function (transaction) {
			transaction.executeSql("SELECT data FROM storage WHERE key=?;", [ key ], function(transaction, results) {
				if (results.rows.length) {
					var row = results.rows.item(0);
					success(JSON.parse(row['data']));
				} else {
					fallback();
				}
			}, fallback);
		});					
	},
		
	write: function(key, data) {
		if (!this.database) {
			return;
		}
			
		var json = JSON.stringify(data);
			
		this.database.transaction(function (transaction) {
			transaction.executeSql("INSERT OR REPLACE INTO storage (key, data) VALUES (?, ?);", [ key, json ]); 
		});
	},
		
	clear: function(callback) {
		if (!this.database) {
			return;
		}
			
		this.database.transaction(function (transaction) {
			transaction.executeSql("DELETE FROM storage;", [], callback); 
			transaction.executeSql('DROP TABLE storage;');
		});
	}
};


IUILoader = Class.create();
IUILoader.prototype = {
	initialize: function(options) {
		this.options = options;
		this.current = null;
		
		iui.onPagePrepare(this.onPrepare.bind(this));
		iui.onPageChange(this.onChange.bind(this));
	},
	
	onPrepare: function(id) {
		this.options.onPrepare(id);
	},

	onChange: function(id) {
		this.current = id;
		this.options.onChange(id);
	},
	
	clearHistory: function() {
		iui.clearHistory();
	},
	
	insertIntoHistory: function(page) {
		iui.insertIntoHistory(page);
	},
	
	goto: function(id, backwards) {
		iui.showPage($(id), backwards);
	},
	
	gotoWithoutAnimation: function (id) {
		iui.updatePage($(id), iui.getCurrentPage());
	}
};


EnhancedClickHandler = Class.create();
EnhancedClickHandler.prototype = {
	initialize: function(el, options) {
		this.element = $(el);
		this.turbo = options ? false || options.turbo : false;
		this.highlight = options ? false || options.highlight : false;
		this.hold = options ? false || options.hold : false;
		this.className = options ? false || options.className : false;
		this.prevent = options ? false || options.prevent : false;
		this.moveBack = options ? false || options.moveBack : false;
	
		this.target = null;
	
		if (window.Touch) {
			this.element.addEventListener('touchstart', this, false);
			this.element.addEventListener('click', this, true);
		}
	},

	handleEvent: function(e) {
		switch(e.type) {
			case 'touchstart': this.onTouchStart(e); break;
			case 'touchmove': this.onTouchMove(e); break;
			case 'touchend': this.onTouchEnd(e); break;
			case 'click': this.onClick(e); break;
		}
	},
	
	onClick: function(e) {
		if (!e.custom) {
			e.stopPropagation();
			e.preventDefault();
		}
	},

	onTouchStart: function(e) {
		e.stopPropagation();
		
		if (this.prevent) {
			e.preventDefault();	
		}

		this.target = document.elementFromPoint(e.targetTouches[0].clientX, e.targetTouches[0].clientY);
		if (this.target.nodeType == 3) this.target = this.target.parentNode;
		while (this.target.tagName.toLowerCase() != 'a' && this.target.tagName.toLowerCase() != 'h1') {
			if (this.target.tagName.toLowerCase() == 'html') {
				this.target = null;
				return;
			}

			this.target = this.target.parentNode;
		}

		this.initTime = e.timeStamp;
		this.initY = e.targetTouches[0].clientY;
		this.initX = e.targetTouches[0].clientX;

		if (this.turbo) {
			e.preventDefault();
			
			var event = document.createEvent('MouseEvents');
			event.initEvent('click', true, true);
			event.custom = true;
			this.target.dispatchEvent(event);
		} else {
			var top = 0, left = 0;
			var element = this.target;
			while (element.offsetParent) {
				top += element.offsetTop;
				left += element.offsetLeft;
				element = element.offsetParent;
			}
			
			this.area = {
				'top':		top,
				'bottom':	top + this.target.offsetHeight,
				'left':		left,
				'right':	left + this.target.offsetWidth
			};
			
			if (this.className) {
				Element.addClassName(this.target, this.className);	
			}
			
			if (this.highlight) {
				this.feedback = document.createElement('img');
				this.feedback.src = 'i/g/highlight.png';
				this.feedback.style.position = 'absolute';
				this.feedback.style.display = 'block';
				this.feedback.style.zIndex = 11;
				this.feedback.style.top = Math.round(this.area.top + (this.target.offsetHeight / 2) - 37) + 'px';
				this.feedback.style.left = Math.round(this.area.left + (this.target.offsetWidth / 2) - 37) + 'px';
				this.feedback.style.width = '74px';
				this.feedback.style.height = '74px';
				this.feedback.style.minHeight = '74px';
				this.feedback.style.background = 'none';
				this.feedback.style.webkitTransitionProperty = 'opacity';
				this.feedback.style.webkitTransitionDuration = '200ms';
				this.feedback.style.pointerEvents = 'none';
				document.body.appendChild(this.feedback);
			}

			this.moved = false;
			this.element.addEventListener('touchmove', this, false);
			this.element.addEventListener('touchend', this, false);
		}
	},

	onTouchMove: function(e) {
		e.stopPropagation();
		
		if (this.moveBack) {
			if (e.targetTouches[0].clientX < this.area.left || e.targetTouches[0].clientX > this.area.right ||
				e.targetTouches[0].clientY < this.area.top || e.targetTouches[0].clientY > this.area.bottom) 
			{	
				this.moved = true;
				
				if (this.feedback) {
					this.feedback.style.opacity = 0;	
				}
				
				if (this.className) {
					Element.removeClassName(this.target, this.className);	
				}
			} else {
				this.moved = false;

				if (this.feedback) {
					this.feedback.style.opacity = 1;	
				}
				
				if (this.className) {
					Element.addClassName(this.target, this.className);	
				}
			}
		} else {
			this.moved = true;
			
			if (this.feedback) {
				this.feedback.style.opacity = 0;	
			}
			
			if (this.className) {
				Element.removeClassName(this.target, this.className);	
			}
		
			this.element.removeEventListener('touchmove', this, false);
			this.element.removeEventListener('touchend', this, false);
		}
	},

	onTouchEnd: function(e) {
		this.element.removeEventListener('touchmove', this, false);
		this.element.removeEventListener('touchend', this, false);
		
		if (this.highlight) {
			this.feedback.style.pointerEvents = 'auto';
		}

		if (this.className) {
			Element.removeClassName(this.target, this.className);	
		}
		
		if (!this.moved) {
			e.preventDefault();
			e.stopPropagation();

			if (this.hold) {
				if (e.timeStamp - this.initTime > 500) {
					var event = document.createEvent("Events"); 
				    event.initEvent("gesturehold", true, true); 
					event.target = this.target;
					event.x = this.initX;
					event.y = this.initY;
	     			this.target.dispatchEvent(event); 
					return;
				}
			}

			var event = document.createEvent('MouseEvents');
			event.initEvent('click', true, true);
			event.custom = true;
			this.target.dispatchEvent(event);

			if (this.highlight) {
				this.feedback.addEventListener('webkitTransitionEnd', function() {
					Element.remove(this.feedback);
				}.bind(this), false);
				this.feedback.style.opacity = 0;	
			}
		} else {
			if (this.highlight) {
				Element.remove(this.feedback);
			}
		}
	}
};
