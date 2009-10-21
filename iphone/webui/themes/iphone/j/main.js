
MediatankController = Class.create();
MediatankController.prototype = {
	initialize: function(standalone) {
		this.standalone = standalone;
		
		/* Disable scrolling */
		if (this.standalone) {
			document.body.addEventListener('touchmove', function(e) {
		        e.preventDefault();
			});
		}
		
		
		/* Initialize storage */
		this.storage		= new Storage({
			shortName:		'jsonstore',
			displayName:	'MediatankController'
		});


		/* Initialize manager */
		this.manager    	= new Manager(this, {
			parent: 		'footer',
			standard:		'contents',
			areas:			{
								'contents':			{ name: 'Contents' },
								'favorites': 		{ name: 'Favorites' },
								'watchfolder':		{ name: 'Watchfolder' },
								'remote': 			{ name: 'Remote' }
							},
			onActivate:		function(id) {
								switch(id) {
									case 'contents':
										this.contents.activate();
										break;
									case 'favorites':
										this.favorites.activate();
										break;
									case 'watchfolder':
										this.watchfolder.activate();
										break;
									case 'remote':
										this.remote.activate();
										break;
								}
							}.bind(this),
			onChange:		function(id) {
								switch(id) {
									case 'contents':
										this.contents.restore();
										break;
									case 'favorites':
										this.favorites.restore();
										break;
									case 'watchfolder':
										this.watchfolder.restore();
										break;
									case 'remote':
										this.remote.restore();
										break;
								}
							}.bind(this),
			onHome:			function(id) {
								switch(id) {
									case 'contents':
										this.contents.home();
										break;
									case 'favorites':
										this.favorites.home();
										break;
								}
							}.bind(this),
		});		
		
		
		/* Initialize pages */
		this.contents    	= new Contents(this);
		this.favorites 		= new Favorites(this, 'favorites');
		this.watchfolder	= new WatchFolder(this, 'watchfolder');
		this.remote 		= new Remote(this, 'remote');
		this.about 			= new About(this, 'about');

		
		/* Initialize connection to IUI */
		this.loader 		= new IUILoader(this.manager, {
			onChange:		function(id) {
								if (this.manager.current == 'contents') {
									this.contents.onPageChanged(id);
									this.refresh.show();
								}
					
								if (this.manager.current == 'favorites') {
									this.favorites.onPageChanged(id);
									
									if (id == 'favorites') {
										this.refresh.hide();	
									} else {
										this.refresh.show();	
									}
								}
								
								if (this.manager.current == 'watchfolder') {
									if (this.watchfolder.folder != '') {
										this.refresh.show();
									} else {
										this.refresh.hide();
									}
								}
								
								if (this.manager.current == 'remote') {
									this.refresh.hide();
								}
							}.bind(this),
			onPrepare:		function(id) {
								if (this.manager.current == 'favorites') {
									if (id == 'favorites') {
										this.refresh.hide();	
									} else {
										this.refresh.show();	
									}
								}
							}.bind(this)
		});


		/* Initialize global user interface */
		this.refresh   		= new Refresh(this, 'refresh', {
			onClick:		function() {
							if (this.manager.current == 'contents') {
								this.contents.refresh();
							}
			
							if (this.manager.current == 'favorites') {
								this.favorites.refresh();	
							}
				
							if (this.manager.current == 'watchfolder') {
								this.watchfolder.refresh();	
							}
						}.bind(this),
			onOption:		function() {
							if (confirm('Do you really want to reset this application? You will loose all your favorites and watchfolder settings.')) {
								this.storage.clear(function() {
									location.reload();
								});
							}
						}.bind(this)
		});

		$('aboutButton').addEventListener('click', function() {
			this.about.activate();
	  	}.bind(this));

		$('pageTitle').addEventListener('click', function() {
			if (this.loader.current == 'about') {
				this.about.top();
			}
			
			if (!this.manager) {
				return;	
			}
			
			if (this.manager.current == 'contents') {
				this.contents.top();
			}

			if (this.manager.current == 'favorites') {
				this.favorites.top();
			}

			if (this.manager.current == 'watchfolder') {
				this.watchfolder.top();
			}
		}.bind(this));

		new EnhancedClickHandler('backButton', { className: 'focus', moveBack: true, prevent: true });
		new EnhancedClickHandler('footer', { turbo: true });
		if (this.standalone) {
			new EnhancedClickHandler('pageTitle', { turbo: true });
		}

		this.checkVersion();
	},
	
	checkVersion: function() {
		var req = new XMLHttpRequest();
		
		req.onerror = function() {
			this.offline = true;
			this.startApplication();
		}.bind(this);
		
		req.onreadystatechange = function() {
			if (req.readyState == 4) {
				this.offline = false;
				var current = req.responseText.evalJSON();
				this.storage.read('version', 
					function(previous) {
						this.compareVersion(current, previous)
					}.bind(this), 
					function () {
						this.installCache(current);
					}.bind(this)
				);
			}
		}.bind(this);
 
		req.open("GET", "../../index.php?action=version", true);
		req.send(null);
	},
	
	compareVersion: function(current, previous) {
		if (current == 'debug' && previous != 'debug') {
			alert("Starting debug mode");
		}

		if (current == 'debug' && previous == 'debug') {
			alert("Running debug mode");
		}

		if (current != 'debug' && previous == 'debug') {
			alert("Stopping debug mode");
		}

		if (current != previous) {
			this.installCache(current);
		} else {
			this.startApplication();
		}
	},
	
	installCache: function(version) {
		if (window.applicationCache) {
			window.applicationCache.addEventListener('cached', this.installCacheUpdateReady.bindAsEventListener(this, version), false);
			window.applicationCache.addEventListener('updateready', this.installCacheUpdateReady.bindAsEventListener(this, version), false);
			window.applicationCache.addEventListener('noupdate', this.installCacheNoUpdate.bindAsEventListener(this, version), false);
			window.applicationCache.addEventListener('error', this.installCacheError.bindAsEventListener(this), false);
			window.applicationCache.update();
			return;
		}

		// We don't support an application cache on this user agent...
		// So just write the version to prevent further cache checks and start the application
		this.storage.write('version', version);
		this.startApplication();
	},
	
	installCacheUpdateReady: function(e, version) {
		// Swap cache, write version and reload to make sure we use the correct resources...
		window.applicationCache.swapCache();
		this.storage.write('version', version);
		location.reload();
	},
	
	installCacheNoUpdate: function(e, version) {
		// No changed in the offline application cache.. So update our version and start the application
		this.storage.write('version', version);
		this.startApplication();
	},
	
	installCacheError: function() {
		alert('Cound not install MediatankController in the offline application cache');
		this.startApplication();
	},
	
	startApplication: function() {
		/* Wait a bit before actually starting the app */
		window.setTimeout(function() {
			this.connection = new Connection(this);
			this.manager.activate();
		}.bind(this), 1500);
	},

	get offline() {
		return this._offline;
	},
	
	set offline(status) {
		this._offline = status;
		
		if (status) {
			Element.addClassName(document.body, 'offline');
		} else {
			Element.removeClassName(document.body, 'offline');
		}

		var event = document.createEvent("Events"); 
	   	event.initEvent(status ? 'offline' : 'online', false, false); 
		event.target = document;
    	document.dispatchEvent(event); 
	}
};



