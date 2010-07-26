/**
 * 
 * Find more about the scrolling function at
 * http://cubiq.org/scrolling-div-on-iphone-ipod-touch/5
 *
 * Copyright (c) 2009 Matteo Spinelli, http://cubiq.org/
 * Copyright (c) 2009 Niels Leenheer, http://rakaz.nl
 * Released under MIT license
 * http://cubiq.org/dropbox/mit-license.txt
 * 
 * Modified version 0.2, based on original version 2.3
 * 
 */


iScrollIndicator = Class.create();
iScrollIndicator.prototype = {
	initialize: function(el, options) {
		this.scroll = el;
		this.parent = el.parentNode;
		this.options = options || {};
		
		this.mask = document.createElement('div');
		this.mask.style.position = 'absolute';
		this.mask.style.top = '2px';
		this.mask.style.right = '2px';
		this.mask.style.width = '5px';
		this.mask.style.height = (this.parent.clientHeight - 4) + 'px';
		this.mask.style.pointerEvents = 'none';
		this.mask.style.overflow = 'hidden';
		this.mask.style.opacity = 0.5;
		this.parent.appendChild(this.mask);

		this.element = document.createElement('div');
		this.element.style.position = 'absolute';
		this.element.style.top = '0px';
		this.element.style.width = '5px';
		this.element.style.height = '3px';
		this.element.style.backgroundColor = '#000';
		this.element.style.opacity = 0;
		this.element.style.webkitBorderRadius = '2px';
		this.element.style.pointerEvents = 'none';
		this.element.style.webkitTransitionProperty = '-webkit-transform, opacity';
		this.mask.appendChild(this.element);
		
		/* Create the four dots to make the overlow appear rounded... */
		var bg = window.getComputedStyle(this.scroll).backgroundColor;
		var dot = document.createElement('div');
		dot.style.position = 'absolute';
		dot.style.top = 0;
		dot.style.left = 0;
		dot.style.width = '1px';
		dot.style.height = '1px';
		dot.style.backgroundColor = bg;
		dot.style.pointerEvents = 'none';
		this.mask.appendChild(dot);

		var dot = document.createElement('div');
		dot.style.position = 'absolute';
		dot.style.top = 0;
		dot.style.right = 0;
		dot.style.width = '1px';
		dot.style.height = '1px';
		dot.style.backgroundColor = bg;
		dot.style.pointerEvents = 'none';
		this.mask.appendChild(dot);

		var dot = document.createElement('div');
		dot.style.position = 'absolute';
		dot.style.bottom = 0;
		dot.style.left = 0;
		dot.style.width = '1px';
		dot.style.height = '1px';
		dot.style.backgroundColor = bg;
		dot.style.pointerEvents = 'none';
		this.mask.appendChild(dot);

		var dot = document.createElement('div');
		dot.style.position = 'absolute';
		dot.style.bottom = 0;
		dot.style.right = 0;
		dot.style.width = '1px';
		dot.style.height = '1px';
		dot.style.backgroundColor = bg;
		dot.style.pointerEvents = 'none';
		this.mask.appendChild(dot);


		this.height = 6;
		this.factor = 0;
		this.position = 0;
		this.visible = false;
	},

	get position() {
		return this._position;
	},
	
	set position(pos) {
		this._position = pos;

		var top = Math.round(pos * this.factor * -1);
		
		if (top < 0) {
			top *= 2.5;	
			top = Math.max(top, 5 - this.height);
		}

		var m = (this.parent.clientHeight - 4) - this.height;
		if (top > m) {
			top = ((top - m) * 2.5) + m;	
			top = Math.min(top, (this.parent.clientHeight - 4) - 5);
		}

		this.element.style.webkitTransform = 'translate3d(0, ' + top + 'px, 0)';
	},

	get timing() {
		return this._timing;
	},

	set timing(tim) {
		this._timing = tim;
		this.element.style.webkitTransitionTimingFunction = tim + ', linear';
	},

	get duration() {
		return this._duration;
	},

	set duration(dur) {
		this._duration = dur;
		this.element.style.webkitTransitionDuration = dur + ', 500ms';
	},

	refresh: function() {
		this.factor = (this.parent.clientHeight - 4) / this.scroll.offsetHeight 
		this.height = Math.round(this.parent.clientHeight * this.factor);
		this.element.style.height = this.height + 'px';
		this.mask.style.height = (this.parent.clientHeight - 4) + 'px';
	},

	hideAfterThis: function() {
		this.element.addEventListener('webkitTransitionEnd', this.hideNow.bindAsEventListener(this), false);
	},

	hideNow: function() {
		this.element.removeEventListener('webkitTransitionEnd', this.hideNow.bindAsEventListener(this), false);
		this.hide();
	},

	hide: function() {
		if (this.visible) {
			this.element.style.webkitTransitionDuration = this.duration + ', 500ms';
			this.visible = false;
			window.setTimeout(function() {
				this.element.style.opacity = 0;
			}.bind(this), 0);
		}
	},

	show: function() {
		if (!this.visible) {
			this.element.style.webkitTransitionDuration = this.duration + ', 0';
			window.setTimeout(function() {
				this.element.style.opacity = 1;
			}.bind(this), 0);
			this.visible = true;
		}
	}
};

