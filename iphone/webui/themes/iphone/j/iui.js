/*
   Copyright (c) 2007-9, iUI Project Members
   See LICENSE.txt for licensing terms
 */


(function() {

var slideSpeed = 20;
var slideInterval = 0;

var currentPage = null;
var currentDialog = null;
var currentWidth = 0;
var currentHash = location.hash;
var hashPrefix = "#_";
var pageHistory = [];
var newPageCount = 0;
var checkTimer;
var hasOrientationEvent = false;
var portraitVal = "portrait";
var landscapeVal = "landscape";

var pageChangeCallback = null;
var pagePrepareCallback = null;


// *************************************************************************************************

window.iui =
{
	/* Begin custom hooks needed for MediatankController */
	updatePage: function(to, from) {
		if (pagePrepareCallback) {
			pagePrepareCallback(to.id);	
		}

		from.removeAttribute("selected");
		currentPage = to;
		updatePage(to, from);
		to.setAttribute("selected", "true");
	},
	
	getCurrentPage: function() {
		return currentPage;
	},


	insertIntoHistory: function(page) {
		if (!page.id)
			page.id = "__" + (++newPageCount) + "__";

		currentHash = hashPrefix + page.id;
		pageHistory.push(page.id);
	},

	clearHistory: function() {
		pageHistory = [];
	},
	
	onPageChange: function(callback) {
		pageChangeCallback = callback;
	},

	onPagePrepare: function(callback) {
		pagePrepareCallback = callback;
	},
	
	updateTitle: function() {
		
		if (pageHistory.length) {
			pageId = pageHistory[pageHistory.length - 1];
			var page = $(pageId);
			if (page)
			{
				var pageTitle = $("pageTitle");
				if (page.title) {
					pageTitle.innerHTML = page.title;
				}
	
				var backButton = $("backButton");
				if (backButton)
				{
					var prevPage = $(pageHistory[pageHistory.length-2]);
					if (prevPage && !page.getAttribute("hideBackButton"))
					{
						backButton.style.display = "inline";
						backButton.innerHTML = prevPage.title ? prevPage.title : "Back";
					}
					else
						backButton.style.display = "none";
				}	 
			}		
		}
	},
	/* End custom hooks needed for MediatankController */



	animOn: true,	// Experimental slide animation with CSS transition disabled by default

	showPage: function(page, backwards)
	{
		if (page)
		{
			if (page == currentPage) {
				return;
			}

			if (currentDialog)
			{
				currentDialog.removeAttribute("selected");
				currentDialog = null;
			}

			if (hasClass(page, "dialog"))
				showDialog(page);
			else
			{
				var fromPage = currentPage;
				currentPage = page;

				if (pagePrepareCallback) {
					pagePrepareCallback(page.id);	
				}

				if (fromPage)
					setTimeout(slidePages, 0, fromPage, page, backwards);
				else
					updatePage(page, fromPage);
			}
		}
	},

	showPrevious: function() 
	{
		if (pageHistory.length > 1) {
			var pageId = pageHistory[pageHistory.length - 2];
			iui.showPageById(pageId);
		}
	},

	showPageById: function(pageId)
	{
		var page = $(pageId);
		if (page)
		{
			var index = pageHistory.indexOf(pageId);
			var backwards = index != -1;
			if (backwards)
				pageHistory.splice(index, pageHistory.length);

			iui.showPage(page, backwards);
		}
	},

	showPageByHref: function(href, args, method, replace, cb)
	{
		var req = new XMLHttpRequest();
		req.onerror = function()
		{
			if (cb)
				cb(false);
		};
		
		req.onreadystatechange = function()
		{
			if (req.readyState == 4)
			{
				if (replace)
					replaceElementWithSource(replace, req.responseText);
				else
				{
					var frag = document.createElement("div");
					frag.innerHTML = req.responseText;
					iui.insertPages(frag.childNodes);
				}
				if (cb)
					setTimeout(cb, 1000, true);
			}
		};

		if (args)
		{
			req.open(method || "GET", href, true);
			req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
			req.setRequestHeader("Content-Length", args.length);
			req.send(args.join("&"));
		}
		else
		{
			req.open(method || "GET", href, true);
			req.send(null);
		}
	},
	
	insertPages: function(nodes)
	{
		var targetPage;
		for (var i = 0; i < nodes.length; ++i)
		{
			var child = nodes[i];
			if (child.nodeType == 1)
			{
				if (!child.id)
					child.id = "__" + (++newPageCount) + "__";

				var clone = $(child.id);
				if (clone)
					clone.parentNode.replaceChild(child, clone);
				else
//					document.body.appendChild(child);
					$('pages').appendChild(child);

				if (child.getAttribute("selected") == "true" || !targetPage)
					targetPage = child;
				
				--i;
			}
		}

		if (targetPage)
			iui.showPage(targetPage);	 
	},

	getSelectedPage: function()
	{
//		for (var child = document.body.firstChild; child; child = child.nextSibling)
		for (var child = $('pages').firstChild; child; child = child.nextSibling)
		{
			if (child.nodeType == 1 && child.getAttribute("selected") == "true")
				return child;
		}	 
	},
	isNativeUrl: function(href)
	{
		for(var i = 0; i < iui.nativeUrlPatterns.length; i++)
		{
			if(href.match(iui.nativeUrlPatterns[i])) return true;
		}
		return false;
	},
	nativeUrlPatterns: [
		new RegExp("^http:\/\/maps.google.com\/maps\?"),
		new RegExp("^mailto:"),
		new RegExp("^tel:"),
		new RegExp("^http:\/\/www.youtube.com\/watch\\?v="),
		new RegExp("^http:\/\/www.youtube.com\/v\/"),
		new RegExp("^javascript:"),
	]
};

// *************************************************************************************************

addEventListener("load", function(event)
{
	var page = iui.getSelectedPage();
	var locPage = getPageFromLoc();
		
	if (page)
			iui.showPage(page);
	
	if (locPage && (locPage != page))
		iui.showPage(locPage);
	
	setTimeout(preloadImages, 0);
	if (typeof window.onorientationchange == "object")
	{
		window.onorientationchange=orientChangeHandler;
		hasOrientationEvent = true;
		setTimeout(orientChangeHandler, 0);
	}
	setTimeout(checkOrientAndLocation, 0);
	checkTimer = setInterval(checkOrientAndLocation, 300);
}, false);

addEventListener("unload", function(event)
{
	return;
}, false);
	
	
addEventListener("click", function(event)
{
	var link = findParent(event.target, "a");
	if (link)
	{
		function unselect() { link.removeAttribute("selected"); }
		
		if (link.href && link.hash && link.hash != "#" && !link.target)
		{
			link.setAttribute("selected", "true");
			iui.showPage($(link.hash.substr(1)));
			setTimeout(unselect, 500);
		}
		else if (link == $("backButton"))
			iui.showPrevious();
		else if (link.getAttribute("type") == "submit")
			submitForm(findParent(link, "form"));
		else if (link.getAttribute("type") == "cancel")
			cancelDialog(findParent(link, "form"));
		else if (link.target == "_replace")
		{
			link.setAttribute("selected", "progress");
			iui.showPageByHref(link.href, null, null, link, unselect);
		}
		else if (iui.isNativeUrl(link.href))
		{
			return;
		}
		else if (link.target == "_webapp")
		{
			location.href = link.href;
		}
		else if (!link.target)
		{
			link.setAttribute("selected", "progress");
			iui.showPageByHref(link.href, null, null, null, unselect);
		}
		else {
			return;
		}
		
		event.preventDefault();		   
	}
}, false);


addEventListener("click", function(event)
{
	var div = findParent(event.target, "div");
	if (div && hasClass(div, "toggle"))
	{
		div.setAttribute("toggled", div.getAttribute("toggled") != "true");
		event.preventDefault();		   
	}
}, true);

function getPageFromLoc()
{
	var page;
	var result = location.hash.match(/#_([^\?_]+)/);
	if (result)
		page = result[1];
	if (page)
		page = $(page);
	return page;
}

function orientChangeHandler()
{
	var orientation=window.orientation;
	switch(orientation)
	{
	case 0:
		setOrientation(portraitVal);
		break;	
		
	case 90:
	case -90: 
		setOrientation(landscapeVal);
		break;
	}
}


function checkOrientAndLocation()
{
	if (!hasOrientationEvent)
	{
	  if (window.innerWidth != currentWidth)
	  {	  
		  currentWidth = window.innerWidth;
		  var orient = currentWidth == 320 ? portraitVal : landscapeVal;
		  setOrientation(orient);
	  }
	}
}

function setOrientation(orient)
{
	document.body.setAttribute("orient", orient);
	document.body.className = document.body.className.replace(portraitVal, '');
	document.body.className = document.body.className.replace(landscapeVal, '');
	document.body.className = document.body.className + ' ' + orient;
	setTimeout(scrollTo, 100, 0, 1);
}

function showDialog(page)
{
	currentDialog = page;
	page.setAttribute("selected", "true");
	
	if (hasClass(page, "dialog") && !page.target)
		showForm(page);
}

function showForm(form)
{
	form.onsubmit = function(event)
	{
		event.preventDefault();
		submitForm(form);
	};
	
	form.onclick = function(event)
	{
		if (event.target == form && hasClass(form, "dialog"))
			cancelDialog(form);
	};
}

function cancelDialog(form)
{
	form.removeAttribute("selected");
}

function updatePage(page, fromPage)
{
	if (!page.id)
		page.id = "__" + (++newPageCount) + "__";

	currentHash = hashPrefix + page.id;
	pageHistory.push(page.id);
	
	if (pageChangeCallback) {
		pageChangeCallback(page.id);	
	}

	var pageTitle = $("pageTitle");
	if (page.title)
		pageTitle.innerHTML = page.title;

	if (page.localName.toLowerCase() == "form" && !page.target)
		showForm(page);
		
	var backButton = $("backButton");
	if (backButton)
	{
		var prevPage = $(pageHistory[pageHistory.length-2]);
		if (prevPage && !page.getAttribute("hideBackButton"))
		{
			backButton.style.display = "inline";
			backButton.innerHTML = prevPage.title ? prevPage.title : "Back";
		}
		else
			backButton.style.display = "none";
	}	 
}



function slidePages(fromPage, toPage, backwards)
{		 
	var axis = (backwards ? fromPage : toPage).getAttribute("axis");

	clearInterval(checkTimer);
	
	if (canDoSlideAnim() && axis != 'y')
	{
	  slideToolbar(toPage, backwards);
	  slide2(fromPage, toPage, backwards, slideDone);
	}
	else
	{
	  slide1(fromPage, toPage, backwards, axis, slideDone);
	}

	function slideDone()
	{
	  if (!hasClass(toPage, "dialog"))
		  fromPage.removeAttribute("selected");
	  
	  checkTimer = setInterval(checkOrientAndLocation, 300);
	  setTimeout(updatePage, 0, toPage, fromPage);
	}
}

function canDoSlideAnim()
{
  return (iui.animOn) && (window.navigator.standalone) && (typeof WebKitCSSMatrix == "object");
}

function slide1(fromPage, toPage, backwards, axis, cb)
{
	if (axis == "y")
		(backwards ? fromPage : toPage).style.top = "100%";
	else
		toPage.style.left = "100%";

	scrollTo(0, 1);
	toPage.setAttribute("selected", "true");
	var percent = 100;
	slide();
	var timer = setInterval(slide, slideInterval);

	function slide()
	{
		percent -= slideSpeed;
		if (percent <= 0)
		{
			percent = 0;
			clearInterval(timer);
			cb();
		}
	
		if (axis == "y")
		{
			backwards
				? fromPage.style.top = (100-percent) + "%"
				: toPage.style.top = percent + "%";
		}
		else
		{
			fromPage.style.left = (backwards ? (100-percent) : (percent-100)) + "%"; 
			toPage.style.left = (backwards ? -percent : percent) + "%"; 
		}
	}
}


function slide2(fromPage, toPage, backwards, cb)
{
	var toContent = toPage.getElementsByClassName('content')[0];
	var fromContent = fromPage.getElementsByClassName('content')[0];

	var toStart = 'translateX(' + (backwards ? '-' : '') + window.innerWidth +	'px)';
	var fromEnd = 'translateX(' + (backwards ? '100%' : '-100%') + ')';

	toContent.style.webkitTransform = toStart;
	toPage.setAttribute("selected", "true");
	
	function startTrans()
	{
		fromContent.style.webkitTransitionProperty = '-webkit-transform';
		fromContent.style.webkitTransitionDuration = '300ms';
		fromContent.style.webkitTransform = fromEnd;
		
		toContent.style.webkitTransitionProperty = '-webkit-transform';
		toContent.style.webkitTransitionDuration = '300ms';
		toContent.style.webkitTransform = 'translateX(0%)'; //toEnd
	}
	function endTrans() 
	{
		fromContent.removeEventListener('webkitTransitionEnd', endTrans);
		
		cb();

		fromContent.style.webkitTransitionProperty = '';
		fromContent.style.webkitTransitionDuration = '';
		fromContent.style.webkitTransform = '';
		
		toContent.style.webkitTransitionProperty = '';
		toContent.style.webkitTransitionDuration = '';
		toContent.style.webkitTransform = '';
	}
	
	fromContent.addEventListener('webkitTransitionEnd', endTrans, false);
	setTimeout(startTrans, 0);
}

function slideToolbar(currentPage, backwards)
{
	var toStart = 'translate3d(' + (backwards ? '-180px' : '180px') + ', 0, 0)';
	var fromEnd = 'translate3d(' + (backwards ? '180px' : '-180px') + ', 0, 0)';

	var backButton = $("backButton");
	var pageTitle = $("pageTitle");
	if (backButton && pageTitle) {
		var cloneTitle = pageTitle.cloneNode(true);
		pageTitle.parentNode.appendChild(cloneTitle);
		pageTitle.style.display = "none";
		pageTitle.innerHTML = currentPage.title;
		pageTitle.style.webkitTransitionDuration = '0'; // Turn off transitions to set toPage start offset
		pageTitle.style.opacity = 0;
		pageTitle.style.display = 'block';
		pageTitle.style.webkitTransform = toStart;

		if (backButton.style.display != "none") {
			var cloneButton = backButton.cloneNode(true);
			backButton.parentNode.appendChild(cloneButton);
			backButton.style.display = "none";
		}
		
		var prevPage = $(pageHistory[pageHistory.length-1]);
		if (prevPage && !prevPage.getAttribute("hideBackButton"))
		{
			backButton.innerHTML = prevPage.title ? prevPage.title : "Back";
			backButton.style.webkitTransitionDuration = '0'; // Turn off transitions to set toPage start offset
			backButton.style.opacity = 0;
			backButton.style.display = 'inline';
			backButton.style.webkitTransform = toStart;
		}
	
		function startTrans()
		{
			pageTitle.style.webkitTransitionDuration = '';	  // Turn transitions back on
			pageTitle.style.webkitTransform = ''; 
			pageTitle.style.opacity = 1;
			cloneTitle.style.webkitTransform = fromEnd;
			cloneTitle.style.opacity = 0;

			backButton.style.webkitTransitionDuration = '';	  // Turn transitions back on
			backButton.style.webkitTransform = ''; 
			backButton.style.opacity = 1;
			
			if (cloneButton) {
				cloneButton.style.webkitTransform = fromEnd;
				cloneButton.style.opacity = 0;
			}
		}
		
		function cleanupTrans (element) {
			this.element = element;
			this.element.addEventListener('webkitTransitionEnd', this, false);
		};
		cleanupTrans.prototype = {
			handleEvent: function(e) {
				if (e.type == 'webkitTransitionEnd') {
					if (this.element.parentNode) {
						this.element.parentNode.removeChild(this.element); 
					}
				}
			}
		};
		
		new cleanupTrans(cloneTitle);
		if (cloneButton) {
			new cleanupTrans(cloneButton);
		}
		setTimeout(startTrans, 0);
	}
}



function preloadImages()
{
	var preloader = document.createElement("div");
	preloader.id = "preloader";
	document.body.appendChild(preloader);
}

function submitForm(form)
{
	iui.showPageByHref(form.action || "POST", encodeForm(form), form.method);
}

function encodeForm(form)
{
	function encode(inputs)
	{
		for (var i = 0; i < inputs.length; ++i)
		{
			if (inputs[i].name)
				args.push(inputs[i].name + "=" + escape(inputs[i].value));
		}
	}

	var args = [];
	encode(form.getElementsByTagName("input"));
	encode(form.getElementsByTagName("textarea"));
	encode(form.getElementsByTagName("select"));
	return args;	
}

function findParent(node, localName)
{
	while (node && (node.nodeType != 1 || node.localName.toLowerCase() != localName))
		node = node.parentNode;
	return node;
}

function hasClass(self, name)
{
	var re = new RegExp("(^|\\s)"+name+"($|\\s)");
	return re.exec(self.getAttribute("class")) != null;
}

function replaceElementWithSource(replace, source)
{
	var page = replace.parentNode;
	var parent = replace;
//	while (page.parentNode != document.body)
	while (page.parentNode != $('pages'))
	{
		page = page.parentNode;
		parent = parent.parentNode;
	}

	var frag = document.createElement(parent.localName);
	frag.innerHTML = source;

	page.removeChild(parent);

	while (frag.firstChild)
		page.appendChild(frag.firstChild);
}

function $(id) { return document.getElementById(id); }
function ddd() { console.log.apply(console, arguments); }

})();