iScroll = Class.create();
iScroll.prototype = {
	initialize: function(el, options) {
		this.element = el;
		this.options = options || {};
		this.timer = null;
		
		this.indicator = new iScrollIndicator(this.element);

		this.target = null;
		this.done = false;
		this.touchCount = 0;
		this.position = 0;
		this.refresh();

		this.element.addEventListener('touchstart', this, false);
		this.element.addEventListener('click', this, true);
	},

	handleEvent: function(e) {
		switch(e.type) {
			case 'touchstart': this.onTouchStart(e); break;
			case 'touchmove': this.onTouchMove(e); break;
			case 'touchend': this.onTouchEnd(e); break;
			case 'click': this.onClick(e); break;
			case 'webkitTransitionEnd': this.onTransitionEnd(e); break;
		}
	},

	get position() {
		return this._position;
	},
	
	set position(pos) {
		this._position = pos;
		this.element.style.webkitTransform = 'translate3d(0, ' + this._position + 'px, 0)';

		if (this.indicator) {
			this.indicator.position = this._position;
		}
	},

	get timing() {
		return this._timing;
	},

	set timing(tim) {
		this._timing = tim;
		this.element.style.webkitTransitionTimingFunction = tim;
		

		if (this.indicator) {
			this.indicator.timing = this._timing;
		}
	},

	get duration() {
		return this._duration;
	},

	set duration(dur) {
		this._duration = dur;
		this.element.style.webkitTransitionDuration = dur;

		if (this.indicator) {
			this.indicator.duration = this._duration;
		}
	},	

	refresh: function() {
		if( this.element.offsetHeight<this.element.parentNode.clientHeight )
			this.maxScroll = 0;
		else		
			this.maxScroll = this.element.parentNode.clientHeight - this.element.offsetHeight;

		if (this.indicator) {
			this.indicator.refresh();
		}
	},
	
	onClick: function(e) {
		if (!e.custom) {
			e.stopPropagation();
			e.preventDefault();
		}
	},

	onTouchStart: function(e) {
		e.preventDefault();
		
		this.touchCount++;
		this.done = false;

		window.setTimeout(function() {
			if (!this.moved && !this.done) {
				this.target = document.elementFromPoint(e.targetTouches[0].clientX, e.targetTouches[0].clientY);
				if(this.target.nodeType == 3) this.target = this.target.parentNode;
				while (this.target.tagName.toLowerCase() != 'a') {
					if (this.target.tagName.toLowerCase() == 'html') {
						this.target = null;
						return;
					}

					this.target = this.target.parentNode;
				}

				Element.addClassName(this.target, 'focus');
			}
		}.bind(this), 100);

		this.lastY = e.targetTouches[0].clientY;
		this.lastX = e.targetTouches[0].clientX;

		this.refresh();

		this.duration = 0;
		var theTransform = window.getComputedStyle(this.element).webkitTransform;
		theTransform = new WebKitCSSMatrix(theTransform).m42;
		if (theTransform != this.position)
			this.position = theTransform;
		
		this.startY = e.targetTouches[0].clientY;
		this.scrollStartY = this.position;
		this.scrollStartTime = e.timeStamp;

		this.initY = this.startY;
		this.initTime = e.timeStamp;
		this.moved = false;

		this.element.addEventListener('touchmove', this, false);
		this.element.addEventListener('touchend', this, false);

		return false;
	},
	
	onTouchMove: function(e) {
		if (this.indicator) {
			this.indicator.show();
		}

		if (e.targetTouches.length != 1) {
			if (this.target) {
				Element.removeClassName(this.target, 'focus');
				this.target = null;
			}

			if (this.indicator) {
				this.indicator.hide();
			}

			this.done = true;
			return false;
		}
		
		this.lastY = e.targetTouches[0].clientY;
		this.lastX = e.targetTouches[0].clientX;
		
		var topDelta = e.targetTouches[0].clientY - this.startY;
		if (this.position > 0 || this.position < this.maxScroll) topDelta /= 2;
		this.position = this.position + topDelta;
		this.startY = e.targetTouches[0].clientY;
		
		var totalDelta = e.targetTouches[0].clientY - this.initY;
		if (totalDelta < -3 || totalDelta > 3) {
			if (this.target) {
				Element.removeClassName(this.target, 'focus');
				this.target = null;
			}

			this.moved = true;
		}

		// Prevent slingshot effect
		if (e.timeStamp - this.scrollStartTime > 200) {
			this.scrollStartY = this.position;
			this.scrollStartTime = e.timeStamp;
		}

		return false;
	},
	
	onTouchEnd: function(e) {
		this.done = true;
		if (this.target) {
			Element.removeClassName(this.target, 'focus');
			this.target = null;
		}

		this.element.removeEventListener('touchmove', this, false);
		this.element.removeEventListener('touchend', this, false);

		// If we are outside of the boundaries, let's go back to the sheepfold
		if (this.position > 0 || this.position < this.maxScroll) {
			this.scrollTo(this.position > 0 ? 0 : this.maxScroll);
			return false;
		}

		if (!this.moved) {
			if (this.indicator) {
				this.indicator.hide();
			}

			var element = e.target;
			if (element.nodeType == 3) element = element.parentNode;

			if (e.timeStamp - this.initTime > 500) {
				while (element.tagName.toLowerCase() != 'a') {
					element = element.parentNode;
				}
				
				var event = document.createEvent("Events");
				event.initEvent('gesturehold', true, true);
				event.target = element;
				event.x = this.lastX;
				event.y = this.lastY;
   				element.dispatchEvent(event); 
				return false;	
			}
			
			var event = document.createEvent("MouseEvents");
			event.initEvent('click', true, true);
			event.custom = true;
			element.dispatchEvent(event);
			return false;
		}

		var scrollDistance = this.position - this.scrollStartY;
		var scrollDuration = e.timeStamp - this.scrollStartTime;
		var speed = scrollDistance / scrollDuration;					// pixels per ms
		speed = Math.max(-4, Math.min(speed, 4));
		
		if (e.timeStamp - this.initTime < 75) {
			speed /= 5;
		}

		if (speed > -0.075 && speed < 0.075) {
			if (this.indicator) {
				this.indicator.hide();
			}

			return false;	
		}

		var newDuration = 1750;
		var newDistance = newDuration * speed * 0.5;

		if (newDistance != 0) {
			var newPosition = this.position + newDistance;
		
			if (newPosition > 0) {
				newPosition = Math.min(newPosition, 60);
				newDuration = (newPosition - this.position) / speed;
				
				this.bounceTop(newPosition, Math.round(newDuration) + 'ms');
				return false;
			}
			
			if (newPosition < this.maxScroll) {
				newPosition = Math.max(newPosition, this.maxScroll - 60);
				newDuration = (newPosition - this.position) / speed;
	
				this.bounceBottom(newPosition, Math.round(newDuration) + 'ms');
				return false;
			}
	
			this.scrollTo(newPosition, Math.round(newDuration) + 'ms');
			return false;
		}

		if (this.indicator) {
			this.indicator.hide();
		}
		
		return false;
	},
	
	onTransitionEnd: function() {
		this.element.removeEventListener('webkitTransitionEnd', this, false);
	
		if (this.position > 0 || this.position < this.maxScroll) {
			this.scrollTo(this.position > 0 ? 0 : this.maxScroll, '200ms');
		}
	},

	bounceTop: function(dest, runtime) {
		this.element.addEventListener('webkitTransitionEnd', this.bounceTopFinish.bindAsEventListener(this, this.touchCount), false);

		this.timing = 'ease-out'; 
		this.duration = runtime;
		this.position = dest;
	},
	
	bounceTopFinish: function(e, count) {
		this.element.removeEventListener('webkitTransitionEnd', this.bounceTopFinish.bindAsEventListener(this, this.touchCount), false);

		if (count == this.touchCount) {
			if (this.indicator) {
				this.indicator.hideAfterThis();
			}

			this.duration = '100ms';
			this.position = 0;
		}
	},
	
	bounceBottom: function(dest, runtime) {
		this.element.addEventListener('webkitTransitionEnd', this.bounceBottomFinish.bindAsEventListener(this, this.touchCount), false);

		this.timing = 'ease-out'; 
		this.duration = runtime;
		this.position = dest;
	},
	
	bounceBottomFinish: function(e, count) {
		this.element.removeEventListener('webkitTransitionEnd', this.bounceBottomFinish.bindAsEventListener(this, this.touchCount), false);

		if (count == this.touchCount) {
			if (this.indicator) {
				this.indicator.hideAfterThis();
			}

			this.duration = '100ms';
			this.position = this.maxScroll;
		}
	},
	
	scrollTo: function(dest, runtime) {
		if (this.indicator) {
			this.indicator.hideAfterThis();
		}

		this.duration = runtime ? runtime : '300ms';
		this.timing = 'cubic-bezier(0.4, 0.9, 0.5, 1)';
		this.position = dest ? dest : 0;
	},
};